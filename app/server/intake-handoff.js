import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness, sha256 } from "./integrations";
import { getSupabaseServerClient } from "./supabase-server";

function assertHandoffWrite(){
  if(getDataMode()!=="supabase")throw new Error("Persistent intake handoff requires SUBPAR_DATA_MODE=supabase");
  if(!mutationsEnabled())throw new Error("Persistent intake handoff requires SUBPAR_MUTATIONS_ENABLED=true");
  if(!getIntegrationReadiness().realDataApproved)throw new Error("Real-data approval gate is closed");
  return getSupabaseServerClient();
}

export async function stageIntakeInvitation(intakeId,{createdBy="Subpar OS"}={}){
  if(getDataMode()!=="supabase")return {dryRun:true,intakeId,status:"draft",actionType:"send_intake_invite",reason:"Demo mode previews the paid-order intake handoff without storing or sending email."};
  const supabase=assertHandoffWrite();
  const {data:intake,error:intakeError}=await supabase.from("intake_requests")
    .select("id,customer_id,order_id,project_id,platform,product_name,status,handoff_status,invite_action_id")
    .eq("id",intakeId).single();
  if(intakeError)throw new Error(`Unable to load intake for handoff: ${intakeError.message}`);
  if(intake.project_id||intake.status==="converted")return {skipped:true,reason:"Intake is already converted to a tune project",intakeId};

  const [{data:customer,error:customerError},{data:order,error:orderError}]=await Promise.all([
    supabase.from("customers").select("id,email,first_name,last_name").eq("id",intake.customer_id).single(),
    supabase.from("orders").select("id,external_order_id,product_name,payment_status").eq("id",intake.order_id).single(),
  ]);
  if(customerError||orderError)throw new Error(customerError?.message||orderError?.message||"Unable to hydrate intake handoff");
  if(!customer?.email)throw new Error("Customer email is required before staging an intake invite");

  if(intake.invite_action_id){
    const {data:existing}=await supabase.from("outbound_actions").select("*").eq("id",intake.invite_action_id).maybeSingle();
    if(existing&&!new Set(["canceled","failed"]).has(existing.status))return {...existing,replayed:true};
  }

  const idempotencyKey=`intake-invite:${intake.id}:${sha256([customer.email,order?.external_order_id||intake.order_id,intake.product_name||order?.product_name||""]).slice(0,20)}`;
  const firstName=customer.first_name||"there";
  const productName=intake.product_name||order?.product_name||"custom tune";
  const {data:action,error:actionError}=await supabase.from("outbound_actions").upsert({
    integration:"gmail",
    action_type:"send_intake_invite",
    intake_request_id:intake.id,
    project_id:null,
    customer_id:intake.customer_id,
    conversation_id:null,
    status:"draft",
    recipient:customer.email,
    subject:`Subpar Tuning · vehicle intake for ${order?.external_order_id||"your order"}`,
    payload:{templateVersion:"intake-invite-v1",firstName,productName,externalOrderId:order?.external_order_id||null,platform:intake.platform||null},
    idempotency_key:idempotencyKey,
    created_by:createdBy,
    updated_at:new Date().toISOString(),
  },{onConflict:"idempotency_key"}).select("*").single();
  if(actionError)throw new Error(`Unable to stage intake invitation: ${actionError.message}`);

  const handoffStatus=action.status==="sent"?"sent":action.status==="approved"?"approved":action.status==="canceled"?"canceled":"drafted";
  const {error:updateError}=await supabase.from("intake_requests").update({handoff_status:handoffStatus,invite_action_id:action.id,next_action:handoffStatus==="drafted"?"Approve customer intake invitation":"Customer intake handoff",updated_at:new Date().toISOString()}).eq("id",intake.id);
  if(updateError)throw new Error(`Unable to link intake invitation: ${updateError.message}`);

  await supabase.from("events").upsert({
    project_id:null,customer_id:intake.customer_id,vehicle_id:null,event_type:"intake.invite.staged",actor_type:"system",actor_id:"wix-handoff",visibility:"internal",
    payload:{intakeRequestId:intake.id,outboundActionId:action.id,externalOrderId:order?.external_order_id||null},
    idempotency_key:`intake-invite-staged:${intake.id}`,
  },{onConflict:"idempotency_key",ignoreDuplicates:true});

  return {...action,replayed:false,intakeId:intake.id,handoffStatus};
}

export function renderIntakeInvitation({payload={},url}){
  const firstName=payload.firstName||"there";
  const productName=payload.productName||"custom tune";
  const order=payload.externalOrderId?` for order ${payload.externalOrderId}`:"";
  return `Hey ${firstName},\n\nThanks for purchasing your ${productName}${order}. Before Doug opens the tune, we need the exact vehicle, fuel, hardware and tuning-platform details in one place.\n\nComplete your secure vehicle intake here:\n${url}\n\nOnce that is submitted, Doug will review compatibility and the project will move into the tuning queue.\n\nThanks,\nSubpar Tuning`;
}

import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { createIntakeAccessLink } from "./intake";
import { renderIntakeInvitation } from "./intake-handoff";
import { getSupabaseServerClient } from "./supabase-server";

async function gmailToken(){
  const readiness=getIntegrationReadiness();
  if(!readiness.gmail.readyForOutbound)throw new Error("Outbound Gmail send gate is disabled");
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:process.env.SUBPAR_GOOGLE_CLIENT_ID,client_secret:process.env.SUBPAR_GOOGLE_CLIENT_SECRET,refresh_token:process.env.SUBPAR_GOOGLE_REFRESH_TOKEN,grant_type:"refresh_token"}),cache:"no-store"});
  const data=await response.json();
  if(!response.ok||!data.access_token)throw new Error(`Gmail OAuth refresh failed: ${data.error_description||data.error||response.status}`);
  return data.access_token;
}

function mimeHeader(value){return String(value||"").replace(/[\r\n]+/g," ").trim()}
function rawMessage({from,to,subject,body}){
  const source=[`From: ${mimeHeader(from)}`,`To: ${mimeHeader(to)}`,`Subject: ${mimeHeader(subject)}`,"MIME-Version: 1.0",'Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 8bit","",String(body||"")].join("\r\n");
  return Buffer.from(source,"utf8").toString("base64url");
}

function assertReady(){
  if(getDataMode()!=="supabase")throw new Error("Persistent intake email requires SUBPAR_DATA_MODE=supabase");
  if(!mutationsEnabled())throw new Error("Persistent intake email requires SUBPAR_MUTATIONS_ENABLED=true");
  const readiness=getIntegrationReadiness();
  if(!readiness.realDataApproved)throw new Error("Real-data approval gate is closed");
  if(!readiness.gmail.readyForOutbound)throw new Error("Outbound Gmail send gate is disabled");
  return getSupabaseServerClient();
}

export async function syncIntakeHandoffStatus(action){
  if(getDataMode()!=="supabase"||!action?.intake_request_id)return action;
  const status=action.status==="sent"?"sent":action.status==="approved"||action.status==="queued"?"approved":action.status==="canceled"?"canceled":"drafted";
  const supabase=getSupabaseServerClient();
  await supabase.from("intake_requests").update({handoff_status:status,...(status==="sent"?{invite_sent_at:action.sent_at||new Date().toISOString(),next_action:"Customer completes vehicle intake"}:{}),updated_at:new Date().toISOString()}).eq("id",action.intake_request_id);
  return action;
}

export async function sendApprovedIntakeInvitation(id,sentBy){
  const supabase=assertReady();
  const {data:action,error:loadError}=await supabase.from("outbound_actions").select("*").eq("id",id).single();
  if(loadError)throw new Error(`Unable to load intake invite: ${loadError.message}`);
  if(action.integration!=="gmail"||action.action_type!=="send_intake_invite")throw new Error("Outbound action is not an intake invitation");
  if(action.status==="sent")return {...action,replayed:true};
  if(action.status!=="approved")throw new Error("Intake invitation must be approved before provider send");
  if(!action.intake_request_id)throw new Error("Intake invitation is missing intake_request_id");

  const {data:claimed,error:claimError}=await supabase.from("outbound_actions").update({status:"queued",last_error:null,updated_at:new Date().toISOString()}).eq("id",id).eq("status","approved").select("*").maybeSingle();
  if(claimError)throw new Error(`Unable to claim intake invitation: ${claimError.message}`);
  if(!claimed){
    const {data:again}=await supabase.from("outbound_actions").select("*").eq("id",id).single();
    if(again?.status==="sent")return {...again,replayed:true};
    throw new Error("Intake invitation is already being processed");
  }
  await syncIntakeHandoffStatus(claimed);

  try{
    // Only the newest generated link stays valid. Raw tokens are never written to Subpar tables.
    await supabase.from("intake_access_tokens").update({revoked_at:new Date().toISOString()}).eq("intake_request_id",claimed.intake_request_id).is("revoked_at",null);
    const invite=await createIntakeAccessLink(claimed.intake_request_id,{createdBy:sentBy||"Subpar tuner",hours:168});
    const payload=claimed.payload||{};
    const body=renderIntakeInvitation({payload,url:invite.url});
    const from=process.env.SUBPAR_GMAIL_ACCOUNT;
    if(!from)throw new Error("SUBPAR_GMAIL_ACCOUNT is not configured");
    const token=await gmailToken();
    const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({raw:rawMessage({from,to:claimed.recipient,subject:claimed.subject,body})}),cache:"no-store"});
    const provider=await response.json();
    if(!response.ok)throw new Error(provider.error?.message||`Gmail send failed (${response.status})`);

    const {data:conversation,error:conversationError}=await supabase.from("conversations").upsert({project_id:null,customer_id:claimed.customer_id,channel:"gmail",external_thread_id:provider.threadId,subject:claimed.subject,updated_at:new Date().toISOString()},{onConflict:"channel,external_thread_id"}).select("id").single();
    if(conversationError)throw new Error(`Intake invite sent but conversation persistence failed: ${conversationError.message}`);

    const {error:messageError}=await supabase.from("messages").upsert({conversation_id:conversation.id,project_id:null,external_message_id:provider.id,direction:"outbound",sender:from,recipient:claimed.recipient,subject:claimed.subject,body_text:"Secure vehicle intake invitation sent.",body_html:null,customer_visible:true,sent_at:new Date().toISOString()},{onConflict:"conversation_id,external_message_id"});
    if(messageError)throw new Error(`Intake invite sent but message persistence failed: ${messageError.message}`);

    const sentAt=new Date().toISOString();
    const {data:done,error:updateError}=await supabase.from("outbound_actions").update({status:"sent",conversation_id:conversation.id,sent_at:sentAt,provider_message_id:provider.id,last_error:null,updated_at:sentAt,payload:{...payload,threadId:provider.threadId||null,sentBy:sentBy||null}}).eq("id",id).select("*").single();
    if(updateError)throw new Error(`Intake invite sent but queue finalization failed: ${updateError.message}`);
    await syncIntakeHandoffStatus(done);
    await supabase.from("events").upsert({project_id:null,customer_id:claimed.customer_id,vehicle_id:null,event_type:"intake.invite.sent",actor_type:"internal",actor_id:sentBy||"Subpar tuner",visibility:"internal",payload:{intakeRequestId:claimed.intake_request_id,outboundActionId:id,providerMessageId:provider.id},idempotency_key:`intake-invite-sent:${claimed.intake_request_id}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
    return {...done,providerThreadId:provider.threadId||null,replayed:false};
  }catch(error){
    const {data:failed}=await supabase.from("outbound_actions").update({status:"failed",last_error:error.message,updated_at:new Date().toISOString()}).eq("id",id).select("*").maybeSingle();
    if(failed)await syncIntakeHandoffStatus(failed);
    throw error;
  }
}

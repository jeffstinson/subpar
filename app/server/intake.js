import crypto from "node:crypto";
import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { getSupabaseServerClient } from "./supabase-server";

const demoIntake={
  id:"demo_intake_sp1846",orderId:"ord_sp1846",externalOrderId:"WIX-1846",projectId:null,status:"awaiting_customer",platform:"BM3",productName:"S55 Custom Tune · bootmod3",nextAction:"Customer completes vehicle intake",compatibilityStatus:"pending",compatibilityNotes:null,
  customer:{id:"cus_carlos-mendez",name:"Carlos Mendez",email:"c.mendez.tuning@hotmail.com"},
  vehiclePayload:{year:2016,make:"BMW",model:"M4",chassis:"F82",engine:"S55",transmission:"DCT",platform:"BM3",fuel:"93",vin:"",hardware:{downpipe:"Aftermarket",turbo:"Stock",fuelSystem:"Stock"},goals:"Responsive street calibration with clean drivability.",notes:""},
};

const clean=value=>String(value??"").trim();
const hashToken=token=>crypto.createHash("sha256").update(String(token)).digest("hex");

export function evaluateVehicleIntake(input={}){
  const payload={
    year:Number(input.year)||null,make:clean(input.make),model:clean(input.model),chassis:clean(input.chassis).toUpperCase(),engine:clean(input.engine).toUpperCase(),transmission:clean(input.transmission),platform:clean(input.platform),fuel:clean(input.fuel),vin:clean(input.vin).toUpperCase(),
    hardware:typeof input.hardware==="object"&&input.hardware?input.hardware:{},goals:clean(input.goals),notes:clean(input.notes),
  };
  const required=["year","make","model","chassis","engine","transmission","platform","fuel"];
  const missing=required.filter(key=>!payload[key]);
  const warnings=[];
  if(!payload.vin)warnings.push("VIN is optional for intake, but Doug should verify vehicle identity before final delivery.");
  if(!Object.keys(payload.hardware).length)warnings.push("No hardware/modification details were supplied.");
  if(!payload.goals)warnings.push("Customer did not describe calibration goals.");
  const completeness=Math.round(((required.length-missing.length)/required.length)*100);
  return {payload,missing,warnings,completeness,complete:missing.length===0,compatibilityStatus:missing.length?"pending":"review",note:missing.length?`Waiting on ${missing.join(", ")}.`:"Intake is complete enough for Doug's compatibility review. No platform/vehicle combination is auto-approved."};
}

function assertLiveIntakeWrite(){
  if(getDataMode()!=="supabase")throw new Error("Persistent intake writes require SUBPAR_DATA_MODE=supabase");
  if(!mutationsEnabled())throw new Error("Persistent intake writes require SUBPAR_MUTATIONS_ENABLED=true");
  if(!getIntegrationReadiness().realDataApproved)throw new Error("Real-data approval gate is closed");
  return getSupabaseServerClient();
}

export async function listIntakeRequests({limit=50}={}){
  if(getDataMode()!=="supabase")return [{...demoIntake,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("intake_requests").select("id,customer_id,order_id,project_id,source,platform,product_name,status,next_action,vehicle_payload,source_summary,conflict,submitted_at,reviewed_at,reviewed_by,compatibility_status,compatibility_notes,customer_notes,created_at,updated_at").order("created_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||50,100)));
  if(error)throw new Error(`Unable to load intake requests: ${error.message}`);
  const customerIds=[...new Set((data||[]).map(row=>row.customer_id))];
  const orderIds=[...new Set((data||[]).map(row=>row.order_id))];
  const [customersResult,ordersResult]=await Promise.all([
    customerIds.length?supabase.from("customers").select("id,email,first_name,last_name").in("id",customerIds):Promise.resolve({data:[],error:null}),
    orderIds.length?supabase.from("orders").select("id,external_order_id,product_name,payment_status,amount_cents,currency").in("id",orderIds):Promise.resolve({data:[],error:null}),
  ]);
  if(customersResult.error||ordersResult.error)throw new Error(customersResult.error?.message||ordersResult.error?.message);
  const customers=new Map((customersResult.data||[]).map(row=>[row.id,{id:row.id,email:row.email,name:[row.first_name,row.last_name].filter(Boolean).join(" ")||row.email}]));
  const orders=new Map((ordersResult.data||[]).map(row=>[row.id,row]));
  return (data||[]).map(row=>({id:row.id,orderId:row.order_id,externalOrderId:orders.get(row.order_id)?.external_order_id||null,projectId:row.project_id,status:row.status,platform:row.platform,productName:row.product_name,nextAction:row.next_action,compatibilityStatus:row.compatibility_status,compatibilityNotes:row.compatibility_notes,vehiclePayload:row.vehicle_payload||{},customerNotes:row.customer_notes,customer:customers.get(row.customer_id)||null,order:orders.get(row.order_id)||null,submittedAt:row.submitted_at,reviewedAt:row.reviewed_at,reviewedBy:row.reviewed_by,createdAt:row.created_at,updatedAt:row.updated_at}));
}

export async function createIntakeAccessLink(intakeId,{createdBy="Doug Talmadge",hours=168}={}){
  if(getDataMode()!=="supabase")return {dryRun:true,url:`${process.env.NEXT_PUBLIC_SUBPAR_APP_URL||"https://subpar-two.vercel.app"}/customer-intake/demo-sp1846`,expiresAt:new Date(Date.now()+hours*3600000).toISOString(),intakeId};
  const supabase=assertLiveIntakeWrite();
  const token=crypto.randomBytes(32).toString("base64url");
  const tokenHash=hashToken(token);
  const expiresAt=new Date(Date.now()+Math.max(1,Math.min(Number(hours)||168,720))*3600000).toISOString();
  const {error}=await supabase.from("intake_access_tokens").insert({intake_request_id:intakeId,token_hash:tokenHash,expires_at:expiresAt,created_by:createdBy});
  if(error)throw new Error(`Unable to create customer intake link: ${error.message}`);
  const base=(process.env.NEXT_PUBLIC_SUBPAR_APP_URL||"https://subpar-two.vercel.app").replace(/\/$/,"");
  return {dryRun:false,url:`${base}/customer-intake/${token}`,expiresAt,intakeId};
}

export async function resolveIntakeAccess(token){
  if(getDataMode()!=="supabase"){
    if(token!=="demo-sp1846")return null;
    return {...demoIntake,evaluation:evaluateVehicleIntake(demoIntake.vehiclePayload),access:{demo:true,expiresAt:null}};
  }
  const supabase=getSupabaseServerClient();
  const tokenHash=hashToken(token);
  const {data:tokens,error}=await supabase.from("intake_access_tokens").select("id,intake_request_id,expires_at,revoked_at").eq("token_hash",tokenHash).is("revoked_at",null).gt("expires_at",new Date().toISOString()).limit(1);
  if(error)throw new Error(`Unable to verify intake link: ${error.message}`);
  const access=tokens?.[0];if(!access)return null;
  const {data:intake,error:intakeError}=await supabase.from("intake_requests").select("id,customer_id,order_id,project_id,platform,product_name,status,next_action,vehicle_payload,compatibility_status,compatibility_notes,customer_notes,submitted_at,created_at,updated_at").eq("id",access.intake_request_id).single();
  if(intakeError)throw new Error(`Unable to load intake: ${intakeError.message}`);
  const [{data:customer},{data:order}]=await Promise.all([supabase.from("customers").select("id,email,first_name,last_name").eq("id",intake.customer_id).single(),supabase.from("orders").select("id,external_order_id,product_name,payment_status").eq("id",intake.order_id).single()]);
  await supabase.from("intake_access_tokens").update({last_used_at:new Date().toISOString()}).eq("id",access.id);
  return {id:intake.id,orderId:intake.order_id,externalOrderId:order?.external_order_id||null,projectId:intake.project_id,status:intake.status,platform:intake.platform,productName:intake.product_name,nextAction:intake.next_action,compatibilityStatus:intake.compatibility_status,compatibilityNotes:intake.compatibility_notes,vehiclePayload:intake.vehicle_payload||{},customerNotes:intake.customer_notes,customer:customer?{id:customer.id,email:customer.email,name:[customer.first_name,customer.last_name].filter(Boolean).join(" ")||customer.email}:null,evaluation:evaluateVehicleIntake({...intake.vehicle_payload,platform:intake.platform||intake.vehicle_payload?.platform}),access:{demo:false,expiresAt:access.expires_at}};
}

export async function submitCustomerIntake(token,input){
  const current=await resolveIntakeAccess(token);
  if(!current)throw new Error("Intake link is invalid or expired");
  const evaluation=evaluateVehicleIntake(input);
  if(getDataMode()!=="supabase")return {dryRun:true,intake:{...current,status:evaluation.complete?"ready":"awaiting_customer",compatibilityStatus:evaluation.compatibilityStatus,vehiclePayload:evaluation.payload,customerNotes:evaluation.payload.notes},evaluation};
  const supabase=assertLiveIntakeWrite();
  const {data,error}=await supabase.from("intake_requests").update({platform:evaluation.payload.platform||current.platform,status:evaluation.complete?"ready":"awaiting_customer",next_action:evaluation.complete?"Doug compatibility review":"Customer completes missing intake fields",vehicle_payload:evaluation.payload,customer_notes:evaluation.payload.notes||null,compatibility_status:evaluation.compatibilityStatus,compatibility_notes:evaluation.note,submitted_at:evaluation.complete?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",current.id).select("id,status,platform,next_action,vehicle_payload,compatibility_status,compatibility_notes,submitted_at,updated_at").single();
  if(error)throw new Error(`Unable to submit intake: ${error.message}`);
  return {dryRun:false,intake:data,evaluation};
}

export async function reviewIntake(intakeId,{decision,notes,reviewedBy="Doug Talmadge"}={}){
  const allowed=new Set(["compatible","review","blocked"]);if(!allowed.has(decision))throw new Error("decision must be compatible, review or blocked");
  if(getDataMode()!=="supabase")return {dryRun:true,id:intakeId,compatibilityStatus:decision,notes:clean(notes),reviewedBy};
  const supabase=assertLiveIntakeWrite();
  const {data,error}=await supabase.from("intake_requests").update({compatibility_status:decision,compatibility_notes:clean(notes)||null,reviewed_at:new Date().toISOString(),reviewed_by:reviewedBy,next_action:decision==="compatible"?"Approve project activation":decision==="blocked"?"Resolve compatibility issue":"Continue compatibility review",updated_at:new Date().toISOString()}).eq("id",intakeId).select("id,status,compatibility_status,compatibility_notes,reviewed_at,reviewed_by,next_action").single();
  if(error)throw new Error(`Unable to review intake: ${error.message}`);return data;
}

export async function activateReviewedIntake(intakeId,{reviewedBy="Doug Talmadge"}={}){
  if(getDataMode()!=="supabase")return {dryRun:true,replayed:false,projectNumber:"SP-DEMO",intakeId,reason:"Demo mode previews activation without creating a vehicle/project."};
  const supabase=assertLiveIntakeWrite();
  const {data,error}=await supabase.rpc("subpar_activate_intake",{p_intake_id:intakeId,p_reviewer:reviewedBy});
  if(error)throw new Error(`Unable to activate intake: ${error.message}`);return data;
}

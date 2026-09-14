import crypto from "node:crypto";
import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness, sha256 } from "./integrations";
import { getProjectById } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

function assertPersistentDraftReady(){
  const readiness=getIntegrationReadiness();
  if(getDataMode()!=="supabase")throw new Error("Persistent Gmail drafts require SUBPAR_DATA_MODE=supabase");
  if(!mutationsEnabled())throw new Error("Persistent Gmail drafts require SUBPAR_MUTATIONS_ENABLED=true");
  if(!readiness.realDataApproved)throw new Error("Real-data approval gate is closed");
  return readiness;
}

function email(value){
  const match=String(value||"").toLowerCase().match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match?match[0].toLowerCase():"";
}

async function gmailSendToken(){
  const readiness=getIntegrationReadiness();
  if(!readiness.gmail.readyForOutbound)throw new Error("Outbound Gmail send gate is disabled");
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      client_id:process.env.SUBPAR_GOOGLE_CLIENT_ID,
      client_secret:process.env.SUBPAR_GOOGLE_CLIENT_SECRET,
      refresh_token:process.env.SUBPAR_GOOGLE_REFRESH_TOKEN,
      grant_type:"refresh_token",
    }),
    cache:"no-store",
  });
  const data=await response.json();
  if(!response.ok||!data.access_token)throw new Error(`Gmail OAuth refresh failed: ${data.error_description||data.error||response.status}`);
  return data.access_token;
}

function mimeHeader(value){return String(value||"").replace(/[\r\n]+/g," ").trim()}

function rawMessage({from,to,subject,body}){
  const source=[
    `From: ${mimeHeader(from)}`,
    `To: ${mimeHeader(to)}`,
    `Subject: ${mimeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    String(body||""),
  ].join("\r\n");
  return Buffer.from(source,"utf8").toString("base64url");
}

async function findConversation(supabase,projectId,threadId){
  let query=supabase.from("conversations").select("id,project_id,customer_id,channel,external_thread_id,subject").eq("channel","gmail");
  if(threadId)query=query.eq("external_thread_id",threadId);
  else query=query.eq("project_id",projectId);
  const {data,error}=await query.order("updated_at",{ascending:false}).limit(1);
  if(error)throw new Error(`Unable to inspect Gmail conversation: ${error.message}`);
  return data?.[0]||null;
}

export async function queueGmailDraft({projectNumber,to,subject,body,threadId=null,requestId,createdBy}){
  const project=await getProjectById(projectNumber);
  if(!project)throw new Error("Project not found");
  const recipient=email(to||project.customer?.email);
  if(!recipient)throw new Error("Customer recipient email is required");
  const safeSubject=String(subject||`Subpar Tuning · ${project.projectNumber}`).trim();
  const safeBody=String(body||"").trim();
  if(!safeBody)throw new Error("Draft body is required");
  const stableRequest=String(requestId||"").trim();

  if(getDataMode()!=="supabase"){
    return {dryRun:true,id:`demo_${crypto.randomBytes(6).toString("hex")}`,status:"draft",project:project.projectNumber,to:recipient,subject:safeSubject,body:safeBody,threadId,reason:"Demo mode previews the draft queue without storing or sending customer email."};
  }

  assertPersistentDraftReady();
  if(!stableRequest)throw new Error("requestId is required for an idempotent persistent draft");
  const supabase=getSupabaseServerClient();
  const conversation=await findConversation(supabase,project.id,threadId);
  const idempotencyKey=`gmail-draft:${stableRequest}:${sha256([project.id,recipient,safeSubject,safeBody,threadId||""]).slice(0,24)}`;

  const {data,error}=await supabase.from("outbound_actions").upsert({
    integration:"gmail",
    action_type:"send_message",
    project_id:project.id,
    customer_id:project.customerId,
    conversation_id:conversation?.id||null,
    status:"draft",
    recipient,
    subject:safeSubject,
    payload:{body:safeBody,threadId:threadId||conversation?.external_thread_id||null,from:process.env.SUBPAR_GMAIL_ACCOUNT||null},
    idempotency_key:idempotencyKey,
    created_by:createdBy||"Subpar user",
    updated_at:new Date().toISOString(),
  },{onConflict:"idempotency_key"}).select("id,integration,action_type,project_id,customer_id,conversation_id,status,recipient,subject,payload,idempotency_key,created_by,approved_by,approved_at,sent_at,provider_message_id,last_error,created_at,updated_at").single();
  if(error)throw new Error(`Unable to queue Gmail draft: ${error.message}`);
  return data;
}

export async function approveGmailDraft(id,approvedBy){
  assertPersistentDraftReady();
  const supabase=getSupabaseServerClient();
  const {data:existing,error:loadError}=await supabase.from("outbound_actions").select("id,status,integration").eq("id",id).single();
  if(loadError)throw new Error(`Unable to load Gmail draft: ${loadError.message}`);
  if(existing.integration!=="gmail")throw new Error("Outbound action is not Gmail");
  if(existing.status==="sent")return existing;
  if(!new Set(["draft","approved"]).has(existing.status))throw new Error(`Draft cannot be approved from status '${existing.status}'`);
  const {data,error}=await supabase.from("outbound_actions").update({status:"approved",approved_by:approvedBy||"Subpar tuner",approved_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
  if(error)throw new Error(`Unable to approve Gmail draft: ${error.message}`);
  return data;
}

export async function cancelGmailDraft(id,actor){
  assertPersistentDraftReady();
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("outbound_actions").update({status:"canceled",last_error:`Canceled by ${actor||"Subpar user"}`,updated_at:new Date().toISOString()}).eq("id",id).in("status",["draft","approved","queued","failed"]).select("*").maybeSingle();
  if(error)throw new Error(`Unable to cancel Gmail draft: ${error.message}`);
  if(!data)throw new Error("Draft is not cancelable or was not found");
  return data;
}

export async function sendApprovedGmailDraft(id,sentBy){
  const readiness=assertPersistentDraftReady();
  if(!readiness.gmail.readyForOutbound)throw new Error("Outbound Gmail send gate is disabled");
  const supabase=getSupabaseServerClient();
  const {data:action,error:loadError}=await supabase.from("outbound_actions").select("*").eq("id",id).single();
  if(loadError)throw new Error(`Unable to load outbound action: ${loadError.message}`);
  if(action.integration!=="gmail")throw new Error("Outbound action is not Gmail");
  if(action.status==="sent")return {...action,replayed:true};
  if(action.status!=="approved")throw new Error("Gmail action must be approved before provider send");

  const {data:claimed,error:claimError}=await supabase.from("outbound_actions").update({status:"queued",last_error:null,updated_at:new Date().toISOString()}).eq("id",id).eq("status","approved").select("*").maybeSingle();
  if(claimError)throw new Error(`Unable to claim Gmail send: ${claimError.message}`);
  if(!claimed){
    const {data:again}=await supabase.from("outbound_actions").select("*").eq("id",id).single();
    if(again?.status==="sent")return {...again,replayed:true};
    throw new Error("Gmail action is already being processed");
  }

  try{
    const token=await gmailSendToken();
    const payload=claimed.payload||{};
    const from=payload.from||process.env.SUBPAR_GMAIL_ACCOUNT;
    if(!from)throw new Error("SUBPAR_GMAIL_ACCOUNT is not configured");
    const providerBody={raw:rawMessage({from,to:claimed.recipient,subject:claimed.subject,body:payload.body})};
    if(payload.threadId)providerBody.threadId=payload.threadId;
    const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(providerBody),cache:"no-store"});
    const provider=await response.json();
    if(!response.ok)throw new Error(provider.error?.message||`Gmail send failed (${response.status})`);

    let conversationId=claimed.conversation_id;
    if(!conversationId){
      const {data:project}=await supabase.from("tune_projects").select("id,customer_id").eq("id",claimed.project_id).single();
      const {data:conversation,error:conversationError}=await supabase.from("conversations").insert({project_id:claimed.project_id,customer_id:project.customer_id,channel:"gmail",external_thread_id:provider.threadId||payload.threadId||null,subject:claimed.subject}).select("id").single();
      if(conversationError)throw new Error(`Gmail sent but conversation persistence failed: ${conversationError.message}`);
      conversationId=conversation.id;
    }

    const {error:messageError}=await supabase.from("messages").upsert({
      conversation_id:conversationId,
      project_id:claimed.project_id,
      external_message_id:provider.id,
      direction:"outbound",
      sender:from,
      recipient:claimed.recipient,
      subject:claimed.subject,
      body_text:payload.body||"",
      body_html:null,
      customer_visible:true,
      sent_at:new Date().toISOString(),
    },{onConflict:"conversation_id,external_message_id"});
    if(messageError)throw new Error(`Gmail sent but message persistence failed: ${messageError.message}`);

    const {data:done,error:updateError}=await supabase.from("outbound_actions").update({status:"sent",conversation_id:conversationId,sent_at:new Date().toISOString(),provider_message_id:provider.id,last_error:null,updated_at:new Date().toISOString(),payload:{...payload,threadId:provider.threadId||payload.threadId||null,sentBy:sentBy||null}}).eq("id",id).select("*").single();
    if(updateError)throw new Error(`Gmail sent but queue finalization failed: ${updateError.message}`);
    return {...done,providerThreadId:provider.threadId||null,replayed:false};
  }catch(error){
    await supabase.from("outbound_actions").update({status:"failed",last_error:error.message,updated_at:new Date().toISOString()}).eq("id",id);
    throw error;
  }
}

export async function listGmailOutbound({projectId=null,status=null,limit=30}={}){
  if(getDataMode()!=="supabase")return [];
  const supabase=getSupabaseServerClient();
  let query=supabase.from("outbound_actions").select("id,project_id,customer_id,conversation_id,status,recipient,subject,payload,idempotency_key,created_by,approved_by,approved_at,sent_at,provider_message_id,last_error,created_at,updated_at").eq("integration","gmail").order("created_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||30,100)));
  if(projectId)query=query.eq("project_id",projectId);
  if(status)query=query.eq("status",status);
  const {data,error}=await query;
  if(error)throw new Error(`Unable to load Gmail outbound queue: ${error.message}`);
  return data||[];
}

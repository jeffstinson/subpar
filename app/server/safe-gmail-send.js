import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { getSupabaseServerClient } from "./supabase-server";

async function gmailToken(){
  const readiness=getIntegrationReadiness();
  if(!readiness.gmail.readyForOutbound)throw new Error("Outbound Gmail send gate is disabled");
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:process.env.SUBPAR_GOOGLE_CLIENT_ID,client_secret:process.env.SUBPAR_GOOGLE_CLIENT_SECRET,refresh_token:process.env.SUBPAR_GOOGLE_REFRESH_TOKEN,grant_type:"refresh_token"}),cache:"no-store"});
  const data=await response.json();
  if(!response.ok||!data.access_token)throw new Error(`Gmail OAuth refresh failed: ${data.error_description||data.error||response.status}`);
  return data.access_token;
}

function header(value){return String(value||"").replace(/[\r\n]+/g," ").trim()}
function rawMessage({from,to,subject,body}){return Buffer.from([`From: ${header(from)}`,`To: ${header(to)}`,`Subject: ${header(subject)}`,"MIME-Version: 1.0",'Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 8bit","",String(body||"")].join("\r\n"),"utf8").toString("base64url")}

function assertReady(){
  if(getDataMode()!=="supabase")throw new Error("Persistent Gmail send requires SUBPAR_DATA_MODE=supabase");
  if(!mutationsEnabled())throw new Error("Persistent Gmail send requires SUBPAR_MUTATIONS_ENABLED=true");
  const readiness=getIntegrationReadiness();
  if(!readiness.realDataApproved)throw new Error("Real-data approval gate is closed");
  if(!readiness.gmail.readyForOutbound)throw new Error("Outbound Gmail send gate is disabled");
  return getSupabaseServerClient();
}

export async function sendApprovedProjectMessage(id,sentBy){
  const supabase=assertReady();
  const {data:action,error:loadError}=await supabase.from("outbound_actions").select("*").eq("id",id).single();
  if(loadError)throw new Error(`Unable to load outbound action: ${loadError.message}`);
  if(action.integration!=="gmail"||action.action_type!=="send_message")throw new Error("Outbound action is not a project Gmail message");
  if(action.status==="sent")return {...action,replayed:true};
  if(action.status!=="approved")throw new Error("Gmail action must be approved before provider send");

  const {data:claimed,error:claimError}=await supabase.from("outbound_actions").update({status:"queued",last_error:null,updated_at:new Date().toISOString()}).eq("id",id).eq("status","approved").select("*").maybeSingle();
  if(claimError)throw new Error(`Unable to claim Gmail send: ${claimError.message}`);
  if(!claimed){const {data:again}=await supabase.from("outbound_actions").select("*").eq("id",id).single();if(again?.status==="sent")return {...again,replayed:true};throw new Error("Gmail action is already being processed")}

  const payload=claimed.payload||{};
  const from=payload.from||process.env.SUBPAR_GMAIL_ACCOUNT;
  if(!from)throw new Error("SUBPAR_GMAIL_ACCOUNT is not configured");
  let provider=null;
  try{
    const token=await gmailToken();
    const providerBody={raw:rawMessage({from,to:claimed.recipient,subject:claimed.subject,body:payload.body})};
    if(payload.threadId)providerBody.threadId=payload.threadId;
    const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(providerBody),cache:"no-store"});
    provider=await response.json();
    if(!response.ok)throw new Error(provider.error?.message||`Gmail send failed (${response.status})`);
  }catch(error){await supabase.from("outbound_actions").update({status:"failed",last_error:error.message,updated_at:new Date().toISOString()}).eq("id",id);throw error}

  // Provider accepted the message. Persist that fact before any secondary bookkeeping so retries cannot send twice.
  const sentAt=new Date().toISOString();
  const providerThreadId=provider.threadId||payload.threadId||null;
  const {data:sent,error:sentError}=await supabase.from("outbound_actions").update({status:"sent",sent_at:sentAt,provider_message_id:provider.id,last_error:null,updated_at:sentAt,payload:{...payload,threadId:providerThreadId,sentBy:sentBy||null}}).eq("id",id).select("*").single();
  if(sentError)throw new Error(`Gmail provider accepted message ${provider.id}, but queue acknowledgment failed: ${sentError.message}`);

  try{
    let conversationId=sent.conversation_id;
    if(!conversationId){
      const {data:project,error:projectError}=await supabase.from("tune_projects").select("id,customer_id").eq("id",sent.project_id).single();
      if(projectError)throw new Error(projectError.message);
      const {data:conversation,error:conversationError}=await supabase.from("conversations").upsert({project_id:sent.project_id,customer_id:project.customer_id,channel:"gmail",external_thread_id:providerThreadId,subject:sent.subject,updated_at:new Date().toISOString()},{onConflict:"channel,external_thread_id"}).select("id").single();
      if(conversationError)throw new Error(conversationError.message);
      conversationId=conversation.id;
      await supabase.from("outbound_actions").update({conversation_id:conversationId,updated_at:new Date().toISOString()}).eq("id",id);
    }
    const {error:messageError}=await supabase.from("messages").upsert({conversation_id:conversationId,project_id:sent.project_id,external_message_id:provider.id,direction:"outbound",sender:from,recipient:sent.recipient,subject:sent.subject,body_text:payload.body||"",body_html:null,customer_visible:true,sent_at:sentAt},{onConflict:"conversation_id,external_message_id"});
    if(messageError)throw new Error(messageError.message);
    await supabase.from("events").upsert({project_id:sent.project_id,customer_id:sent.customer_id,vehicle_id:null,event_type:"gmail.message.sent",actor_type:"internal",actor_id:sentBy||"Subpar tuner",visibility:"internal",payload:{outboundActionId:id,providerMessageId:provider.id,threadId:providerThreadId},idempotency_key:`gmail-send:${id}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
    return {...sent,conversation_id:conversationId,providerThreadId,replayed:false};
  }catch(error){
    const warning=`Provider sent successfully; post-send bookkeeping needs repair: ${error.message}`;
    await supabase.from("outbound_actions").update({last_error:warning,updated_at:new Date().toISOString()}).eq("id",id);
    return {...sent,providerThreadId,replayed:false,warning};
  }
}

export async function listOutboundActions({projectId=null,status=null,limit=50}={}){
  if(getDataMode()!=="supabase")return [];
  const supabase=getSupabaseServerClient();
  let query=supabase.from("outbound_actions").select("id,integration,action_type,project_id,intake_request_id,customer_id,conversation_id,status,recipient,subject,payload,idempotency_key,created_by,approved_by,approved_at,sent_at,provider_message_id,last_error,created_at,updated_at").eq("integration","gmail").order("created_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||50,100)));
  if(projectId)query=query.eq("project_id",projectId);
  if(status)query=query.eq("status",status);
  const {data,error}=await query;
  if(error)throw new Error(`Unable to load outbound queue: ${error.message}`);
  return data||[];
}

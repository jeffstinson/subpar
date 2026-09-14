import { getDataMode } from "./env";
import { sendApprovedGmailDraft } from "./gmail-outbound";
import { sendApprovedIntakeInvitation } from "./intake-invite-send";
import { getSupabaseServerClient } from "./supabase-server";

export async function sendApprovedOutboundAction(id,sentBy){
  if(getDataMode()!=="supabase")return sendApprovedGmailDraft(id,sentBy);
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("outbound_actions").select("id,action_type").eq("id",id).single();
  if(error)throw new Error(`Unable to inspect outbound action: ${error.message}`);
  if(data.action_type==="send_intake_invite")return sendApprovedIntakeInvitation(id,sentBy);
  return sendApprovedGmailDraft(id,sentBy);
}

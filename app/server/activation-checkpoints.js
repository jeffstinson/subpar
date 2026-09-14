import { getDataMode,mutationsEnabled } from "./env";
import { runActivationAudit } from "./activation-readiness";
import { getSupabaseServerClient } from "./supabase-server";

const ALLOWED_STATUS=new Set(["pending","ready","passed","blocked","skipped"]);

export async function updateActivationCheckpoint({checkpointKey,status,detail="",actor="Subpar owner"}){
  const key=String(checkpointKey||"").trim();
  const next=String(status||"").trim().toLowerCase();
  if(!key)throw new Error("checkpointKey is required");
  if(!ALLOWED_STATUS.has(next))throw new Error("status must be pending, ready, passed, blocked, or skipped");

  if(getDataMode()!=="supabase")return {dryRun:true,checkpointKey:key,status:next,detail,actor,note:"Demo mode does not persist activation checkpoints."};
  if(!mutationsEnabled())throw new Error("Activation checkpoint writes require SUBPAR_MUTATIONS_ENABLED=true");

  const supabase=getSupabaseServerClient();
  const {data:existing,error:loadError}=await supabase.from("setup_checkpoints").select("checkpoint_key,status,detail").eq("checkpoint_key",key).maybeSingle();
  if(loadError)throw new Error(`Unable to load activation checkpoint: ${loadError.message}`);
  if(!existing)throw new Error(`Unknown activation checkpoint '${key}'`);

  let guardAudit=null;
  if(key==="production_activation"&&next==="passed"){
    guardAudit=await runActivationAudit({actor,includeProviderProbes:true,persist:true});
    if(guardAudit.summary.blockers>0||!guardAudit.phases.fullProduction){
      throw new Error(`Production activation cannot be marked passed: ${guardAudit.summary.blockers} blocker(s) remain or prior cutover evidence is incomplete.`);
    }
  }

  const verified=next==="passed"||next==="ready";
  const now=new Date().toISOString();
  const {data,error}=await supabase.from("setup_checkpoints").update({status:next,detail:String(detail||existing.detail||"").trim()||null,verified_by:verified?actor:null,verified_at:verified?now:null,updated_at:now}).eq("checkpoint_key",key).select("checkpoint_key,status,detail,verified_by,verified_at,updated_at").single();
  if(error)throw new Error(`Unable to update activation checkpoint: ${error.message}`);
  return {dryRun:false,checkpoint:data,guardAudit:guardAudit?{summary:guardAudit.summary,phases:guardAudit.phases}:null};
}

import { getDataMode, mutationsEnabled } from "./env";
import { normalizeDatazapUrl } from "./log-review-workflow";
import { getProjectById } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

export async function registerDatazapReference({projectNumber,url,revisionId=null,actor="Doug Talmadge"}){
  const normalized=normalizeDatazapUrl(url);
  if(getDataMode()!=="supabase")return {dryRun:true,provider:"datazap",externalUrl:normalized.url,externalId:normalized.externalId,status:"reference_only",note:"Demo mode links the reference only. Numeric analysis still requires a verified CSV/private file."};
  if(!mutationsEnabled())throw new Error("Persistent Datazap references require SUBPAR_MUTATIONS_ENABLED=true");
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const supabase=getSupabaseServerClient();
  const {data:existing,error:existingError}=await supabase.from("external_log_sources").select("*").eq("provider","datazap").eq("external_url",normalized.url).maybeSingle();
  if(existingError)throw new Error(`Unable to inspect Datazap reference: ${existingError.message}`);
  if(existing){
    if(existing.project_id!==project.id)throw new Error("This Datazap URL is already linked to another Subpar project and cannot be reassigned automatically");
    return {...existing,dryRun:false,replayed:true};
  }
  const {data,error}=await supabase.from("external_log_sources").insert({project_id:project.id,revision_id:revisionId,provider:"datazap",external_url:normalized.url,external_id:normalized.externalId,status:"reference_only",metadata:{hydration:"verified-file-required",note:"No undocumented Datazap scraping is assumed."},created_by:actor}).select("*").single();
  if(error)throw new Error(`Unable to register Datazap reference: ${error.message}`);
  await supabase.from("events").upsert({project_id:project.id,customer_id:project.customerId||null,vehicle_id:project.vehicleId||null,event_type:"log.external_source.linked",actor_type:"internal",actor_id:actor,visibility:"internal",payload:{provider:"datazap",externalSourceId:data.id,url:normalized.url},idempotency_key:`external-log:datazap:${data.id}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return {...data,dryRun:false,replayed:false};
}

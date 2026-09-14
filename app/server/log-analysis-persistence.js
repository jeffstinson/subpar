import { getDataMode, mutationsEnabled } from "./env";
import { analyzeLogCsv } from "./log-intelligence";
import { getSupabaseServerClient } from "./supabase-server";

function assertPersistentAnalysis(){
  if(getDataMode()!=="supabase")throw new Error("Persistent log analysis requires SUBPAR_DATA_MODE=supabase");
  if(!mutationsEnabled())throw new Error("Persistent log analysis requires SUBPAR_MUTATIONS_ENABLED=true");
  return getSupabaseServerClient();
}

async function loadLogSource(supabase,logId){
  const {data:log,error:logError}=await supabase.from("logs").select("id,project_id,revision_id,platform,file_name,status,fuel,parser_version,created_at").eq("id",logId).single();
  if(logError)throw new Error(`Unable to load log: ${logError.message}`);
  const {data:project,error:projectError}=await supabase.from("tune_projects").select("id,project_number,customer_id,vehicle_id,platform,current_revision_number").eq("id",log.project_id).single();
  if(projectError)throw new Error(`Unable to load project for log: ${projectError.message}`);
  const {data:vehicle,error:vehicleError}=await supabase.from("vehicles").select("id,engine,chassis,make,model").eq("id",project.vehicle_id).single();
  if(vehicleError)throw new Error(`Unable to load vehicle for log: ${vehicleError.message}`);
  const {data:files,error:fileError}=await supabase.from("files").select("id,storage_bucket,storage_path,original_name,mime_type,size_bytes,sha256,immutable").eq("log_id",logId).eq("kind","datalog").order("created_at",{ascending:false}).limit(1);
  if(fileError)throw new Error(`Unable to load datalog file metadata: ${fileError.message}`);
  const file=files?.[0];
  if(!file)throw new Error("No private datalog file is registered for this log");
  return {log,project,vehicle,file};
}

async function downloadText(supabase,file){
  if(file.size_bytes&&Number(file.size_bytes)>5_000_000)throw new Error("Stored log exceeds the 5 MB persistent-analysis limit");
  const {data,error}=await supabase.storage.from(file.storage_bucket).download(file.storage_path);
  if(error)throw new Error(`Unable to download private datalog: ${error.message}`);
  const text=await data.text();
  if(Buffer.byteLength(text,"utf8")>5_000_000)throw new Error("Stored log exceeds the 5 MB persistent-analysis limit");
  return text;
}

export async function analyzeStoredLog(logId,{actor="Doug Talmadge"}={}){
  const supabase=assertPersistentAnalysis();
  const source=await loadLogSource(supabase,logId);
  const csvText=await downloadText(supabase,source.file);
  let analysis;
  try{
    analysis=await analyzeLogCsv({csvText,platform:source.log.platform||source.project.platform,engine:source.vehicle.engine,fileName:source.file.original_name||source.log.file_name||"datalog.csv"});
  }catch(error){
    await supabase.from("logs").update({status:"error",parse_error:error.message,parser_version:null}).eq("id",logId);
    await supabase.from("tune_projects").update({status:"log_review",stage:"datalog_review",waiting_on:"tuner",next_action:"Inspect log parser error",customer_visible_status:"Log received — Subpar Tuning is reviewing it",updated_at:new Date().toISOString()}).eq("id",source.project.id);
    throw error;
  }

  const storedSummary={
    fileName:analysis.fileName,
    engine:analysis.engine,
    platform:analysis.platform,
    rowCount:analysis.rowCount,
    metrics:analysis.metrics,
    flags:analysis.flags,
    missingRequired:analysis.missingRequired,
    headline:analysis.summary.headline,
    note:analysis.summary.note,
    profileKey:analysis.profileKey,
  };
  const nextStatus=analysis.confidence>=70?"needs_review":"ready";
  const {data:updated,error:updateError}=await supabase.from("logs").update({
    status:nextStatus,
    metrics:analysis.metrics,
    flags:analysis.flags,
    channel_map:analysis.channelMap,
    analysis_summary:storedSummary,
    parser_confidence:analysis.confidence,
    parser_version:analysis.parserVersion,
    parse_error:null,
  }).eq("id",logId).select("id,project_id,revision_id,platform,status,file_name,metrics,flags,channel_map,analysis_summary,parser_confidence,parser_version,parse_error,uploaded_at,reviewed_at").single();
  if(updateError)throw new Error(`Unable to persist log analysis: ${updateError.message}`);

  const mappingNeedsReview=analysis.confidence<70||analysis.missingRequired.length>0;
  await supabase.from("tune_projects").update({
    status:"log_uploaded",
    stage:"datalog_review",
    waiting_on:"tuner",
    next_action:mappingNeedsReview?"Review log channel mapping and parsed pull":"Review parsed datalog",
    customer_visible_status:"Log received — Doug is reviewing it",
    updated_at:new Date().toISOString(),
  }).eq("id",source.project.id);

  const idempotencyKey=`log-analysis:${logId}:${analysis.parserVersion}:${source.file.sha256||source.file.id}`;
  await supabase.from("events").upsert({
    project_id:source.project.id,
    customer_id:source.project.customer_id||null,
    vehicle_id:source.vehicle.id,
    event_type:"log.analysis.completed",
    actor_type:"internal",
    actor_id:actor,
    visibility:"internal",
    payload:{logId,parserVersion:analysis.parserVersion,parserConfidence:analysis.confidence,flagCount:analysis.flags.length,missingRequired:analysis.missingRequired,fileId:source.file.id},
    idempotency_key:idempotencyKey,
  },{onConflict:"idempotency_key",ignoreDuplicates:true});
  await supabase.from("events").upsert({
    project_id:source.project.id,
    customer_id:source.project.customer_id||null,
    vehicle_id:source.vehicle.id,
    event_type:"log.received",
    actor_type:"system",
    actor_id:"Subpar OS",
    visibility:"both",
    payload:{title:"New datalog received",logId,fileName:analysis.fileName},
    idempotency_key:`log-received:${logId}`,
  },{onConflict:"idempotency_key",ignoreDuplicates:true});

  return {log:updated,analysis:{...analysis,rawCsvPersisted:false,sourceFileImmutable:Boolean(source.file.immutable)},source:{projectNumber:source.project.project_number,vehicle:`${source.vehicle.make} ${source.vehicle.model}`,engine:source.vehicle.engine,fileId:source.file.id}};
}

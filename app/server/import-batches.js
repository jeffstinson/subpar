import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { getSupabaseServerClient } from "./supabase-server";
import { sha256 } from "./integrations";

const allowedIntegrations=new Set(["wix","gmail"]);
const allowedTypes=new Set(["historical_orders","historical_threads","historical_messages"]);
const allowedItemStatuses=new Set(["pending","matched","created","skipped","conflict","failed"]);

function assertProvider(integration,importType){
  if(!allowedIntegrations.has(integration))throw new Error("integration must be wix or gmail");
  if(!allowedTypes.has(importType))throw new Error("Unsupported import type");
  if(integration==="wix"&&importType!=="historical_orders")throw new Error("Wix historical import type must be historical_orders");
  if(integration==="gmail"&&!new Set(["historical_threads","historical_messages"]).has(importType))throw new Error("Gmail import type must be historical_threads or historical_messages");
}

function applyAllowed(){
  const integration=getIntegrationReadiness();
  return getDataMode()==="supabase"&&mutationsEnabled()&&integration.realDataApproved&&process.env.SUBPAR_IMPORT_APPLY_ENABLED==="true";
}

export async function createImportBatch({integration,importType,mode="dry-run",sourceStart=null,sourceEnd=null,expectedCount=null,options={},createdBy="Doug Talmadge"}){
  const provider=String(integration||"").toLowerCase();
  const type=String(importType||"");
  assertProvider(provider,type);
  const requestedMode=mode==="apply"?"apply":"dry-run";
  if(requestedMode==="apply"&&!applyAllowed())throw new Error("Historical import apply gate is closed");

  const record={
    integration:provider,
    import_type:type,
    status:"planned",
    mode:requestedMode,
    source_start:sourceStart||null,
    source_end:sourceEnd||null,
    expected_count:Number.isFinite(Number(expectedCount))?Number(expectedCount):null,
    options,
    summary:{},
    created_by:createdBy,
  };

  if(getDataMode()!=="supabase"){
    return {id:`demo_${provider}_${Date.now()}`,...record,importType:type,expectedCount:record.expected_count,dryRun:true};
  }

  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("import_batches").insert(record).select("*").single();
  if(error)throw new Error(`Unable to create import batch: ${error.message}`);
  return data;
}

export async function recordImportItem({batchId,integration,externalType,externalId,source=null,status="pending",localType=null,localId=null,matchReason=null,conflictReason=null,errorMessage=null,preview={}}){
  if(!batchId||!externalId)throw new Error("batchId and externalId are required");
  const provider=String(integration||"").toLowerCase();
  if(!allowedIntegrations.has(provider))throw new Error("Unsupported import provider");
  if(!allowedItemStatuses.has(status))throw new Error("Unsupported import item status");
  if(getDataMode()!=="supabase")return {dryRun:true,batchId,externalId,status};

  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("import_items").upsert({
    batch_id:batchId,
    integration:provider,
    external_type:externalType,
    external_id:externalId,
    source_hash:source?sha256(source):null,
    status,
    local_type:localType,
    local_id:localId,
    match_reason:matchReason,
    conflict_reason:conflictReason,
    error:errorMessage,
    preview,
    processed_at:status==="pending"?null:new Date().toISOString(),
  },{onConflict:"batch_id,external_type,external_id"}).select("*").single();
  if(error)throw new Error(`Unable to record import item: ${error.message}`);
  return data;
}

export async function reconcileImportBatch(batchId,{status=null,summary={}}={}){
  if(!batchId)throw new Error("batchId is required");
  if(getDataMode()!=="supabase")return {id:batchId,dryRun:true,status:status||"planned",summary};
  const supabase=getSupabaseServerClient();
  const {data:items,error:itemError}=await supabase.from("import_items").select("status").eq("batch_id",batchId);
  if(itemError)throw new Error(`Unable to reconcile import items: ${itemError.message}`);
  const counts={pending:0,matched:0,created:0,skipped:0,conflict:0,failed:0};
  for(const item of items||[])if(counts[item.status]!==undefined)counts[item.status]+=1;
  const patch={
    scanned_count:(items||[]).length,
    created_count:counts.created,
    matched_count:counts.matched,
    skipped_count:counts.skipped,
    conflict_count:counts.conflict,
    failed_count:counts.failed,
    summary:{...summary,counts},
    updated_at:new Date().toISOString(),
  };
  if(status)patch.status=status;
  if(status==="running"&&!patch.started_at)patch.started_at=new Date().toISOString();
  if(status==="completed"||status==="failed"||status==="canceled")patch.completed_at=new Date().toISOString();
  const {data,error}=await supabase.from("import_batches").update(patch).eq("id",batchId).select("*").single();
  if(error)throw new Error(`Unable to update import batch: ${error.message}`);
  return data;
}

export async function getImportBatch(batchId,{includeItems=true,limit=250}={}){
  if(!batchId)throw new Error("batchId is required");
  if(getDataMode()!=="supabase")return {id:batchId,status:"planned",mode:"dry-run",dryRun:true,items:[]};
  const supabase=getSupabaseServerClient();
  const {data:batch,error}=await supabase.from("import_batches").select("*").eq("id",batchId).single();
  if(error)throw new Error(`Unable to load import batch: ${error.message}`);
  if(!includeItems)return batch;
  const {data:items,error:itemError}=await supabase.from("import_items").select("*").eq("batch_id",batchId).order("created_at",{ascending:true}).limit(Math.max(1,Math.min(Number(limit)||250,1000)));
  if(itemError)throw new Error(`Unable to load import batch items: ${itemError.message}`);
  return {...batch,items:items||[]};
}

export async function setImportBatchStatus(batchId,status){
  const allowed=new Set(["planned","running","paused","completed","failed","canceled"]);
  if(!allowed.has(status))throw new Error("Unsupported batch status");
  if(status==="running"&&getDataMode()==="supabase"){
    const batch=await getImportBatch(batchId,{includeItems:false});
    if(batch.mode==="apply"&&!applyAllowed())throw new Error("Cannot resume apply batch while historical import apply gate is closed");
  }
  return reconcileImportBatch(batchId,{status});
}

export function historicalImportApplyReady(){return applyAllowed();}

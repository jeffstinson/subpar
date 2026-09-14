import { applyGmailThreadPlan, applyWixOrderPlan } from "./integration-apply";
import { fetchGmailThread, listGmailThreads } from "./gmail-client";
import { getImportBatch, recordImportItem, reconcileImportBatch, setImportBatchStatus } from "./import-batches";
import { normalizeWixOrder, planGmailThread, planWixOrderEvent } from "./integrations";
import { getSupabaseServerClient } from "./supabase-server";
import { searchWixOrders } from "./wix-client";

function monthsAgoIso(months){
  const date=new Date();
  date.setUTCMonth(date.getUTCMonth()-Math.max(1,Number(months)||1));
  return date.toISOString();
}

function gmailAfterQuery(sourceStart,months){
  const date=sourceStart?new Date(sourceStart):new Date(monthsAgoIso(months||24));
  const yyyy=date.getUTCFullYear();
  const mm=String(date.getUTCMonth()+1).padStart(2,"0");
  const dd=String(date.getUTCDate()).padStart(2,"0");
  return `after:${yyyy}/${mm}/${dd}`;
}

async function updateCursor(batchId,{cursor,status}){
  const supabase=getSupabaseServerClient();
  const {error}=await supabase.from("import_batches").update({cursor_value:cursor||null,status,updated_at:new Date().toISOString(),...(status==="completed"?{completed_at:new Date().toISOString()}:{})}).eq("id",batchId);
  if(error)throw new Error(`Unable to save import cursor: ${error.message}`);
}

function wixWrapper(order){
  return {eventType:"historical_order",eventId:order?._id||order?.id,data:{entity:order}};
}

export async function runWixImportPage(batchId){
  const batch=await getImportBatch(batchId,{includeItems:false});
  if(batch.integration!=="wix")throw new Error("Batch is not a Wix import");
  if(batch.import_type!=="historical_orders")throw new Error("Unsupported Wix batch type");
  await setImportBatchStatus(batchId,"running");

  const options=batch.options||{};
  const createdAfter=batch.source_start||monthsAgoIso(options.lookbackMonths||36);
  const page=await searchWixOrders({cursor:batch.cursor_value||null,limit:Math.min(Number(options.batchSize)||100,100),createdAfter,paymentStatus:"PAID"});
  const results=[];

  for(const order of page.orders){
    const wrapper=wixWrapper(order);
    const normalized=normalizeWixOrder(wrapper);
    const externalId=normalized.externalOrderId||order?._id||order?.id;
    try{
      if(!externalId||!normalized.customer.email){
        await recordImportItem({batchId,integration:"wix",externalType:"order",externalId:externalId||`missing-${results.length}`,source:order,status:"conflict",conflictReason:!externalId?"Missing Wix order ID":"Missing customer email",preview:{productNames:normalized.order.productNames}});
        results.push({externalId,status:"conflict"});
        continue;
      }
      const plan=await planWixOrderEvent(wrapper);
      let status=plan.matches.customer?"matched":"created";
      let localId=null;
      let applied=null;
      if(batch.mode==="apply"){
        applied=await applyWixOrderPlan(plan);
        status=applied.customer.created?"created":"matched";
        localId=applied.order.id;
      }
      await recordImportItem({batchId,integration:"wix",externalType:"order",externalId,source:order,status,localType:localId?"order":null,localId,matchReason:plan.matches.customer?"customer-email":"new-customer",preview:{customerEmail:normalized.customer.email,productNames:normalized.order.productNames,platform:normalized.order.platform,amountCents:normalized.order.amountCents,applied:Boolean(applied)}});
      results.push({externalId,status,applied:Boolean(applied)});
    }catch(error){
      await recordImportItem({batchId,integration:"wix",externalType:"order",externalId:externalId||`error-${results.length}`,source:order,status:"failed",errorMessage:error.message,preview:{}});
      results.push({externalId,status:"failed",error:error.message});
    }
  }

  const nextStatus=page.hasNext?"paused":"completed";
  await updateCursor(batchId,{cursor:page.nextCursor,status:nextStatus});
  const reconciled=await reconcileImportBatch(batchId,{status:nextStatus,summary:{lastPageCount:page.orders.length,nextCursor:Boolean(page.nextCursor)}});
  return {provider:"wix",batchId,status:nextStatus,pageCount:page.orders.length,hasNext:page.hasNext,nextCursor:page.nextCursor,results,reconciled};
}

export async function runGmailImportPage(batchId){
  const batch=await getImportBatch(batchId,{includeItems:false});
  if(batch.integration!=="gmail")throw new Error("Batch is not a Gmail import");
  if(batch.import_type!=="historical_threads")throw new Error("Unsupported Gmail batch type");
  await setImportBatchStatus(batchId,"running");

  const options=batch.options||{};
  const query=gmailAfterQuery(batch.source_start,options.lookbackMonths||24);
  const limit=Math.min(Math.max(1,Number(options.batchSize)||25),25);
  const page=await listGmailThreads({query,pageToken:batch.cursor_value||null,limit});
  const results=[];

  for(const ref of page.threads){
    const externalId=ref.id;
    try{
      const thread=await fetchGmailThread(externalId);
      const plan=await planGmailThread(thread);
      const customer=plan.matches.customer;
      const multipleProjects=plan.matches.projects.length>1&&!plan.matches.selectedProject;
      if(!customer||multipleProjects){
        const reason=!customer?"No Subpar customer matched the Gmail counterparty":"Multiple tune projects match this customer thread";
        await recordImportItem({batchId,integration:"gmail",externalType:"thread",externalId,source:{id:externalId,historyId:ref.historyId},status:"conflict",conflictReason:reason,preview:{subject:plan.thread.subject,customer:customer?.email||null,projectCandidates:plan.matches.projects.map(item=>item.projectNumber)}});
        results.push({externalId,status:"conflict",reason});
        continue;
      }
      let applied=null;
      if(batch.mode==="apply")applied=await applyGmailThreadPlan(plan);
      await recordImportItem({batchId,integration:"gmail",externalType:"thread",externalId,source:{id:externalId,historyId:ref.historyId},status:"matched",localType:applied?.conversation?.id?"conversation":null,localId:applied?.conversation?.id||null,matchReason:plan.matches.selectedProject?"customer-email + single-project":"customer-email",preview:{subject:plan.thread.subject,messageCount:plan.thread.messageCount,customer:customer.email,project:plan.matches.selectedProject||null,applied:Boolean(applied)}});
      results.push({externalId,status:"matched",project:plan.matches.selectedProject||null,applied:Boolean(applied)});
    }catch(error){
      await recordImportItem({batchId,integration:"gmail",externalType:"thread",externalId,source:{id:externalId,historyId:ref.historyId},status:"failed",errorMessage:error.message,preview:{}});
      results.push({externalId,status:"failed",error:error.message});
    }
  }

  const hasNext=Boolean(page.nextPageToken);
  const nextStatus=hasNext?"paused":"completed";
  await updateCursor(batchId,{cursor:page.nextPageToken,status:nextStatus});
  const reconciled=await reconcileImportBatch(batchId,{status:nextStatus,summary:{query,lastPageCount:page.threads.length,nextCursor:hasNext,resultSizeEstimate:page.resultSizeEstimate}});
  return {provider:"gmail",batchId,status:nextStatus,pageCount:page.threads.length,hasNext,nextCursor:page.nextPageToken,results,reconciled};
}

export async function runImportBatchPage(batchId){
  const batch=await getImportBatch(batchId,{includeItems:false});
  if(batch.integration==="wix")return runWixImportPage(batchId);
  if(batch.integration==="gmail")return runGmailImportPage(batchId);
  throw new Error(`Unsupported batch integration '${batch.integration}'`);
}

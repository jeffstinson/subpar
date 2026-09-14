import { getDataMode } from "./env";
import { getSupabaseServerClient } from "./supabase-server";

const demoReceipts = [
  { integration:"wix", externalEventId:"synthetic-wix-1846", eventType:"order_paid", signatureValid:true, status:"planned", receivedAt:"2026-09-14T15:48:00Z", payloadSummary:{ order:"WIX-1846", customer:"Carlos Mendez", product:"S55 Custom Tune · BM3" }, processedResult:{ customer:"matched", order:"would-upsert", project:"awaiting-intake" } },
  { integration:"gmail", externalEventId:"synthetic-thread-alex-1842", eventType:"thread_sync", signatureValid:true, status:"planned", receivedAt:"2026-09-14T15:52:00Z", payloadSummary:{ thread:"synthetic-thread-alex-1842", customer:"Alex Rivera", subject:"Rev 4 logs uploaded" }, processedResult:{ project:"SP-1842", messages:2, queueSignal:"would-notify-doug" } },
];

export async function findWebhookReceipt(integration, externalEventId) {
  if (!integration || !externalEventId) return null;
  if (getDataMode() !== "supabase") {
    return demoReceipts.find(item => item.integration === integration && item.externalEventId === externalEventId) || null;
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("webhook_receipts")
    .select("id,integration,external_event_id,event_type,signature_valid,status,received_at,processed_at,payload_summary,processed_result,retry_count")
    .eq("integration", integration)
    .eq("external_event_id", externalEventId)
    .limit(1);
  if (error) throw new Error(`Unable to inspect integration receipt: ${error.message}`);
  return data?.[0] || null;
}

export async function beginWebhookReceipt({ integration, externalEventId, eventType, instanceId, signatureValid, payloadHash, payloadSummary = {} }) {
  if (getDataMode() !== "supabase") {
    const existing = await findWebhookReceipt(integration, externalEventId);
    return { duplicate:Boolean(existing), receipt:existing || { integration, externalEventId, eventType, instanceId, signatureValid, payloadHash, payloadSummary, status:"received", dryRun:true } };
  }
  const existing = await findWebhookReceipt(integration, externalEventId);
  if (existing) return { duplicate:true, receipt:existing };
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("webhook_receipts")
    .insert({
      integration,
      external_event_id:externalEventId,
      event_type:eventType || null,
      instance_id:instanceId || null,
      signature_valid:Boolean(signatureValid),
      payload_sha256:payloadHash || null,
      payload_summary:payloadSummary,
      status:"received",
    })
    .select("id,integration,external_event_id,event_type,signature_valid,status,received_at,payload_summary")
    .single();
  if (error) {
    if (error.code === "23505") return { duplicate:true, receipt:await findWebhookReceipt(integration, externalEventId) };
    throw new Error(`Unable to record integration receipt: ${error.message}`);
  }
  return { duplicate:false, receipt:data };
}

export async function completeWebhookReceipt({ integration, externalEventId, status = "planned", processedResult = {}, errorMessage = null }) {
  if (getDataMode() !== "supabase") return { dryRun:true, integration, externalEventId, status, processedResult };
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("webhook_receipts")
    .update({
      status,
      processed_at:new Date().toISOString(),
      processed_result:processedResult,
      error:errorMessage,
    })
    .eq("integration", integration)
    .eq("external_event_id", externalEventId)
    .select("id,integration,external_event_id,status,processed_at,processed_result")
    .single();
  if (error) throw new Error(`Unable to complete integration receipt: ${error.message}`);
  return data;
}

export async function listIntegrationReceipts(limit = 20) {
  if (getDataMode() !== "supabase") return demoReceipts.slice(0, limit);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("webhook_receipts")
    .select("id,integration,external_event_id,event_type,signature_valid,status,received_at,processed_at,payload_summary,processed_result,retry_count")
    .order("received_at", { ascending:false })
    .limit(Math.max(1, Math.min(Number(limit) || 20, 100)));
  if (error) throw new Error(`Unable to list integration receipts: ${error.message}`);
  return data || [];
}

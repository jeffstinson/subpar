import { beginWebhookReceipt, completeWebhookReceipt } from "../../../../../server/integration-ledger";
import { getIntegrationReadiness, normalizeWixEvent, planWixOrderEvent, sha256, verifyWixWebhookToken } from "../../../../../server/integrations";

export async function POST(request) {
  const readiness = getIntegrationReadiness();
  if (!readiness.wix.readyForSignedIngress) {
    return Response.json({
      ok:false,
      disabled:true,
      error:"Wix webhook ingestion is intentionally disabled until real-data approval, the Wix public key, and the explicit webhook gate are configured.",
    }, { status:503, headers:{ "Cache-Control":"no-store" } });
  }

  let receiptIdentity = null;
  try {
    const raw = await request.text();
    const verified = verifyWixWebhookToken(raw);
    const event = normalizeWixEvent(verified.payload);
    const externalEventId = event.eventId || `hash-${sha256(raw).slice(0,24)}`;
    receiptIdentity = externalEventId;

    const plan = await planWixOrderEvent(verified.payload);
    const started = await beginWebhookReceipt({
      integration:"wix",
      externalEventId,
      eventType:event.eventType,
      instanceId:event.instanceId,
      signatureValid:true,
      payloadHash:verified.payloadHash,
      payloadSummary:{
        externalOrderId:plan.normalized.externalOrderId,
        customerEmail:plan.normalized.customer.email,
        productNames:plan.normalized.order.productNames,
        paymentStatus:plan.normalized.order.paymentStatus,
        platform:plan.normalized.order.platform,
      },
    });

    if (started.duplicate) {
      return Response.json({ ok:true, duplicate:true, externalEventId, status:"already-received" }, { headers:{ "Cache-Control":"no-store" } });
    }

    const completed = await completeWebhookReceipt({
      integration:"wix",
      externalEventId,
      status:"planned",
      processedResult:{
        classification:plan.classification,
        customerMatch:plan.matches.customer?.id || null,
        existingProjects:plan.matches.existingProjects.map(item => item.projectNumber),
        actionTypes:plan.actions.map(item => item.type),
        mutationsApplied:false,
      },
    });

    return Response.json({
      ok:true,
      duplicate:false,
      signatureValid:true,
      externalEventId,
      plan,
      receipt:completed,
      applied:false,
      note:"This phase verifies and plans signed Wix events. Customer/order/project mutations stay disabled until the apply gate is built and explicitly enabled.",
    }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    if (receiptIdentity) {
      try {
        await completeWebhookReceipt({ integration:"wix", externalEventId:receiptIdentity, status:"failed", processedResult:{}, errorMessage:error.message });
      } catch {}
    }
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { getProjectById } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

function assertBaseWriteReady() {
  if (getDataMode() !== "supabase") throw new Error("Persistent integration writes require SUBPAR_DATA_MODE=supabase");
  if (!mutationsEnabled()) throw new Error("Persistent integration writes require SUBPAR_MUTATIONS_ENABLED=true");
  const readiness = getIntegrationReadiness();
  if (!readiness.realDataApproved) throw new Error("Real-data approval gate is closed");
  return readiness;
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

async function findCustomerByEmail(supabase, address) {
  if (!address) return null;
  const { data, error } = await supabase
    .from("customers")
    .select("id,email,first_name,last_name,phone,source,created_at,updated_at")
    .eq("email", address)
    .limit(1);
  if (error) throw new Error(`Unable to match customer: ${error.message}`);
  return data?.[0] || null;
}

async function createOrConservativelyUpdateCustomer(supabase, input) {
  if (!input?.email) throw new Error("Wix order cannot be applied without a customer email");
  let customer = await findCustomerByEmail(supabase, input.email);
  if (!customer) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        email:input.email,
        first_name:input.firstName || null,
        last_name:input.lastName || null,
        phone:input.phone || null,
        source:"wix",
        metadata:{ importedBy:"subpar-wix" },
      })
      .select("id,email,first_name,last_name,phone,source,created_at,updated_at")
      .single();
    if (error) throw new Error(`Unable to create Wix customer: ${error.message}`);
    return { customer:data, created:true, updated:false };
  }

  const patch = compact({
    first_name:customer.first_name ? undefined : input.firstName || undefined,
    last_name:customer.last_name ? undefined : input.lastName || undefined,
    phone:customer.phone ? undefined : input.phone || undefined,
    updated_at:new Date().toISOString(),
  });
  const meaningful = Object.keys(patch).filter(key => key !== "updated_at");
  if (!meaningful.length) return { customer, created:false, updated:false };

  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", customer.id)
    .select("id,email,first_name,last_name,phone,source,created_at,updated_at")
    .single();
  if (error) throw new Error(`Unable to enrich Wix customer: ${error.message}`);
  return { customer:data, created:false, updated:true };
}

async function upsertExternalLink(supabase, link) {
  const { error } = await supabase
    .from("external_links")
    .upsert({ ...link, updated_at:new Date().toISOString() }, { onConflict:"integration,external_type,external_id" });
  if (error) throw new Error(`Unable to persist external link: ${error.message}`);
}

async function appendEvent(supabase, event) {
  const { data, error } = await supabase
    .from("events")
    .upsert(event, { onConflict:"idempotency_key", ignoreDuplicates:true })
    .select("id,idempotency_key")
    .maybeSingle();
  if (error) throw new Error(`Unable to append integration event: ${error.message}`);
  return data || null;
}

export async function applyWixOrderPlan(plan) {
  const readiness = assertBaseWriteReady();
  if (!readiness.wix.applyEnabled) throw new Error("Wix apply gate is disabled");
  const normalized = plan?.normalized;
  if (!normalized?.externalOrderId) throw new Error("Wix plan is missing externalOrderId");
  if (!normalized?.customer?.email) throw new Error("Wix plan is missing customer email");

  const supabase = getSupabaseServerClient();
  const customerResult = await createOrConservativelyUpdateCustomer(supabase, normalized.customer);
  const customer = customerResult.customer;
  const productName = normalized.order.productNames?.join(" + ") || "Wix tune order";

  const { data:order, error:orderError } = await supabase
    .from("orders")
    .upsert({
      customer_id:customer.id,
      vehicle_id:null,
      external_source:"wix",
      external_order_id:normalized.externalOrderId,
      product_name:productName,
      amount_cents:normalized.order.amountCents,
      currency:normalized.order.currency || "USD",
      payment_status:String(normalized.order.paymentStatus || "unknown").toLowerCase(),
      raw_payload:{},
      ordered_at:normalized.order.orderedAt || null,
      updated_at:new Date().toISOString(),
    }, { onConflict:"external_source,external_order_id" })
    .select("id,customer_id,vehicle_id,external_source,external_order_id,product_name,payment_status,amount_cents,currency,ordered_at")
    .single();
  if (orderError) throw new Error(`Unable to apply Wix order: ${orderError.message}`);

  const intakeStatus = normalized.order.platform ? "awaiting_customer" : "new";
  const nextAction = normalized.order.platform
    ? `Collect vehicle/chassis details and ${normalized.order.platform} prerequisites`
    : "Collect tuning platform and vehicle/chassis details";

  const { data:intake, error:intakeError } = await supabase
    .from("intake_requests")
    .upsert({
      customer_id:customer.id,
      order_id:order.id,
      source:"wix",
      platform:normalized.order.platform || null,
      product_name:productName,
      status:intakeStatus,
      next_action:nextAction,
      vehicle_payload:{},
      source_summary:{
        externalOrderId:normalized.externalOrderId,
        productNames:normalized.order.productNames || [],
        paymentStatus:normalized.order.paymentStatus || null,
        amountCents:normalized.order.amountCents || null,
      },
      updated_at:new Date().toISOString(),
    }, { onConflict:"order_id" })
    .select("id,customer_id,order_id,project_id,platform,product_name,status,next_action,created_at,updated_at")
    .single();
  if (intakeError) throw new Error(`Unable to create Wix intake request: ${intakeError.message}`);

  await upsertExternalLink(supabase, {
    integration:"wix",
    external_type:"order",
    external_id:normalized.externalOrderId,
    local_type:"order",
    local_id:order.id,
    metadata:{ intakeRequestId:intake.id },
  });

  await appendEvent(supabase, {
    project_id:null,
    customer_id:customer.id,
    vehicle_id:null,
    event_type:"wix.order.ingested",
    actor_type:"integration",
    actor_id:"wix",
    visibility:"internal",
    payload:{
      orderId:order.id,
      externalOrderId:normalized.externalOrderId,
      intakeRequestId:intake.id,
      platform:normalized.order.platform || null,
    },
    idempotency_key:`wix-order-ingested:${normalized.externalOrderId}`,
  });

  return {
    applied:true,
    customer:{ id:customer.id, email:customer.email, created:customerResult.created, enriched:customerResult.updated },
    order,
    intake,
    projectCreated:false,
    reason:"A paid order is intentionally staged as intake until vehicle/chassis compatibility is complete.",
  };
}

async function resolveProjectForGmailPlan(plan) {
  const projectNumber = plan?.matches?.selectedProject;
  if (!projectNumber) return null;
  return getProjectById(projectNumber);
}

export async function applyGmailThreadPlan(plan) {
  const readiness = assertBaseWriteReady();
  if (!readiness.gmail.readyForReadSync) throw new Error("Gmail read-sync gate is disabled");
  if (!plan?.thread?.id) throw new Error("Gmail plan is missing thread id");
  if (!plan?.matches?.customer?.id) throw new Error("Gmail thread is not matched to a customer");

  const supabase = getSupabaseServerClient();
  const project = await resolveProjectForGmailPlan(plan);
  const projectId = project?.id || null;
  const customerId = plan.matches.customer.id;

  const { data:conversation, error:conversationError } = await supabase
    .from("conversations")
    .upsert({
      project_id:projectId,
      customer_id:customerId,
      channel:"gmail",
      external_thread_id:plan.thread.id,
      subject:plan.thread.subject || null,
      updated_at:new Date().toISOString(),
    }, { onConflict:"channel,external_thread_id" })
    .select("id,project_id,customer_id,channel,external_thread_id,subject")
    .single();
  if (conversationError) throw new Error(`Unable to apply Gmail conversation: ${conversationError.message}`);

  await upsertExternalLink(supabase, {
    integration:"gmail",
    external_type:"thread",
    external_id:plan.thread.id,
    local_type:"conversation",
    local_id:conversation.id,
    metadata:{ projectNumber:project?.projectNumber || null },
  });

  const appliedMessages = [];
  for (const message of plan.messages || []) {
    if (!message.id) continue;
    const { data:stored, error:messageError } = await supabase
      .from("messages")
      .upsert({
        conversation_id:conversation.id,
        project_id:projectId,
        external_message_id:message.id,
        direction:message.direction || "inbound",
        sender:message.from || null,
        recipient:message.to || null,
        subject:message.subject || null,
        body_text:message.snippet || "",
        body_html:null,
        customer_visible:true,
        received_at:message.direction === "inbound" ? (message.receivedAt || new Date().toISOString()) : null,
        sent_at:message.direction === "outbound" ? (message.receivedAt || new Date().toISOString()) : null,
      }, { onConflict:"conversation_id,external_message_id" })
      .select("id,external_message_id,direction,created_at")
      .single();
    if (messageError) throw new Error(`Unable to apply Gmail message: ${messageError.message}`);
    appliedMessages.push(stored);
    await upsertExternalLink(supabase, {
      integration:"gmail",
      external_type:"message",
      external_id:message.id,
      local_type:"message",
      local_id:stored.id,
      metadata:{ threadId:plan.thread.id },
    });
  }

  const latest = plan.messages?.at(-1) || null;
  if (projectId && latest?.direction === "inbound") {
    const { error:updateError } = await supabase
      .from("tune_projects")
      .update({ waiting_on:"tuner", next_action:"Review customer Gmail reply", updated_at:new Date().toISOString() })
      .eq("id", projectId);
    if (updateError) throw new Error(`Unable to route Gmail reply into tune queue: ${updateError.message}`);
  }

  const latestMessageId = latest?.id || plan.thread.id;
  await appendEvent(supabase, {
    project_id:projectId,
    customer_id:customerId,
    vehicle_id:project?.vehicleId || null,
    event_type:"gmail.thread.synced",
    actor_type:"integration",
    actor_id:"gmail",
    visibility:"internal",
    payload:{ threadId:plan.thread.id, messageCount:appliedMessages.length, latestDirection:latest?.direction || null },
    idempotency_key:`gmail-thread-sync:${plan.thread.id}:${latestMessageId}`,
  });

  return {
    applied:true,
    conversation,
    messagesApplied:appliedMessages.length,
    project:project ? { id:project.id, projectNumber:project.projectNumber } : null,
    queueSignal:projectId && latest?.direction === "inbound" ? "waiting_on=tuner" : "none",
  };
}

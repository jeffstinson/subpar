import crypto from "node:crypto";
import { getCustomers, getProjects } from "./repository";

const bool = name => process.env[name] === "true";
const configured = name => Boolean(process.env[name]);

export function getIntegrationReadiness() {
  const realDataApproved = bool("SUBPAR_REAL_DATA_APPROVED");
  const stagingEnabled = bool("SUBPAR_INTEGRATION_STAGING_ENABLED");
  const wixPublicKeyConfigured = configured("SUBPAR_WIX_WEBHOOK_PUBLIC_KEY");
  const gmailOauthConfigured = [
    "SUBPAR_GOOGLE_CLIENT_ID",
    "SUBPAR_GOOGLE_CLIENT_SECRET",
    "SUBPAR_GOOGLE_REFRESH_TOKEN",
    "SUBPAR_GMAIL_ACCOUNT",
  ].every(configured);
  const gmailWatchConfigured = configured("SUBPAR_GMAIL_PUBSUB_TOPIC");

  return {
    stagingEnabled,
    realDataApproved,
    wix: {
      publicKeyConfigured: wixPublicKeyConfigured,
      webhookEnabled: bool("SUBPAR_WIX_WEBHOOK_ENABLED"),
      applyEnabled: bool("SUBPAR_WIX_APPLY_ENABLED"),
      readyForSignedIngress: realDataApproved && wixPublicKeyConfigured && bool("SUBPAR_WIX_WEBHOOK_ENABLED"),
    },
    gmail: {
      oauthConfigured: gmailOauthConfigured,
      watchConfigured: gmailWatchConfigured,
      syncEnabled: bool("SUBPAR_GMAIL_SYNC_ENABLED"),
      sendEnabled: bool("SUBPAR_GMAIL_SEND_ENABLED"),
      readyForReadSync: realDataApproved && gmailOauthConfigured && bool("SUBPAR_GMAIL_SYNC_ENABLED"),
      readyForOutbound: realDataApproved && gmailOauthConfigured && bool("SUBPAR_GMAIL_SEND_ENABLED"),
    },
    safety: {
      outboundDisabledByDefault: !bool("SUBPAR_GMAIL_SEND_ENABLED"),
      wixMutationDisabledByDefault: !bool("SUBPAR_WIX_APPLY_ENABLED"),
      rawPayloadPersistence: false,
      receiptLedger: true,
      idempotencyRequired: true,
    },
  };
}

export function sha256(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

function parseJsonMaybe(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  const text = String(value).trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return value; }
}

function wixPublicKey() {
  const key = process.env.SUBPAR_WIX_WEBHOOK_PUBLIC_KEY;
  if (!key) throw new Error("SUBPAR_WIX_WEBHOOK_PUBLIC_KEY is not configured");
  return key.replace(/\\n/g, "\n");
}

export function verifyWixWebhookToken(rawToken) {
  const token = String(rawToken || "").trim().replace(/^"|"$/g, "");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Wix webhook body is not a JWT");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(decodeBase64Url(encodedHeader));
  const algorithms = { RS256: "RSA-SHA256", RS384: "RSA-SHA384", RS512: "RSA-SHA512" };
  const algorithm = algorithms[header.alg];
  if (!algorithm) throw new Error(`Unsupported Wix JWT algorithm '${header.alg || "unknown"}'`);
  const signed = `${encodedHeader}.${encodedPayload}`;
  const valid = crypto.verify(
    algorithm,
    Buffer.from(signed),
    wixPublicKey(),
    Buffer.from(encodedSignature, "base64url")
  );
  if (!valid) throw new Error("Wix webhook signature verification failed");
  const payload = JSON.parse(decodeBase64Url(encodedPayload));
  return { header, payload, valid: true, payloadHash: sha256(encodedPayload) };
}

function flattenWixData(payload) {
  const first = parseJsonMaybe(payload?.data);
  const second = parseJsonMaybe(first?.data);
  return second && typeof second === "object" ? second : first && typeof first === "object" ? first : payload;
}

function email(value) {
  const match = String(value || "").toLowerCase().match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match ? match[0].toLowerCase() : "";
}

function moneyToCents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function inferPlatform(text) {
  const value = String(text || "").toLowerCase();
  if (value.includes("bootmod3") || value.includes("bm3")) return "BM3";
  if (value.includes("ecutek")) return "EcuTek";
  if (value.includes("mhd")) return "MHD";
  return null;
}

function lineItemNames(order) {
  const items = order?.lineItems || order?.items || order?.line_items || [];
  return Array.isArray(items) ? items.map(item => item?.name || item?.productName?.original || item?.productName || item?.description).filter(Boolean) : [];
}

export function normalizeWixEvent(payload) {
  const data = flattenWixData(payload) || {};
  const eventType = payload?.eventType || payload?.event?.eventType || payload?.type || data?.eventType || "unknown";
  const instanceId = payload?.instanceId || payload?.instance?.id || data?.instanceId || null;
  const eventId = payload?.eventId || payload?.id || payload?.event?.id || data?.eventId || data?.id || null;
  return { eventType, instanceId, eventId, data };
}

export function normalizeWixOrder(payload) {
  const event = normalizeWixEvent(payload);
  const root = event.data || {};
  const order = root.entity || root.order || root?.data?.order || root?.data?.entity || root;
  const contact = order?.billingInfo?.contactDetails || order?.shippingInfo?.logistics?.shippingDestination?.contactDetails || order?.buyerInfo || order?.contactDetails || {};
  const names = lineItemNames(order);
  const total = order?.priceSummary?.total?.amount ?? order?.totals?.total ?? order?.total?.amount ?? order?.total;
  const externalOrderId = order?._id || order?.id || root?.entityId || event.eventId || null;
  const customerEmail = email(contact?.email || order?.buyerInfo?.email || order?.buyerEmail);
  const platform = inferPlatform([names.join(" "), order?.customTextFields?.map?.(field => `${field.title} ${field.value}`).join(" ")].filter(Boolean).join(" "));
  return {
    eventType: event.eventType,
    eventId: event.eventId || externalOrderId,
    instanceId: event.instanceId,
    externalOrderId,
    customer: {
      email: customerEmail || null,
      firstName: contact?.firstName || contact?.first_name || null,
      lastName: contact?.lastName || contact?.last_name || null,
      phone: contact?.phone || null,
    },
    order: {
      productNames: names,
      amountCents: moneyToCents(total),
      currency: order?.currency || order?.priceSummary?.total?.currency || "USD",
      paymentStatus: order?.paymentStatus || order?.payment?.status || "unknown",
      orderedAt: order?._createdDate || order?.createdDate || order?.dateCreated || null,
      platform,
    },
  };
}

function customerName(customer) {
  return [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || customer?.name || customer?.email || "Unknown";
}

export async function planWixOrderEvent(payload) {
  const normalized = normalizeWixOrder(payload);
  const [customers, projects] = await Promise.all([getCustomers(), getProjects()]);
  const match = normalized.customer.email
    ? customers.find(customer => email(customer.email) === normalized.customer.email)
    : null;
  const customerProjects = match
    ? projects.filter(project => project.customerId === match.id || email(project.customer?.email) === normalized.customer.email)
    : [];
  const idSeed = normalized.eventId || normalized.externalOrderId || sha256(normalized);
  const receiptKey = `wix:${idSeed}`;

  const actions = [
    {
      type: "customer.upsert",
      mode: match ? "match-existing" : "create",
      target: match ? `${customerName(match)} · ${match.email}` : normalized.customer.email || "email missing",
    },
    {
      type: "order.upsert",
      mode: "idempotent",
      target: normalized.externalOrderId || "order id missing",
      uniqueBy: "external_source + external_order_id",
    },
    {
      type: "project.prepare",
      mode: "wait-for-intake",
      target: normalized.order.platform || "platform to be collected",
      note: "Vehicle/chassis compatibility remains an intake gate before a tune project becomes actionable.",
    },
  ];
  if (normalized.order.platform === "MHD") actions.push({ type: "automation.stage", mode: "dry-run", target: "Request MHD stock file + matching parameter pack" });
  if (normalized.order.platform === "BM3") actions.push({ type: "automation.stage", mode: "dry-run", target: "Send bootmod3 intake + tune-request instructions" });
  if (normalized.order.platform === "EcuTek") actions.push({ type: "automation.stage", mode: "dry-run", target: "Send EcuTek vehicle/logging prep instructions" });

  return {
    integration: "wix",
    classification: "paid-order-intake",
    receiptKey,
    idempotencyKey: sha256(receiptKey),
    normalized,
    matches: {
      customer: match ? { id: match.id, name: customerName(match), email: match.email } : null,
      existingProjects: customerProjects.map(project => ({ projectNumber: project.projectNumber, status: project.status, platform: project.platform })),
    },
    actions,
    mutationsApplied: false,
  };
}

function headersFromMessage(message) {
  const list = message?.payload?.headers || message?.headers || [];
  if (!Array.isArray(list)) return {};
  return Object.fromEntries(list.map(item => [String(item.name || "").toLowerCase(), item.value]));
}

export function decodeGmailNotification(body) {
  const encoded = body?.message?.data;
  if (!encoded) throw new Error("Gmail Pub/Sub notification is missing message.data");
  const payload = JSON.parse(decodeBase64Url(encoded));
  return {
    messageId: body?.message?.messageId || null,
    publishTime: body?.message?.publishTime || null,
    emailAddress: payload.emailAddress || null,
    historyId: payload.historyId ? String(payload.historyId) : null,
    subscription: body?.subscription || null,
  };
}

export async function planGmailThread(thread) {
  const [customers, projects] = await Promise.all([getCustomers(), getProjects()]);
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  const account = email(process.env.SUBPAR_GMAIL_ACCOUNT || "doug@subpartuning.com");
  const normalizedMessages = messages.map(message => {
    const headers = headersFromMessage(message);
    const from = email(headers.from || message.from);
    const to = email(headers.to || message.to);
    return {
      id: message.id || message.messageId || null,
      threadId: message.threadId || thread.id || null,
      from,
      to,
      subject: headers.subject || message.subject || thread.subject || "",
      receivedAt: message.internalDate || message.receivedAt || null,
      direction: from && from === account ? "outbound" : "inbound",
      snippet: message.snippet || message.bodyText || "",
    };
  });
  const counterparty = normalizedMessages.find(message => message.direction === "inbound" && message.from)?.from
    || normalizedMessages.find(message => message.to && message.to !== account)?.to
    || null;
  const customer = counterparty ? customers.find(item => email(item.email) === counterparty) : null;
  const projectMatches = customer
    ? projects.filter(project => project.customerId === customer.id || email(project.customer?.email) === counterparty)
    : [];
  const latest = normalizedMessages.at(-1) || null;
  const receiptSeed = thread.id || normalizedMessages.map(item => item.id).filter(Boolean).join(":") || sha256(thread);

  return {
    integration: "gmail",
    classification: "thread-sync",
    receiptKey: `gmail-thread:${receiptSeed}`,
    idempotencyKey: sha256(`gmail-thread:${receiptSeed}`),
    thread: {
      id: thread.id || latest?.threadId || null,
      subject: latest?.subject || thread.subject || "",
      messageCount: normalizedMessages.length,
      latestDirection: latest?.direction || null,
      latestFrom: latest?.from || null,
    },
    matches: {
      customer: customer ? { id: customer.id, name: customerName(customer), email: customer.email } : null,
      projects: projectMatches.map(project => ({ projectNumber: project.projectNumber, status: project.status, platform: project.platform, waitingOn: project.waitingOn })),
      selectedProject: projectMatches.length === 1 ? projectMatches[0].projectNumber : null,
    },
    actions: [
      { type: "conversation.upsert", mode: "idempotent", target: thread.id || "thread id missing" },
      { type: "messages.upsert", mode: "idempotent", target: `${normalizedMessages.length} Gmail message${normalizedMessages.length === 1 ? "" : "s"}` },
      { type: "project.link", mode: projectMatches.length === 1 ? "automatic" : projectMatches.length > 1 ? "needs-review" : "unmatched", target: projectMatches.length === 1 ? projectMatches[0].projectNumber : `${projectMatches.length} candidates` },
      { type: "queue.signal", mode: latest?.direction === "inbound" && projectMatches.length ? "would-notify-doug" : "no-change", target: latest?.direction === "inbound" ? "Customer replied" : "Thread synchronized" },
    ],
    messages: normalizedMessages,
    mutationsApplied: false,
  };
}

export function planGmailDraft({ project, to, subject, body, threadId }) {
  const readiness = getIntegrationReadiness();
  const recipient = email(to || project?.customer?.email);
  if (!recipient) throw new Error("A customer email is required for a Gmail draft");
  const safeSubject = String(subject || `Subpar Tuning · ${project?.projectNumber || "Tune Update"}`).trim();
  const safeBody = String(body || "").trim();
  if (!safeBody) throw new Error("Draft body is required");
  return {
    integration: "gmail",
    action: "draft",
    project: project?.projectNumber || null,
    from: process.env.SUBPAR_GMAIL_ACCOUNT || "Doug's connected Gmail",
    to: recipient,
    subject: safeSubject,
    body: safeBody,
    threadId: threadId || null,
    sendEnabled: readiness.gmail.readyForOutbound,
    wouldSend: false,
    reason: readiness.gmail.readyForOutbound
      ? "Outbound Gmail is configured, but this staging endpoint still returns a draft plan only."
      : "Outbound Gmail remains disabled until real-data approval and the explicit send gate are enabled.",
  };
}

export async function getGmailAccessToken() {
  const readiness = getIntegrationReadiness();
  if (!readiness.gmail.readyForReadSync) throw new Error("Gmail read sync is not enabled");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SUBPAR_GOOGLE_CLIENT_ID,
      client_secret: process.env.SUBPAR_GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.SUBPAR_GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`Gmail OAuth refresh failed: ${data.error_description || data.error || response.status}`);
  return data.access_token;
}

export async function gmailHistory(startHistoryId) {
  const token = await getGmailAccessToken();
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
  url.searchParams.set("startHistoryId", String(startHistoryId));
  url.searchParams.set("historyTypes", "messageAdded");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (response.status === 404) return { requiresFullSync: true, history: [] };
  const data = await response.json();
  if (!response.ok) throw new Error(`Gmail history sync failed: ${data.error?.message || response.status}`);
  return { requiresFullSync: false, history: data.history || [], historyId: data.historyId || null, nextPageToken: data.nextPageToken || null };
}

export async function integrationContext() {
  const [customers, projects] = await Promise.all([getCustomers(), getProjects()]);
  return { customerCount: customers.length, projectCount: projects.length, readiness: getIntegrationReadiness() };
}

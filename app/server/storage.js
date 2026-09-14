import crypto from "node:crypto";
import { getDataMode, getPersistenceReadiness } from "./env";
import { getSupabaseServerClient } from "./supabase-server";

const defaultBuckets = {
  stock_file: "subpar-stock-files",
  tune_revision: "subpar-revisions",
  datalog: "subpar-logs",
  parameter_pack: "subpar-parameter-packs",
  customer_file: "subpar-customer-files",
};

export function storageBuckets() {
  return {
    stock_file: process.env.SUBPAR_BUCKET_STOCK_FILES || defaultBuckets.stock_file,
    tune_revision: process.env.SUBPAR_BUCKET_REVISIONS || defaultBuckets.tune_revision,
    datalog: process.env.SUBPAR_BUCKET_LOGS || defaultBuckets.datalog,
    parameter_pack: process.env.SUBPAR_BUCKET_PARAMETER_PACKS || defaultBuckets.parameter_pack,
    customer_file: process.env.SUBPAR_BUCKET_CUSTOMER_FILES || defaultBuckets.customer_file,
  };
}

export function sanitizeFileName(name = "file") {
  const cleaned = String(name)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
  return cleaned || "file";
}

export function buildStoragePath({ projectNumber, kind, fileName, revisionNumber, logId }) {
  const project = String(projectNumber || "unassigned").toLowerCase();
  const safe = sanitizeFileName(fileName);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const nonce = crypto.randomBytes(4).toString("hex");

  if (kind === "tune_revision") {
    const revision = revisionNumber ? `rev-${revisionNumber}` : "revision";
    return `${project}/${revision}/${stamp}-${nonce}-${safe}`;
  }
  if (kind === "datalog") {
    return `${project}/logs/${logId || `${stamp}-${nonce}`}/${safe}`;
  }
  if (kind === "stock_file") return `${project}/stock/${stamp}-${nonce}-${safe}`;
  if (kind === "parameter_pack") return `${project}/parameter-packs/${stamp}-${nonce}-${safe}`;
  return `${project}/customer/${stamp}-${nonce}-${safe}`;
}

function ticketSecret() {
  if (getDataMode() !== "supabase") return "subpar-demo-ticket-secret-not-for-production";
  const secret = process.env.SUBPAR_FILE_TICKET_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SUBPAR_FILE_TICKET_SECRET must be set to a strong server-only value before Supabase file uploads are enabled.");
  }
  return secret;
}

function encodeTicketPayload(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signTicketPayload(encoded) {
  return crypto.createHmac("sha256", ticketSecret()).update(encoded).digest("base64url");
}

export function createFinalizeToken(payload, ttlSeconds = 900) {
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + Math.max(60, Math.min(Number(ttlSeconds) || 900, 1800)),
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const encoded = encodeTicketPayload(body);
  return `${encoded}.${signTicketPayload(encoded)}`;
}

export function verifyFinalizeToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) throw new Error("Invalid file finalization token");
  const expected = signTicketPayload(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Invalid file finalization token signature");
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid file finalization token payload");
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("File finalization token expired");
  }
  return payload;
}

export function getStorageReadiness() {
  const persistence = getPersistenceReadiness();
  const buckets = storageBuckets();
  const ticketSecretConfigured = getDataMode() !== "supabase" || Boolean(process.env.SUBPAR_FILE_TICKET_SECRET?.length >= 32);
  return {
    mode: getDataMode(),
    provider: getDataMode() === "supabase" ? "supabase-storage" : "demo-private-storage",
    privateByDefault: true,
    signedDownloads: true,
    signedUploads: true,
    uploadFinalization: true,
    immutableTuneFiles: true,
    configured: persistence.supabaseConfigured && ticketSecretConfigured,
    ticketSecretConfigured,
    buckets,
    maxSignedDownloadSeconds: 900,
    signedUploadWindow: "provider-managed",
    finalizeWindowSeconds: 900,
  };
}

function demoTicket(type, input) {
  const id = crypto.randomBytes(8).toString("hex");
  return {
    mode: "demo",
    dryRun: true,
    type,
    ticketId: `demo_${id}`,
    ...input,
    reason: "Preview mode does not expose a real file URL or accept real customer/tune files.",
  };
}

export async function createSignedDownload({ bucket, path, expiresIn = 300, downloadName }) {
  const readiness = getStorageReadiness();
  const safeExpiry = Math.max(30, Math.min(Number(expiresIn) || 300, readiness.maxSignedDownloadSeconds));

  if (getDataMode() !== "supabase") {
    return demoTicket("download", { bucket, path, expiresIn: safeExpiry, downloadName: downloadName || null });
  }

  const supabase = getSupabaseServerClient();
  const options = downloadName ? { download: downloadName } : undefined;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, safeExpiry, options);
  if (error) throw new Error(`Unable to sign file download: ${error.message}`);
  return {
    mode: "supabase",
    dryRun: false,
    type: "download",
    bucket,
    path,
    expiresIn: safeExpiry,
    signedUrl: data.signedUrl,
  };
}

export async function createSignedUpload({ kind, projectNumber, projectId, fileName, revisionNumber, revisionId, logId }) {
  const buckets = storageBuckets();
  const bucket = buckets[kind];
  if (!bucket) throw new Error(`Unsupported file kind '${kind}'`);
  const safeName = sanitizeFileName(fileName);
  const path = buildStoragePath({ projectNumber, kind, fileName: safeName, revisionNumber, logId });
  const finalizeToken = createFinalizeToken({
    projectNumber,
    projectId: projectId || null,
    kind,
    bucket,
    path,
    fileName: safeName,
    revisionNumber: revisionNumber || null,
    revisionId: revisionId || null,
    logId: logId || null,
  });

  if (getDataMode() !== "supabase") {
    return demoTicket("upload", { bucket, path, kind, fileName: safeName, finalizeToken });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
  if (error) throw new Error(`Unable to create signed upload: ${error.message}`);
  return {
    mode: "supabase",
    dryRun: false,
    type: "upload",
    bucket,
    path,
    kind,
    token: data.token,
    signedUrl: data.signedUrl,
    finalizeToken,
  };
}

export async function verifyStoredObject({ bucket, path }) {
  if (getDataMode() !== "supabase") {
    return { exists: false, demo: true, size: null, metadata: null };
  }
  const supabase = getSupabaseServerClient();
  const pieces = String(path).split("/");
  const name = pieces.pop();
  const folder = pieces.join("/");
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 20,
    search: name,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`Unable to verify uploaded file: ${error.message}`);
  const match = data?.find(item => item.name === name) || null;
  return {
    exists: Boolean(match),
    demo: false,
    size: match?.metadata?.size ?? null,
    metadata: match?.metadata || null,
  };
}

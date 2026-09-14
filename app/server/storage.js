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

export function getStorageReadiness() {
  const persistence = getPersistenceReadiness();
  const buckets = storageBuckets();
  return {
    mode: getDataMode(),
    provider: getDataMode() === "supabase" ? "supabase-storage" : "demo-private-storage",
    privateByDefault: true,
    signedDownloads: true,
    signedUploads: true,
    immutableTuneFiles: true,
    configured: persistence.supabaseConfigured,
    buckets,
    maxSignedDownloadSeconds: 900,
    signedUploadWindow: "provider-managed",
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

export async function createSignedUpload({ kind, projectNumber, fileName, revisionNumber, logId }) {
  const buckets = storageBuckets();
  const bucket = buckets[kind];
  if (!bucket) throw new Error(`Unsupported file kind '${kind}'`);
  const path = buildStoragePath({ projectNumber, kind, fileName, revisionNumber, logId });

  if (getDataMode() !== "supabase") {
    return demoTicket("upload", { bucket, path, kind, fileName: sanitizeFileName(fileName) });
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
  };
}

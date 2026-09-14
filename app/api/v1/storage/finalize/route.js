import { getProjectById } from "../../../../server/repository";
import {
  can,
  canAccessProject,
  resolvePrincipalFromRequest,
} from "../../../../server/access-control";
import { getDataMode } from "../../../../server/env";
import { analyzeStoredLog } from "../../../../server/log-analysis-persistence";
import { getSupabaseServerClient } from "../../../../server/supabase-server";
import {
  storageBuckets,
  verifyFinalizeToken,
  verifyStoredObject,
} from "../../../../server/storage";

const customerUploadKinds = new Set(["stock_file", "datalog", "customer_file"]);
const immutableKinds = new Set(["stock_file", "tune_revision", "datalog", "parameter_pack"]);

function visibilityFor(principal, kind, requested) {
  if (principal.type === "customer") {
    return kind === "customer_file" ? "customer" : "internal";
  }
  if (requested === "customer" && (kind === "tune_revision" || kind === "parameter_pack" || kind === "customer_file")) {
    return "customer";
  }
  return "internal";
}

function mimeFromMetadata(metadata, fallback) {
  return metadata?.mimetype || metadata?.contentType || fallback || null;
}

function normalizedSize(objectSize, suppliedSize) {
  if (objectSize !== null && objectSize !== undefined) return objectSize;
  const parsed = Number(suppliedSize);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const principal = await resolvePrincipalFromRequest(request, { demoFallback: body.principal || null });
    if (!principal) return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });

    const ticket = verifyFinalizeToken(body.finalizeToken);
    const project = await getProjectById(body.project || ticket.projectNumber || ticket.projectId);
    if (!project) return Response.json({ ok: false, error: "Project not found" }, { status: 404 });
    if (!canAccessProject(principal, project)) {
      return Response.json({ ok: false, error: "Project access denied" }, { status: 403 });
    }

    if (ticket.projectNumber !== project.projectNumber) {
      return Response.json({ ok: false, error: "Upload ticket does not belong to this project" }, { status: 403 });
    }

    const expectedBucket = storageBuckets()[ticket.kind];
    if (!expectedBucket || expectedBucket !== ticket.bucket) {
      return Response.json({ ok: false, error: "Upload ticket bucket mismatch" }, { status: 400 });
    }

    const expectedPrefix = `${project.projectNumber.toLowerCase()}/`;
    if (!String(ticket.path || "").startsWith(expectedPrefix)) {
      return Response.json({ ok: false, error: "Upload ticket path is outside the project namespace" }, { status: 400 });
    }

    const customerAllowed = principal.type === "customer" && customerUploadKinds.has(ticket.kind) && can(principal, "file.customer.write");
    const internalAllowed = principal.type === "internal" && (can(principal, "file.internal.write") || can(principal, "file.customer.write"));
    if (!customerAllowed && !internalAllowed) {
      return Response.json({ ok: false, error: "File registration denied" }, { status: 403 });
    }

    const visibility = visibilityFor(principal, ticket.kind, body.visibility);
    const object = await verifyStoredObject({ bucket: ticket.bucket, path: ticket.path });

    if (getDataMode() !== "supabase") {
      return Response.json({
        ok: true,
        dryRun: true,
        principal: { type: principal.type, role: principal.role },
        wouldRegister: {
          projectId: project.id,
          kind: ticket.kind,
          bucket: ticket.bucket,
          path: ticket.path,
          originalName: ticket.fileName,
          visibility,
          immutable: immutableKinds.has(ticket.kind),
          revisionId: ticket.revisionId || null,
          logId: ticket.logId || null,
        },
        note: "Demo mode validates the complete authorization/finalization flow without storing a real file.",
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!object.exists) {
      return Response.json({ ok: false, error: "Uploaded object was not found in private storage" }, { status: 409 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existing, error: existingError } = await supabase
      .from("files")
      .select("id,storage_bucket,storage_path")
      .eq("storage_bucket", ticket.bucket)
      .eq("storage_path", ticket.path)
      .limit(1);
    if (existingError) throw new Error(`Unable to check file registration: ${existingError.message}`);
    if (existing?.length) {
      return Response.json({ ok: true, duplicate: true, file: existing[0] }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data, error } = await supabase
      .from("files")
      .insert({
        project_id: project.id,
        revision_id: ticket.revisionId || null,
        log_id: ticket.logId || null,
        kind: ticket.kind,
        storage_bucket: ticket.bucket,
        storage_path: ticket.path,
        original_name: ticket.fileName,
        mime_type: mimeFromMetadata(object.metadata, body.mimeType),
        size_bytes: normalizedSize(object.size, body.sizeBytes),
        visibility,
        immutable: immutableKinds.has(ticket.kind),
      })
      .select("id,project_id,revision_id,log_id,kind,storage_bucket,storage_path,original_name,mime_type,size_bytes,visibility,immutable,created_at")
      .single();

    if (error) throw new Error(`Unable to register uploaded file: ${error.message}`);

    let analysis = null;
    let analysisError = null;
    if (ticket.kind === "datalog" && ticket.logId) {
      await supabase.from("logs").update({ status:"uploaded", file_name:ticket.fileName }).eq("id", ticket.logId).eq("project_id", project.id);
      try {
        analysis = await analyzeStoredLog(ticket.logId, { actor: principal.type === "customer" ? "Subpar OS customer upload" : (principal.displayName || principal.email || "Subpar OS") });
      } catch (parseError) {
        analysisError = parseError.message;
      }
    }

    return Response.json({
      ok: true,
      dryRun: false,
      file: data,
      analysis: analysis ? { log:analysis.log, source:analysis.source } : null,
      analysisError,
      next: ticket.kind === "datalog" ? (analysisError ? "log-stored-parser-needs-attention" : "log-parsed-and-routed") : "project-file-ready",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

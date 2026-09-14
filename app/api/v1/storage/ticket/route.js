import { getProjectById } from "../../../../server/repository";
import {
  can,
  canAccessFile,
  canAccessProject,
  resolvePrincipalFromRequest,
} from "../../../../server/access-control";
import {
  createSignedDownload,
  createSignedUpload,
  storageBuckets,
} from "../../../../server/storage";

const customerUploadKinds = new Set(["stock_file", "datalog", "customer_file"]);

function demoStorageLocation(project, file) {
  const buckets = storageBuckets();
  const kind = file.kind || "customer_file";
  return {
    bucket: file.storageBucket || buckets[kind] || buckets.customer_file,
    path: file.storagePath || `${project.projectNumber.toLowerCase()}/demo/${file.name || file.originalName || file.id}`,
  };
}

function revisionIdFor(project, revisionNumber) {
  if (!revisionNumber) return null;
  return project.revisions?.find(item => Number(item.number ?? item.revisionNumber) === Number(revisionNumber))?.id || null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const principal = await resolvePrincipalFromRequest(request, { demoFallback: body.principal || null });
    if (!principal) return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });

    const project = await getProjectById(body.project);
    if (!project) return Response.json({ ok: false, error: "Project not found" }, { status: 404 });
    if (!canAccessProject(principal, project)) {
      return Response.json({ ok: false, error: "Project access denied" }, { status: 403 });
    }

    if (body.action === "download") {
      const file = project.files?.find(item => item.id === body.fileId);
      if (!file) return Response.json({ ok: false, error: "File not found" }, { status: 404 });
      if (!canAccessFile(principal, file, project)) {
        return Response.json({ ok: false, error: "File access denied" }, { status: 403 });
      }
      const location = demoStorageLocation(project, file);
      const ticket = await createSignedDownload({
        ...location,
        expiresIn: body.expiresIn || 300,
        downloadName: file.originalName || file.name || undefined,
      });
      return Response.json({ ok: true, principal: { type: principal.type, role: principal.role }, file: { id: file.id, kind: file.kind, visibility: file.visibility }, ticket }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "upload") {
      const kind = String(body.kind || "");
      const customerAllowed = principal.type === "customer" && customerUploadKinds.has(kind) && can(principal, "file.customer.write");
      const internalAllowed = principal.type === "internal" && (can(principal, "file.internal.write") || can(principal, "file.customer.write"));
      if (!customerAllowed && !internalAllowed) {
        return Response.json({ ok: false, error: "Upload access denied" }, { status: 403 });
      }
      if (!body.fileName) {
        return Response.json({ ok: false, error: "fileName is required" }, { status: 400 });
      }
      const ticket = await createSignedUpload({
        kind,
        projectNumber: project.projectNumber,
        projectId: project.id,
        fileName: body.fileName,
        revisionNumber: body.revisionNumber,
        revisionId: revisionIdFor(project, body.revisionNumber),
        logId: body.logId,
      });
      return Response.json({
        ok: true,
        principal: { type: principal.type, role: principal.role },
        ticket,
        next: {
          step: "upload-then-finalize",
          finalizeEndpoint: "/api/v1/storage/finalize",
          note: "After the signed upload succeeds, submit the returned finalizeToken so Subpar OS can verify and register immutable file metadata.",
        },
      }, { headers: { "Cache-Control": "no-store" } });
    }

    return Response.json({ ok: false, error: "action must be upload or download" }, { status: 400 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

import { getAccessReadiness, permissionMatrix } from "../../../server/access-control";
import { getAuthReadiness } from "../../../server/env";
import { getStorageReadiness } from "../../../server/storage";

export async function GET() {
  return Response.json({
    ok: true,
    auth: getAuthReadiness(),
    access: getAccessReadiness(),
    storage: getStorageReadiness(),
    permissionMatrix: permissionMatrix(),
    boundaries: {
      defaultDeny: true,
      privateBuckets: true,
      signedFileDelivery: true,
      signedUploadFinalization: true,
      immutableFileMetadata: true,
      appendOnlyAuditHistory: true,
      customerSafePortalApi: true,
      serviceRoleServerOnly: true,
      realDataGate: "closed",
      mutations: "dry-run",
    },
    endpoints: {
      session: "/api/v1/session",
      portalProjects: "/api/v1/portal/projects?preview=alex",
      portalProject: "/api/v1/portal/projects/SP-1842?preview=alex",
      fileTicket: "/api/v1/storage/ticket",
      fileFinalize: "/api/v1/storage/finalize",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

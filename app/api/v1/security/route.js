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
      serviceRoleServerOnly: true,
      realDataGate: "closed",
      mutations: "dry-run",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

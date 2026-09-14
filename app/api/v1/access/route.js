import {
  can,
  demoPrincipals,
  getAccessReadiness,
  permissionMatrix,
} from "../../../server/access-control";
import { getAuthReadiness } from "../../../server/env";

export async function GET() {
  return Response.json({
    ok: true,
    access: getAccessReadiness(),
    auth: getAuthReadiness(),
    permissions: permissionMatrix(),
    previewPrincipals: Object.fromEntries(
      Object.entries(demoPrincipals).map(([key, principal]) => [key, {
        type: principal.type,
        role: principal.role,
        displayName: principal.displayName,
      }])
    ),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const principal = demoPrincipals[body.principal];
    if (!principal) {
      return Response.json({ ok: false, error: "Unknown preview principal" }, { status: 400 });
    }
    const permission = String(body.permission || "");
    return Response.json({
      ok: true,
      dryRun: true,
      principal: { type: principal.type, role: principal.role, displayName: principal.displayName },
      permission,
      allowed: can(principal, permission),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }
}

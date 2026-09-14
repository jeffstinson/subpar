import {
  can,
  resolvePrincipalFromRequest,
} from "../../../server/access-control";
import { getAuthReadiness } from "../../../server/env";

const capabilityChecks = [
  "dashboard.read",
  "project.read",
  "project.write",
  "revision.create",
  "revision.publish",
  "log.review",
  "file.internal.read",
  "file.internal.write",
  "file.customer.read",
  "file.customer.write",
  "message.send",
  "automation.manage",
  "integration.manage",
  "user.manage",
];

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const preview = url.searchParams.get("preview");
    const principal = await resolvePrincipalFromRequest(request, { demoFallback: preview || "doug" });
    const auth = getAuthReadiness();

    if (!principal) {
      return Response.json({
        ok: false,
        authenticated: false,
        auth: {
          mode: auth.mode,
          internalAuthEnabled: auth.internalAuthEnabled,
          portalAuthEnabled: auth.portalAuthEnabled,
        },
      }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    return Response.json({
      ok: true,
      authenticated: true,
      principal: {
        id: principal.id,
        type: principal.type,
        role: principal.role,
        displayName: principal.displayName,
        email: principal.email,
        customerId: principal.customerId || null,
      },
      capabilities: Object.fromEntries(capabilityChecks.map(permission => [permission, can(principal, permission)])),
      auth: {
        mode: auth.mode,
        realSession: auth.mode === "supabase",
        internalAuthEnabled: auth.internalAuthEnabled,
        portalAuthEnabled: auth.portalAuthEnabled,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

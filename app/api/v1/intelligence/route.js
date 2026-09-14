import { can, resolvePrincipalFromRequest } from "../../../server/access-control";
import { getVehicleIntelligenceCatalogServer, resolveVehicleIntelligenceServer } from "../../../server/intelligence-store";

async function principalFor(request, bodyPrincipal = null) {
  return resolvePrincipalFromRequest(request, { demoFallback: bodyPrincipal || "doug" });
}

export async function GET(request) {
  try {
    const principal = await principalFor(request);
    if (!principal) return Response.json({ ok:false, error:"Authentication required" }, { status:401 });
    if (principal.type !== "internal" || !can(principal, "dashboard.read")) return Response.json({ ok:false, error:"Internal access denied" }, { status:403 });
    const catalog = await getVehicleIntelligenceCatalogServer();
    return Response.json({ ok:true, ...catalog }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const principal = await principalFor(request, body.principal);
    if (!principal) return Response.json({ ok:false, error:"Authentication required" }, { status:401 });
    if (principal.type !== "internal" || !can(principal, "dashboard.read")) return Response.json({ ok:false, error:"Internal access denied" }, { status:403 });
    const resolution = await resolveVehicleIntelligenceServer(body.vehicle || body);
    return Response.json({ ok:true, resolution }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

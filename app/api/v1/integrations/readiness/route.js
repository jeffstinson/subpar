import { can, resolvePrincipalFromRequest } from "../../../../server/access-control";
import { getIntegrationReadiness, integrationContext } from "../../../../server/integrations";

export async function GET(request) {
  try {
    const principal = await resolvePrincipalFromRequest(request, { demoFallback:"doug" });
    if (!principal) return Response.json({ ok:false, error:"Authentication required" }, { status:401 });
    if (!can(principal, "integration.manage")) return Response.json({ ok:false, error:"Integration access denied" }, { status:403 });
    const context = await integrationContext();
    return Response.json({
      ok:true,
      principal:{ type:principal.type, role:principal.role, displayName:principal.displayName },
      readiness:getIntegrationReadiness(),
      context:{ customerCount:context.customerCount, projectCount:context.projectCount },
      phase:"integration-staging",
    }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

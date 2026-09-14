import { can, resolvePrincipalFromRequest } from "../../../../../server/access-control";
import { getIntegrationReadiness, gmailHistory } from "../../../../../server/integrations";

export async function POST(request) {
  try {
    const body = await request.json();
    const principal = await resolvePrincipalFromRequest(request, { demoFallback:body.principal || "doug" });
    if (!principal) return Response.json({ ok:false, error:"Authentication required" }, { status:401 });
    if (!can(principal, "integration.manage")) return Response.json({ ok:false, error:"Integration access denied" }, { status:403 });

    const readiness = getIntegrationReadiness();
    if (!readiness.gmail.readyForReadSync) {
      return Response.json({
        ok:false,
        disabled:true,
        error:"Gmail read sync is intentionally disabled until real-data approval, dedicated OAuth credentials and the explicit sync gate are enabled.",
        readiness:readiness.gmail,
      }, { status:503, headers:{ "Cache-Control":"no-store" } });
    }

    if (!body.startHistoryId) return Response.json({ ok:false, error:"startHistoryId is required for partial sync" }, { status:400 });
    const history = await gmailHistory(body.startHistoryId);
    return Response.json({
      ok:true,
      startHistoryId:String(body.startHistoryId),
      ...history,
      next:history.requiresFullSync ? "full-sync-required" : "fetch-changed-messages-and-threads",
    }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

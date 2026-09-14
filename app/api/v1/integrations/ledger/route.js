import { can, resolvePrincipalFromRequest } from "../../../../server/access-control";
import { listIntegrationReceipts } from "../../../../server/integration-ledger";

export async function GET(request) {
  try {
    const principal = await resolvePrincipalFromRequest(request, { demoFallback:"doug" });
    if (!principal) return Response.json({ ok:false, error:"Authentication required" }, { status:401 });
    if (!can(principal, "integration.manage")) return Response.json({ ok:false, error:"Integration access denied" }, { status:403 });
    const receipts = await listIntegrationReceipts(30);
    return Response.json({ ok:true, count:receipts.length, receipts }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

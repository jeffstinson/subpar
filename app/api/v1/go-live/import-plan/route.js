import { resolvePrincipalFromRequest, can } from "../../../../server/access-control";
import { planHistoricalImport } from "../../../../server/go-live";

export async function POST(request){
  try{
    const body=await request.json();
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:body.principal||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Import planning access denied"},{status:403});
    const plan=planHistoricalImport(body);
    return Response.json({ok:true,dryRun:true,plan},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}

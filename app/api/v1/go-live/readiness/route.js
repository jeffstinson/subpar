import { resolvePrincipalFromRequest, can } from "../../../../server/access-control";
import { getGoLiveReadiness, goLiveValidationSuite, listImportBatches } from "../../../../server/go-live";

export async function GET(request){
  try{
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Go-live access denied"},{status:403});
    const [readiness,batches]=await Promise.all([getGoLiveReadiness(),listImportBatches(8)]);
    return Response.json({ok:true,readiness,validationSuite:goLiveValidationSuite(),batches},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}

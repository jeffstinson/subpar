import { can, resolvePrincipalFromRequest } from "../../../../../../server/access-control";
import { runImportBatchPage } from "../../../../../../server/backfill-worker";

export async function POST(request,context){
  try{
    const body=await request.json().catch(()=>({}));
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:body.principal||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Import execution denied"},{status:403});
    const {id}=await context.params;
    const result=await runImportBatchPage(id);
    return Response.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

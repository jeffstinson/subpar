import { requireCustomerPrincipal } from "../../../../../server/access-control";
import { getCustomerLifecycleHistory } from "../../../../../server/tune-lifecycle";

export async function GET(request,context){
  try{
    const auth=await requireCustomerPrincipal(request);
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const data=await getCustomerLifecycleHistory({projectNumber:project,principal:auth.principal});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

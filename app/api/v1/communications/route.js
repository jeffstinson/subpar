import { requireInternalPrincipal } from "../../../server/access-control";
import { getCommunicationWorkspace } from "../../../server/communications";

export async function GET(request){
  try{
    const auth=await requireInternalPrincipal(request,"dashboard.read");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const url=new URL(request.url);
    const limit=Math.max(1,Math.min(Number(url.searchParams.get("limit"))||50,100));
    const workspace=await getCommunicationWorkspace({limit});
    return Response.json({ok:true,principal:{type:auth.principal.type,role:auth.principal.role,displayName:auth.principal.displayName},workspace},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({ok:false,error:error.message},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}

import { requireInternalPrincipal } from "../../../server/access-control";
import { listIntakeRequests } from "../../../server/intake";

export async function GET(request){
  try{
    const auth=await requireInternalPrincipal(request,"project.read");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const url=new URL(request.url);
    const limit=Math.max(1,Math.min(Number(url.searchParams.get("limit"))||50,100));
    const intakes=await listIntakeRequests({limit});
    return Response.json({ok:true,intakes},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:500,headers:{"Cache-Control":"no-store"}})}
}

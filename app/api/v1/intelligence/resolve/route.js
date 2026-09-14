import { requireInternalPrincipal } from "../../../../server/access-control";
import { resolveVehiclePlatformIntelligence } from "../../../../server/vehicle-platform-intelligence";

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"project.read");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const input=await request.json();
    const intelligence=resolveVehiclePlatformIntelligence(input);
    return Response.json({ok:true,intelligence},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

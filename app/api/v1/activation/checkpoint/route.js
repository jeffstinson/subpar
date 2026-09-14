import { requireInternalPrincipal } from "../../../../server/access-control";
import { updateActivationCheckpoint } from "../../../../server/activation-checkpoints";

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"integration.manage");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();
    const actor=auth.principal.displayName||auth.principal.email||"Subpar owner";
    const data=await updateActivationCheckpoint({checkpointKey:body.checkpointKey,status:body.status,detail:body.detail||"",actor});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

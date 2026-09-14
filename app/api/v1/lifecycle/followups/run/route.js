import { requireInternalPrincipal } from "../../../../../server/access-control";
import { stageDueLifecycleFollowups } from "../../../../../server/tune-lifecycle";

function cronAuthorized(request){
  const secret=process.env.SUBPAR_CRON_SECRET;
  if(!secret)return false;
  const header=request.headers.get("authorization")||"";
  return header===`Bearer ${secret}`;
}

export async function GET(request){
  try{
    let actor="Subpar follow-up scheduler";
    if(!cronAuthorized(request)){
      const auth=await requireInternalPrincipal(request,"automation.manage");
      if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
      actor=auth.principal.displayName||auth.principal.email||"Subpar tuner";
    }
    const data=await stageDueLifecycleFollowups({limit:20,actor});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

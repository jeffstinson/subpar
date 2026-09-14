import { can, resolvePrincipalFromRequest } from "../../../../../server/access-control";
import { getDataMode } from "../../../../../server/env";
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
      const principal=await resolvePrincipalFromRequest(request,{demoFallback:getDataMode()==="demo"?"doug":null});
      if(!principal||principal.type!=="internal"||!can(principal,"automation.manage")){
        return Response.json({ok:false,error:"Internal access denied"},{status:403,headers:{"Cache-Control":"no-store"}});
      }
      actor=principal.displayName||principal.email||"Subpar tuner";
    }
    const data=await stageDueLifecycleFollowups({limit:20,actor});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

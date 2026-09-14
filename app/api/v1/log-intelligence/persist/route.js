import { requireInternalPrincipal } from "../../../../server/access-control";
import { analyzeStoredLog } from "../../../../server/log-analysis-persistence";

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"log.review");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();
    if(!body.logId)return Response.json({ok:false,error:"logId is required"},{status:400});
    const data=await analyzeStoredLog(body.logId,{actor:auth.principal.displayName||auth.principal.email||"Subpar tuner"});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

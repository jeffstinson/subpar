import { requireInternalPrincipal } from "../../../server/access-control";
import { stageDatazapReference } from "../../../server/log-review-workflow";

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"log.review");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();
    if(!body.project||!body.url)return Response.json({ok:false,error:"project and url are required"},{status:400});
    const data=await stageDatazapReference({projectNumber:body.project,url:body.url,revisionId:body.revisionId||null,actor:auth.principal.displayName||auth.principal.email||"Subpar tuner"});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

import { requireInternalPrincipal } from "../../../server/access-control";
import { getCurrentCycleLogReviewWorkspace, listCurrentCycleLogReviewQueue } from "../../../server/log-review-current-cycle";

export async function GET(request){
  try{
    const auth=await requireInternalPrincipal(request,"log.review");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const url=new URL(request.url);
    const project=url.searchParams.get("project");
    const logId=url.searchParams.get("log");
    if(project){
      const workspace=await getCurrentCycleLogReviewWorkspace({projectNumber:project,logId});
      return Response.json({ok:true,workspace},{headers:{"Cache-Control":"no-store"}});
    }
    const queue=await listCurrentCycleLogReviewQueue({limit:Number(url.searchParams.get("limit"))||40});
    return Response.json({ok:true,queue},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

import { requireInternalPrincipal } from "../../../../server/access-control";
import { addLogAnnotation, saveLogReviewDecision } from "../../../../server/log-review-workflow";

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"log.review");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();
    const actor=auth.principal.displayName||auth.principal.email||"Subpar tuner";
    let data;
    if(body.action==="decision"){
      data=await saveLogReviewDecision({projectNumber:body.project,primaryLogId:body.primaryLogId,comparisonLogId:body.comparisonLogId||null,decision:body.decision,note:body.note||"",customerSummary:body.customerSummary||"",actor});
    }else if(body.action==="annotate"){
      data=await addLogAnnotation({projectNumber:body.project,primaryLogId:body.primaryLogId,metricKey:body.metricKey||null,rpm:body.rpm||null,severity:body.severity||"note",note:body.note,actor});
    }else return Response.json({ok:false,error:"action must be decision or annotate"},{status:400});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

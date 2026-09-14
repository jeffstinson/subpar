import { requireInternalPrincipal } from "../../../../server/access-control";
import { getDataMode } from "../../../../server/env";
import { addLogAnnotation, saveLogReviewDecision } from "../../../../server/log-review-workflow";
import { getProjectById } from "../../../../server/repository";
import { getSupabaseServerClient } from "../../../../server/supabase-server";

async function assertCurrentCycle(projectNumber,logId,comparisonLogId=null){
  if(getDataMode()!=="supabase")return;
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  if(!project.currentCycleId)return;
  const ids=[logId,comparisonLogId].filter(Boolean);
  if(!ids.length)throw new Error("Primary log is required");
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("logs").select("id,project_id,cycle_id").in("id",ids);
  if(error)throw new Error(`Unable to verify log cycle: ${error.message}`);
  if((data||[]).length!==ids.length)throw new Error("One or more requested logs were not found");
  for(const log of data||[]){
    if(log.project_id!==project.id)throw new Error("Review log does not belong to this project");
    if(log.cycle_id!==project.currentCycleId)throw new Error("Archived tune-cycle logs are read-only. Review the active cycle instead.");
  }
}

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"log.review");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();
    const actor=auth.principal.displayName||auth.principal.email||"Subpar tuner";
    let data;
    if(body.action==="decision"){
      await assertCurrentCycle(body.project,body.primaryLogId,body.comparisonLogId||null);
      data=await saveLogReviewDecision({projectNumber:body.project,primaryLogId:body.primaryLogId,comparisonLogId:body.comparisonLogId||null,decision:body.decision,note:body.note||"",customerSummary:body.customerSummary||"",actor});
    }else if(body.action==="annotate"){
      await assertCurrentCycle(body.project,body.primaryLogId,null);
      data=await addLogAnnotation({projectNumber:body.project,primaryLogId:body.primaryLogId,metricKey:body.metricKey||null,rpm:body.rpm||null,severity:body.severity||"note",note:body.note,actor});
    }else return Response.json({ok:false,error:"action must be decision or annotate"},{status:400});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

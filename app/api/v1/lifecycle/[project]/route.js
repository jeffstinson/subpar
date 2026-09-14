import { requireInternalPrincipal } from "../../../../server/access-control";
import {
  approveCloseout,
  completeCloseout,
  getLifecycleWorkspace,
  lifecycleReadiness,
  reopenTuneCycle,
  runCloseoutQa,
  saveCloseoutDraft,
  stageLifecycleFollowup,
} from "../../../../server/tune-lifecycle";

export async function GET(request,context){
  try{
    const auth=await requireInternalPrincipal(request,"project.read");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const workspace=await getLifecycleWorkspace({projectNumber:project});
    return Response.json({ok:true,workspace,readiness:lifecycleReadiness()},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request,context){
  try{
    const body=await request.json();
    const action=String(body.action||"");
    const auth=await requireInternalPrincipal(request,"project.write");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const actor=auth.principal.displayName||auth.principal.email||"Subpar tuner";
    const draftInput={projectNumber:project,customerSummary:body.customerSummary||"",aftercareNotes:body.aftercareNotes||"",followupDays:body.followupDays??7,actor};
    let data;
    if(action==="save")data=await saveCloseoutDraft(draftInput);
    else if(action==="qa"){
      await saveCloseoutDraft(draftInput);
      data=await runCloseoutQa({projectNumber:project,actor});
    }else if(action==="approve"){
      await saveCloseoutDraft(draftInput);
      data=await approveCloseout({projectNumber:project,actor});
    }else if(action==="close")data=await completeCloseout({projectNumber:project,actor,stageEmail:body.stageEmail!==false});
    else if(action==="reopen")data=await reopenTuneCycle({projectNumber:project,reason:body.reason||"hardware_change",changeSummary:body.changeSummary||"",hardwareChanges:body.hardwareChanges||{},fuelTarget:body.fuelTarget||null,actor});
    else if(action==="stage_followup"){
      if(!body.followupId)return Response.json({ok:false,error:"followupId is required"},{status:400});
      data=await stageLifecycleFollowup({followupId:body.followupId,actor,force:Boolean(body.force)});
    }else return Response.json({ok:false,error:"action must be save, qa, approve, close, reopen, or stage_followup"},{status:400});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

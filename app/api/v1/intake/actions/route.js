import { requireInternalPrincipal } from "../../../../server/access-control";
import { activateReviewedIntake, createIntakeAccessLink, reviewIntake } from "../../../../server/intake";

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"project.write");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();
    if(!body.intakeId)return Response.json({ok:false,error:"intakeId is required"},{status:400});
    const actor=auth.principal.displayName||auth.principal.email||"Subpar tuner";
    let data;
    if(body.action==="create-link")data=await createIntakeAccessLink(body.intakeId,{createdBy:actor,hours:body.hours});
    else if(body.action==="review")data=await reviewIntake(body.intakeId,{decision:body.decision,notes:body.notes,reviewedBy:actor});
    else if(body.action==="activate")data=await activateReviewedIntake(body.intakeId,{reviewedBy:actor});
    else return Response.json({ok:false,error:"action must be create-link, review, or activate"},{status:400});
    return Response.json({ok:true,action:body.action,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

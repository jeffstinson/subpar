import { requireInternalPrincipal } from "../../../../server/access-control";
import {
  approveRevisionDelivery,
  deliverRevision,
  getRevisionDeliveryWorkspace,
  revisionDeliveryReadiness,
  runRevisionDeliveryQa,
  saveRevisionDeliveryDraft,
} from "../../../../server/revision-delivery";

export async function GET(request,context){
  try{
    const auth=await requireInternalPrincipal(request,"project.read");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const url=new URL(request.url);
    const workspace=await getRevisionDeliveryWorkspace({projectNumber:project,revision:url.searchParams.get("revision")||null});
    return Response.json({ok:true,workspace,readiness:revisionDeliveryReadiness()},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request,context){
  try{
    const body=await request.json();
    const action=String(body.action||"");
    const permission=new Set(["approve","deliver"]).has(action)?"revision.publish":"revision.create";
    const auth=await requireInternalPrincipal(request,permission);
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const common={projectNumber:project,revisionNumber:body.revisionNumber||null,actor:auth.principal.displayName||auth.principal.email||"Subpar tuner"};
    let data;
    if(action==="save")data=await saveRevisionDeliveryDraft({...common,customerSummary:body.customerSummary||"",internalNotes:body.internalNotes||"",nextStep:body.nextStep||"request_log"});
    else if(action==="qa")data=await runRevisionDeliveryQa(common);
    else if(action==="approve")data=await approveRevisionDelivery(common);
    else if(action==="deliver")data=await deliverRevision({...common,stageEmail:body.stageEmail!==false});
    else return Response.json({ok:false,error:"action must be save, qa, approve, or deliver"},{status:400});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

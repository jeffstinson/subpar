import { can, canAccessProject, resolvePrincipalFromRequest } from "../../../../../server/access-control";
import { approveGmailDraft, cancelGmailDraft, queueGmailDraft } from "../../../../../server/gmail-outbound";
import { syncIntakeHandoffStatus } from "../../../../../server/intake-invite-send";
import { sendApprovedOutboundAction } from "../../../../../server/outbound-dispatch";
import { getProjectById } from "../../../../../server/repository";
import { listOutboundActions } from "../../../../../server/safe-gmail-send";

export async function GET(request){
  try{
    const url=new URL(request.url);
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:url.searchParams.get("preview")||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(principal.type!=="internal"||!can(principal,"message.send"))return Response.json({ok:false,error:"Messaging access denied"},{status:403});
    const projectNumber=url.searchParams.get("project");
    let projectId=null;
    if(projectNumber){
      const project=await getProjectById(projectNumber);
      if(!project)return Response.json({ok:false,error:"Project not found"},{status:404});
      if(!canAccessProject(principal,project))return Response.json({ok:false,error:"Project access denied"},{status:403});
      projectId=project.id;
    }
    const data=await listOutboundActions({projectId,status:url.searchParams.get("status")||null,limit:Number(url.searchParams.get("limit"))||50});
    return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request){
  try{
    const body=await request.json();
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:body.principal||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(principal.type!=="internal")return Response.json({ok:false,error:"Internal messaging access required"},{status:403});
    const action=String(body.action||"draft").toLowerCase();

    if(action==="draft"){
      if(!can(principal,"message.send"))return Response.json({ok:false,error:"Draft access denied"},{status:403});
      const project=await getProjectById(body.project);
      if(!project)return Response.json({ok:false,error:"Project not found"},{status:404});
      if(!canAccessProject(principal,project))return Response.json({ok:false,error:"Project access denied"},{status:403});
      const data=await queueGmailDraft({projectNumber:project.projectNumber,to:body.to,subject:body.subject,body:body.body,threadId:body.threadId||null,requestId:body.requestId,createdBy:principal.displayName||principal.email});
      return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
    }

    if(action==="approve"){
      if(!can(principal,"message.approve"))return Response.json({ok:false,error:"Only owner/tuner can approve outbound email"},{status:403});
      const data=await approveGmailDraft(body.id,principal.displayName||principal.email);
      await syncIntakeHandoffStatus(data);
      return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
    }

    if(action==="send"){
      if(!can(principal,"message.provider_send"))return Response.json({ok:false,error:"Only owner/tuner can send through Gmail"},{status:403});
      const data=await sendApprovedOutboundAction(body.id,principal.displayName||principal.email);
      return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
    }

    if(action==="cancel"){
      if(!can(principal,"message.approve"))return Response.json({ok:false,error:"Only owner/tuner can cancel provider-bound email"},{status:403});
      const data=await cancelGmailDraft(body.id,principal.displayName||principal.email);
      await syncIntakeHandoffStatus(data);
      return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
    }

    return Response.json({ok:false,error:"action must be draft, approve, send or cancel"},{status:400});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

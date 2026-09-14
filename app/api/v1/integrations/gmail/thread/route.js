import { can, resolvePrincipalFromRequest } from "../../../../../server/access-control";
import { applyGmailThreadPlan } from "../../../../../server/integration-apply";
import { fetchGmailThread } from "../../../../../server/gmail-client";
import { getIntegrationReadiness, planGmailThread } from "../../../../../server/integrations";
import { mutationsEnabled } from "../../../../../server/env";

export async function POST(request){
  try{
    const body=await request.json();
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:body.principal||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Integration access denied"},{status:403});

    const readiness=getIntegrationReadiness();
    if(!readiness.gmail.readyForReadSync){
      return Response.json({ok:false,disabled:true,error:"Gmail read sync is not enabled",readiness:readiness.gmail},{status:503,headers:{"Cache-Control":"no-store"}});
    }
    if(!body.threadId)return Response.json({ok:false,error:"threadId is required"},{status:400});

    const thread=await fetchGmailThread(body.threadId);
    const plan=await planGmailThread(thread);
    const canApply=mutationsEnabled()&&readiness.realDataApproved&&readiness.gmail.syncEnabled;
    const result=canApply?await applyGmailThreadPlan(plan):null;

    return Response.json({
      ok:true,
      threadId:body.threadId,
      plan,
      applied:Boolean(result),
      result,
      note:result?"Gmail thread persisted and routed through the Subpar data model.":"Thread hydrated and planned only; persistent mutation gates remain closed.",
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}

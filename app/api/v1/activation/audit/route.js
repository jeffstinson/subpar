import { requireInternalPrincipal } from "../../../../server/access-control";
import { activationCutoverSequence,listActivationAudits,runActivationAudit } from "../../../../server/activation-readiness";

export async function GET(request){
  try{
    const auth=await requireInternalPrincipal(request,"integration.manage");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const actor=auth.principal.displayName||auth.principal.email||"Subpar owner";
    const [audit,history]=await Promise.all([
      runActivationAudit({actor,includeProviderProbes:false,persist:false}),
      listActivationAudits(8),
    ]);
    return Response.json({ok:true,audit,history,sequence:activationCutoverSequence()},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"integration.manage");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json().catch(()=>({}));
    const actor=auth.principal.displayName||auth.principal.email||"Subpar owner";
    const audit=await runActivationAudit({actor,includeProviderProbes:Boolean(body.includeProviderProbes),persist:body.persist!==false});
    const history=await listActivationAudits(8);
    return Response.json({ok:true,audit,history,sequence:activationCutoverSequence()},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

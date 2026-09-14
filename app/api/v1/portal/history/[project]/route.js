import { requireCustomerPrincipal } from "../../../../../server/access-control";
import { getCustomerLifecycleHistory } from "../../../../../server/tune-lifecycle";

function customerManifest(manifest={}){
  return {
    generatedAt:manifest.generatedAt||null,
    finalTune:manifest.finalTune?.customerVisible===false?null:manifest.finalTune||null,
    stockFiles:(manifest.stockFiles||[]).filter(item=>item.customerVisible===true),
    parameterPacks:(manifest.parameterPacks||[]).filter(item=>item.customerVisible!==false),
    completionSummary:Boolean(manifest.completionSummary),
    aftercare:Boolean(manifest.aftercare),
    deliveryMode:manifest.deliveryMode||"secure-portal-individual-files",
  };
}

export async function GET(request,context){
  try{
    const auth=await requireCustomerPrincipal(request);
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const data=await getCustomerLifecycleHistory({projectNumber:project,principal:auth.principal});
    const safe={...data,cycles:(data.cycles||[]).map(cycle=>({...cycle,closeout:cycle.closeout?{...cycle.closeout,packageManifest:customerManifest(cycle.closeout.packageManifest)}:null}))};
    return Response.json({ok:true,data:safe},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

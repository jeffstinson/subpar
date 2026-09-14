import { can, resolvePrincipalFromRequest } from "../../../../server/access-control";
import { createImportBatch, getImportBatch, historicalImportApplyReady, setImportBatchStatus } from "../../../../server/import-batches";
import { listImportBatches } from "../../../../server/go-live";

export async function GET(request){
  try{
    const url=new URL(request.url);
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:url.searchParams.get("preview")||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Import access denied"},{status:403});
    const id=url.searchParams.get("id");
    const data=id?await getImportBatch(id):await listImportBatches(Number(url.searchParams.get("limit"))||20);
    return Response.json({ok:true,applyReady:historicalImportApplyReady(),data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request){
  try{
    const body=await request.json();
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:body.principal||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Import access denied"},{status:403});

    if(body.action==="status"){
      const data=await setImportBatchStatus(body.batchId,body.status);
      return Response.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
    }

    const data=await createImportBatch({
      integration:body.integration,
      importType:body.importType,
      mode:body.mode||"dry-run",
      sourceStart:body.sourceStart||null,
      sourceEnd:body.sourceEnd||null,
      expectedCount:body.expectedCount??null,
      options:body.options||{},
      createdBy:principal.displayName||principal.email||"Subpar owner",
    });
    return Response.json({ok:true,data,applyReady:historicalImportApplyReady()},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

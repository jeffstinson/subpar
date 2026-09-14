import { requireInternalPrincipal } from "../../../server/access-control";
import { analyzeLogCsv, demoMhdCsv } from "../../../server/log-intelligence";

export async function GET(request){
  const auth=await requireInternalPrincipal(request,"log.review");
  if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
  return new Response(demoMhdCsv(),{headers:{"Content-Type":"text/csv; charset=utf-8","Cache-Control":"no-store","Content-Disposition":"inline; filename=subpar-demo-mhd.csv"}});
}

export async function POST(request){
  try{
    const auth=await requireInternalPrincipal(request,"log.review");
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const body=await request.json();
    const csvText=String(body.csvText||"");
    if(!csvText.trim())return Response.json({ok:false,error:"csvText is required"},{status:400});
    if(Buffer.byteLength(csvText,"utf8")>2_500_000)return Response.json({ok:false,error:"CSV is larger than the 2.5 MB preview-analysis limit"},{status:413});
    const analysis=await analyzeLogCsv({csvText,platform:body.platform||"MHD",engine:body.engine||"B58TU",fileName:body.fileName||"upload.csv"});
    return Response.json({ok:true,analysis},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

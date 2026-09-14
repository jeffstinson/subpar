import { can, resolvePrincipalFromRequest } from "../../../../server/access-control";
import { runPreflight } from "../../../../server/preflight";

export async function POST(request){
  try{
    const body=await request.json().catch(()=>({}));
    const principal=await resolvePrincipalFromRequest(request,{demoFallback:body.principal||"doug"});
    if(!principal)return Response.json({ok:false,error:"Authentication required"},{status:401});
    if(!can(principal,"integration.manage"))return Response.json({ok:false,error:"Preflight access denied"},{status:403});
    const scopes=Array.isArray(body.scopes)&&body.scopes.length?body.scopes:["supabase","storage"];
    const result=await runPreflight({scopes,testedBy:principal.displayName||principal.email||"Subpar owner"});
    return Response.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

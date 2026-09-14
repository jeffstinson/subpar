import { resolvePrincipalFromRequest, SESSION_COOKIE } from "../../../../server/access-control";

const TYPE_COOKIE="subpar_principal_type";
function cookie(name,value,maxAge=60*60){
  const secure=process.env.NODE_ENV==="production"?"; Secure":"";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function POST(request){
  try{
    const principal=await resolvePrincipalFromRequest(request);
    if(!principal)return Response.json({ok:false,error:"Invalid or unmapped session"},{status:401});
    const auth=request.headers.get("authorization")||"";
    const token=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
    if(!token)return Response.json({ok:false,error:"Bearer token required"},{status:400});
    const headers=new Headers({"Cache-Control":"no-store"});
    headers.append("Set-Cookie",cookie(SESSION_COOKIE,token));
    headers.append("Set-Cookie",cookie(TYPE_COOKIE,principal.type));
    return Response.json({ok:true,principal:{type:principal.type,role:principal.role,displayName:principal.displayName,customerId:principal.customerId||null}},{headers});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400});}
}

export async function DELETE(){
  const headers=new Headers({"Cache-Control":"no-store"});
  headers.append("Set-Cookie",cookie(SESSION_COOKIE,"",0));
  headers.append("Set-Cookie",cookie(TYPE_COOKIE,"",0));
  return Response.json({ok:true},{headers});
}

import { NextResponse } from "next/server";

const internalPrefixes=["/project","/workspace","/intake","/intake-queue","/intelligence","/log-lab","/log-review","/reviews","/revision","/delivery","/closeout","/lifecycle","/activation","/automations","/security","/persistence","/data-core","/mobile","/files","/integration-lab","/go-live","/messages","/outbound"];

function loginRedirect(request,audience){
  const url=request.nextUrl.clone();
  url.pathname="/login";
  url.searchParams.set("audience",audience);
  url.searchParams.set("next",request.nextUrl.pathname+request.nextUrl.search);
  return NextResponse.redirect(url);
}

async function verifySupabaseAudience(token,audience){
  const base=(process.env.SUBPAR_SUPABASE_URL||process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL||"").replace(/\/$/,"");
  const anon=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY||"";
  if(!base||!anon||!token)return false;
  try{
    const auth=await fetch(`${base}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`},cache:"no-store"});
    if(!auth.ok)return false;
    const user=await auth.json();
    if(!user?.id)return false;
    const table=audience==="internal"?"internal_users":"customer_portal_users";
    const select=audience==="internal"?"id,role,active":"id,customer_id,active";
    const membership=await fetch(`${base}/rest/v1/${table}?auth_user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=${encodeURIComponent(select)}&limit=1`,{
      headers:{apikey:anon,Authorization:`Bearer ${token}`,Accept:"application/json"},cache:"no-store"
    });
    if(!membership.ok)return false;
    const rows=await membership.json();
    return Array.isArray(rows)&&rows.length>0;
  }catch{return false;}
}

export async function middleware(request){
  const path=request.nextUrl.pathname;
  if(path.startsWith("/login")||path.startsWith("/auth")||path.startsWith("/api")||path.startsWith("/_next")||path.startsWith("/logout")) return NextResponse.next();

  let rewriteUrl=null;
  if(path.startsWith("/project/")){
    const projectId=decodeURIComponent(path.slice("/project/".length));
    if(projectId&&projectId!=="SP-1842"){
      rewriteUrl=request.nextUrl.clone();
      rewriteUrl.pathname=`/workspace/${encodeURIComponent(projectId)}`;
    }
  }

  const token=request.cookies.get("subpar_access_token")?.value;

  if(path.startsWith("/portal/")&&process.env.SUBPAR_PORTAL_AUTH_ENABLED==="true"){
    if(!token||!(await verifySupabaseAudience(token,"customer"))) return loginRedirect(request,"customer");
  }

  const internal=path==="/"||internalPrefixes.some(prefix=>path.startsWith(prefix));
  if(internal&&process.env.SUBPAR_INTERNAL_AUTH_ENABLED==="true"){
    if(!token||!(await verifySupabaseAudience(token,"internal"))) return loginRedirect(request,"internal");
  }

  return rewriteUrl?NextResponse.rewrite(rewriteUrl):NextResponse.next();
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|subpar-logo.png).*)"]};

import { NextResponse } from "next/server";

const internalPrefixes=["/project","/intake","/log-review","/revision","/closeout","/automations","/security","/persistence","/data-core","/mobile","/files"];

function loginRedirect(request,audience){
  const url=request.nextUrl.clone();
  url.pathname="/login";
  url.searchParams.set("audience",audience);
  url.searchParams.set("next",request.nextUrl.pathname+request.nextUrl.search);
  return NextResponse.redirect(url);
}

export function middleware(request){
  const path=request.nextUrl.pathname;
  if(path.startsWith("/login")||path.startsWith("/auth")||path.startsWith("/api")||path.startsWith("/_next")) return NextResponse.next();
  const session=request.cookies.get("subpar_access_token")?.value;

  if(path.startsWith("/portal/") && process.env.SUBPAR_PORTAL_AUTH_ENABLED === "true" && !session){
    return loginRedirect(request,"customer");
  }

  const internal=path==="/"||internalPrefixes.some(prefix=>path.startsWith(prefix));
  if(internal && process.env.SUBPAR_INTERNAL_AUTH_ENABLED === "true" && !session){
    return loginRedirect(request,"internal");
  }

  return NextResponse.next();
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|subpar-logo.png).*)"]};

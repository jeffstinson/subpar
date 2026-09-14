import { NextResponse } from "next/server";

export async function GET(request){
  const url=new URL("/login?signedOut=1",request.url);
  const response=NextResponse.redirect(url);
  const options={httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:0};
  response.cookies.set("subpar_access_token","",options);
  response.cookies.set("subpar_principal_type","",options);
  return response;
}

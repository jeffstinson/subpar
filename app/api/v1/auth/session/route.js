import { resolvePrincipalFromRequest, SESSION_COOKIE } from "../../../../server/access-control";

function cookie(value, maxAge = 60 * 60 * 8) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function POST(request) {
  try {
    const principal = await resolvePrincipalFromRequest(request);
    if (!principal) return Response.json({ ok:false, error:"Invalid or unmapped session" }, { status:401 });
    const auth = request.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return Response.json({ ok:false, error:"Bearer token required" }, { status:400 });
    return Response.json({ ok:true, principal:{ type:principal.type, role:principal.role, displayName:principal.displayName, customerId:principal.customerId || null } }, {
      headers:{ "Cache-Control":"no-store", "Set-Cookie":cookie(token) }
    });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400 });
  }
}

export async function DELETE() {
  return Response.json({ ok:true }, { headers:{ "Cache-Control":"no-store", "Set-Cookie":cookie("", 0) } });
}

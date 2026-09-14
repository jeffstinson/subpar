import { can, canAccessProject, resolvePrincipalFromRequest } from "../../../../../server/access-control";
import { getProjectById } from "../../../../../server/repository";
import { planGmailDraft } from "../../../../../server/integrations";

export async function POST(request) {
  try {
    const body = await request.json();
    const principal = await resolvePrincipalFromRequest(request, { demoFallback:body.principal || "doug" });
    if (!principal) return Response.json({ ok:false, error:"Authentication required" }, { status:401 });
    if (!can(principal, "message.send")) return Response.json({ ok:false, error:"Messaging access denied" }, { status:403 });

    const project = await getProjectById(body.project);
    if (!project) return Response.json({ ok:false, error:"Project not found" }, { status:404 });
    if (!canAccessProject(principal, project)) return Response.json({ ok:false, error:"Project access denied" }, { status:403 });

    const draft = planGmailDraft({
      project,
      to:body.to,
      subject:body.subject,
      body:body.body,
      threadId:body.threadId,
    });

    return Response.json({
      ok:true,
      dryRun:true,
      principal:{ type:principal.type, role:principal.role, displayName:principal.displayName },
      draft,
    }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

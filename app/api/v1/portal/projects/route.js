import { getProjects } from "../../../../server/repository";
import {
  canAccessProject,
  resolvePrincipalFromRequest,
} from "../../../../server/access-control";
import { customerProjectView } from "../../../../server/portal-view";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const preview = url.searchParams.get("preview");
    const principal = await resolvePrincipalFromRequest(request, { demoFallback: preview || null });
    if (!principal) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const projects = await getProjects();
    const visible = projects.filter(project => canAccessProject(principal, project));

    return Response.json({
      ok: true,
      principal: {
        type: principal.type,
        role: principal.role,
        customerId: principal.customerId || null,
      },
      count: visible.length,
      projects: visible.map(customerProjectView),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

import { getProjectById } from "../../../../../server/repository";
import { canAccessProject, requireCustomerPrincipal } from "../../../../../server/access-control";
import { customerProjectView } from "../../../../../server/portal-view";

export async function GET(request, context) {
  try {
    const auth = await requireCustomerPrincipal(request);
    if (!auth.ok) return Response.json({ ok:false, error:auth.error }, { status:auth.status });
    const principal = auth.principal;
    const { id } = await context.params;
    const project = await getProjectById(id);
    if (!project) return Response.json({ ok:false, error:"Project not found" }, { status:404 });
    if (!canAccessProject(principal, project)) return Response.json({ ok:false, error:"Project access denied" }, { status:403 });
    return Response.json({
      ok:true,
      principal:{ type:principal.type, role:principal.role, customerId:principal.customerId || null },
      project:customerProjectView(project),
    }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:400, headers:{ "Cache-Control":"no-store" } });
  }
}

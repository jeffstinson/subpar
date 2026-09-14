import { getProjectById } from "../../../../server/repository";
import { apiError, apiOk } from "../../../../server/http";
import { requireInternalPrincipal } from "../../../../server/access-control";

export async function GET(request, context) {
  try {
    const auth = await requireInternalPrincipal(request,"project.read");
    if (!auth.ok) return apiError(auth.error,auth.status);
    const { id } = await context.params;
    const data = await getProjectById(id);
    if (!data) return apiError("Project not found",404,{id});
    return apiOk(data,{principal:{role:auth.principal.role,type:auth.principal.type}});
  } catch (error) {
    return apiError(error.message,500);
  }
}

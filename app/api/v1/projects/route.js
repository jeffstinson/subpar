import { getProjects } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";
import { requireInternalPrincipal } from "../../../server/access-control";

export async function GET(request) {
  try {
    const auth = await requireInternalPrincipal(request,"project.read");
    if (!auth.ok) return apiError(auth.error,auth.status);
    const url = new URL(request.url);
    const filters = Object.fromEntries([...url.searchParams.entries()].filter(([,value]) => value));
    const data = await getProjects(filters);
    return apiOk(data,{count:data.length,filters,principal:{role:auth.principal.role,type:auth.principal.type}});
  } catch (error) {
    return apiError(error.message,500);
  }
}

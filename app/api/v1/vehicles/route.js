import { getVehicles } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";
import { requireInternalPrincipal } from "../../../server/access-control";

export async function GET(request) {
  try {
    const auth = await requireInternalPrincipal(request,"vehicle.read");
    if (!auth.ok) return apiError(auth.error,auth.status);
    const data = await getVehicles();
    return apiOk(data,{count:data.length,principal:{role:auth.principal.role,type:auth.principal.type}});
  } catch (error) {
    return apiError(error.message,500);
  }
}

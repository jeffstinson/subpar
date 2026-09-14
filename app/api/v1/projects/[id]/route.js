import { getProjectById } from "../../../../server/repository";
import { apiError, apiOk } from "../../../../server/http";

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const data = await getProjectById(id);
    if (!data) return apiError("Project not found",404,{id});
    return apiOk(data);
  } catch (error) {
    return apiError(error.message,500);
  }
}

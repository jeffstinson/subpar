import { getProjects } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const filters = Object.fromEntries([...url.searchParams.entries()].filter(([,value]) => value));
    const data = await getProjects(filters);
    return apiOk(data,{count:data.length,filters});
  } catch (error) {
    return apiError(error.message,500);
  }
}

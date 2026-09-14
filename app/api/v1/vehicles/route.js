import { getVehicles } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";

export async function GET() {
  try {
    const data = await getVehicles();
    return apiOk(data,{count:data.length});
  } catch (error) {
    return apiError(error.message,500);
  }
}

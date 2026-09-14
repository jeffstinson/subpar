import { getDashboardData } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";

export async function GET() {
  try {
    return apiOk(await getDashboardData());
  } catch (error) {
    return apiError(error.message, 500);
  }
}

import { getSystemData } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";

export async function GET() {
  try {
    return apiOk(await getSystemData());
  } catch (error) {
    return apiError(error.message,500);
  }
}

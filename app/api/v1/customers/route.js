import { getCustomers } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";

export async function GET() {
  try {
    const data = await getCustomers();
    return apiOk(data,{count:data.length});
  } catch (error) {
    return apiError(error.message,500);
  }
}

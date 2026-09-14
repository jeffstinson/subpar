import { mutationsEnabled, previewAction } from "../../../server/repository";
import { apiError, apiOk } from "../../../server/http";

export async function POST(request) {
  try {
    const payload = await request.json();
    if (mutationsEnabled()) {
      return apiError("Persistent mutation adapter is not configured yet.",501,{action:payload?.action || null});
    }
    const result = await previewAction(payload);
    return apiOk(result,{mutationMode:"dry-run"});
  } catch (error) {
    return apiError(error.message,400);
  }
}

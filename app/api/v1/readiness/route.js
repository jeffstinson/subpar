import { getReadinessData } from "../../../server/repository";

export async function GET() {
  try {
    const readiness = await getReadinessData();
    return Response.json({ok:true,...readiness,timestamp:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    return Response.json({ok:false,error:error.message,timestamp:new Date().toISOString()},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}

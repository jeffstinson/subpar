import { getReadinessData, getSystemData } from "../../server/repository";

export async function GET(){
  try {
    const [system,readiness] = await Promise.all([getSystemData(),getReadinessData()]);
    return Response.json({
      ok:true,
      service:"subpar-os",
      mode:system.configuredMode,
      schemaVersion:system.schemaVersion,
      mutationMode:system.mutationMode,
      mutationsEnabled:system.mutationsEnabled,
      dataCore:"ready",
      persistence:{adapter:readiness.repositoryAdapter,supabaseConfigured:readiness.supabaseConfigured,connectivity:readiness.connectivity,realDataGate:readiness.realDataGate},
      normalizedCounts:system.counts || null,
      integrations:system.integrations,
      ndaGate:system.ndaGate,
      api:"/api/v1",
      timestamp:new Date().toISOString()
    },{headers:{"Cache-Control":"no-store"}})
  } catch (error) {
    return Response.json({ok:false,service:"subpar-os",error:error.message,timestamp:new Date().toISOString()},{status:500,headers:{"Cache-Control":"no-store"}})
  }
}

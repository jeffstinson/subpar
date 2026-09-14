import { getReadinessData, getSystemData } from "../../server/repository";
import { getAccessReadiness } from "../../server/access-control";
import { getAuthReadiness } from "../../server/env";
import { getStorageReadiness } from "../../server/storage";

export async function GET(){
  try {
    const [system,readiness] = await Promise.all([getSystemData(),getReadinessData()]);
    const auth = getAuthReadiness();
    const access = getAccessReadiness();
    const storage = getStorageReadiness();
    return Response.json({
      ok:true,
      service:"subpar-os",
      mode:system.configuredMode,
      schemaVersion:system.schemaVersion,
      mutationMode:system.mutationMode,
      mutationsEnabled:system.mutationsEnabled,
      dataCore:"ready",
      persistence:{adapter:readiness.repositoryAdapter,supabaseConfigured:readiness.supabaseConfigured,connectivity:readiness.connectivity,realDataGate:readiness.realDataGate},
      identity:{mode:auth.mode,provider:access.authProvider,publicAuthConfigured:auth.publicAuthConfigured,internalAuthEnabled:auth.internalAuthEnabled,portalAuthEnabled:auth.portalAuthEnabled,defaultDeny:access.defaultDeny},
      storage:{provider:storage.provider,privateByDefault:storage.privateByDefault,signedDownloads:storage.signedDownloads,signedUploads:storage.signedUploads,uploadFinalization:storage.uploadFinalization,ticketSecretConfigured:storage.ticketSecretConfigured,buckets:Object.values(storage.buckets)},
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

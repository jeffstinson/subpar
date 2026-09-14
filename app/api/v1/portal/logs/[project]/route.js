import { canAccessProject, requireCustomerPrincipal } from "../../../../../server/access-control";
import { getDataMode, mutationsEnabled } from "../../../../../server/env";
import { getProjectById } from "../../../../../server/repository";
import { getSupabaseServerClient } from "../../../../../server/supabase-server";

export async function POST(request,context){
  try{
    const auth=await requireCustomerPrincipal(request);
    if(!auth.ok)return Response.json({ok:false,error:auth.error},{status:auth.status});
    const {project}=await context.params;
    const record=await getProjectById(project);
    if(!record)return Response.json({ok:false,error:"Project not found"},{status:404});
    if(!canAccessProject(auth.principal,record))return Response.json({ok:false,error:"Project access denied"},{status:403});
    const body=await request.json();
    const fileName=String(body.fileName||"").trim();
    if(!fileName)return Response.json({ok:false,error:"fileName is required"},{status:400});
    if(getDataMode()!=="supabase")return Response.json({ok:true,data:{dryRun:true,logId:`demo_log_${Date.now()}`,revisionNumber:record.currentRevisionNumber||record.currentRevision||5,status:"awaiting_upload",fileName}},{headers:{"Cache-Control":"no-store"}});
    if(!mutationsEnabled())return Response.json({ok:false,error:"Customer log uploads require SUBPAR_MUTATIONS_ENABLED=true"},{status:409});
    const supabase=getSupabaseServerClient();
    const {data:deliveries,error:deliveryError}=await supabase.from("revision_deliveries").select("id,revision_id,status,next_step,installed_at,next_log_requested_at").eq("project_id",record.id).eq("next_step","request_log").order("delivered_at",{ascending:false}).limit(1);
    if(deliveryError)throw new Error(`Unable to inspect revision delivery: ${deliveryError.message}`);
    const delivery=deliveries?.[0];
    if(!delivery||!delivery.installed_at||!delivery.next_log_requested_at)throw new Error("Install acknowledgement is required before the next-log upload opens");
    const since=new Date(Date.now()-15*60*1000).toISOString();
    const {data:existing}=await supabase.from("logs").select("id,revision_id,status,file_name,uploaded_at").eq("project_id",record.id).eq("revision_id",delivery.revision_id).eq("status","awaiting_upload").eq("file_name",fileName).gte("created_at",since).order("created_at",{ascending:false}).limit(1);
    if(existing?.[0])return Response.json({ok:true,data:{dryRun:false,replayed:true,logId:existing[0].id,revisionId:existing[0].revision_id,status:existing[0].status,fileName:existing[0].file_name}},{headers:{"Cache-Control":"no-store"}});
    const {data:log,error}=await supabase.from("logs").insert({project_id:record.id,revision_id:delivery.revision_id,platform:record.platform,source:"upload",file_name:fileName,status:"awaiting_upload",gear:Number.isFinite(Number(body.gear))?Number(body.gear):null,fuel:record.fuelTarget||record.fuel_target||null}).select("id,revision_id,status,file_name,platform,fuel,created_at").single();
    if(error)throw new Error(`Unable to prepare customer log upload: ${error.message}`);
    await supabase.from("events").upsert({project_id:record.id,customer_id:record.customerId||null,vehicle_id:record.vehicleId||null,event_type:"log.upload.prepared",actor_type:"customer",actor_id:auth.principal.displayName||auth.principal.email||"Customer",visibility:"both",payload:{logId:log.id,revisionId:delivery.revision_id,fileName},idempotency_key:`log-upload-prepared:${log.id}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
    return Response.json({ok:true,data:{dryRun:false,replayed:false,logId:log.id,revisionId:log.revision_id,status:log.status,fileName:log.file_name}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({ok:false,error:error.message},{status:400,headers:{"Cache-Control":"no-store"}})}
}

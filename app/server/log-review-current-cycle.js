import { getDataMode } from "./env";
import { compareLogMetrics, getLogReviewWorkspace, listLogReviewQueue } from "./log-review-workflow";
import { getProjectById } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

function analysisFromLog(log){
  const summary=log.analysis_summary||{};
  return {fileName:log.file_name,platform:log.platform,parserVersion:log.parser_version,confidence:Number(log.parser_confidence)||0,metrics:log.metrics||summary.metrics||{},flags:log.flags||summary.flags||[],missingRequired:summary.missingRequired||[],summary:{headline:summary.headline||"Parsed log awaiting tuner review",note:summary.note||"Parser output is assistive only."}};
}

export async function listCurrentCycleLogReviewQueue({limit=40}={}){
  if(getDataMode()!=="supabase")return listLogReviewQueue({limit});
  const supabase=getSupabaseServerClient();
  const {data:rawLogs,error}=await supabase.from("logs").select("id,project_id,cycle_id,revision_id,platform,status,file_name,parser_confidence,flags,uploaded_at").in("status",["needs_review","ready"]).order("uploaded_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||40,100)));
  if(error)throw new Error(`Unable to load log review queue: ${error.message}`);
  if(!rawLogs?.length)return [];
  const projectIds=[...new Set(rawLogs.map(x=>x.project_id))];
  const {data:projects,error:projectError}=await supabase.from("tune_projects").select("id,project_number,customer_id,vehicle_id,platform,fuel_target,current_revision_number,current_cycle_id,waiting_on,next_action").in("id",projectIds);
  if(projectError)throw new Error(`Unable to load review projects: ${projectError.message}`);
  const byProject=Object.fromEntries((projects||[]).map(row=>[row.id,row]));
  const logs=rawLogs.filter(log=>{const project=byProject[log.project_id];return project&&(!project.current_cycle_id||log.cycle_id===project.current_cycle_id)});
  if(!logs.length)return [];
  const customerIds=[...new Set(logs.map(x=>byProject[x.project_id]?.customer_id).filter(Boolean))];
  const vehicleIds=[...new Set(logs.map(x=>byProject[x.project_id]?.vehicle_id).filter(Boolean))];
  const revisionIds=[...new Set(logs.map(x=>x.revision_id).filter(Boolean))];
  const [{data:customers},{data:vehicles},{data:revisions}]=await Promise.all([
    customerIds.length?supabase.from("customers").select("id,first_name,last_name,email").in("id",customerIds):Promise.resolve({data:[]}),
    vehicleIds.length?supabase.from("vehicles").select("id,year,make,model,engine,chassis").in("id",vehicleIds):Promise.resolve({data:[]}),
    revisionIds.length?supabase.from("revisions").select("id,revision_number,cycle_id").in("id",revisionIds):Promise.resolve({data:[]}),
  ]);
  const byCustomer=Object.fromEntries((customers||[]).map(x=>[x.id,x]));
  const byVehicle=Object.fromEntries((vehicles||[]).map(x=>[x.id,x]));
  const byRevision=Object.fromEntries((revisions||[]).map(x=>[x.id,x]));
  return logs.map(log=>{const p=byProject[log.project_id]||{},c=byCustomer[p.customer_id]||{},v=byVehicle[p.vehicle_id]||{};return {id:log.id,projectNumber:p.project_number,customer:[c.first_name,c.last_name].filter(Boolean).join(" ")||c.email||"Customer",vehicle:[v.year,v.make,v.model].filter(Boolean).join(" "),engine:v.engine,platform:log.platform||p.platform,revisionNumber:byRevision[log.revision_id]?.revision_number||p.current_revision_number,fileName:log.file_name,status:log.status,confidence:log.parser_confidence,flags:Array.isArray(log.flags)?log.flags.length:0,waitingOn:p.waiting_on,uploadedAt:log.uploaded_at,cycleId:log.cycle_id}});
}

export async function getCurrentCycleLogReviewWorkspace({projectNumber="SP-1842",logId=null}={}){
  if(getDataMode()!=="supabase")return getLogReviewWorkspace({projectNumber,logId});
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  if(!project.currentCycleId)return getLogReviewWorkspace({projectNumber,logId});
  const supabase=getSupabaseServerClient();
  const {data:logs,error}=await supabase.from("logs").select("id,project_id,cycle_id,revision_id,platform,status,file_name,metrics,flags,analysis_summary,parser_confidence,parser_version,uploaded_at,reviewed_at").eq("project_id",project.id).eq("cycle_id",project.currentCycleId).order("uploaded_at",{ascending:false}).limit(25);
  if(error)throw new Error(`Unable to load current-cycle project logs: ${error.message}`);
  if(!logs?.length)return {mode:"supabase",project,primary:null,comparison:null,review:null,annotations:[],comparisonRows:[],sourceReferences:[],cycleScope:{cycleId:project.currentCycleId,automaticComparison:"current-cycle-only"}};
  const primary=(logId?logs.find(x=>x.id===logId):null)||logs.find(x=>x.status==="needs_review")||logs[0];
  if(logId&&!logs.some(x=>x.id===logId))throw new Error("Requested log is not part of the project's current tune cycle");
  const comparison=logs.find(x=>x.id!==primary.id&&x.metrics&&Object.keys(x.metrics).length)||null;
  const [{data:review,error:reviewError},{data:sources,error:sourceError}]=await Promise.all([
    supabase.from("log_review_sessions").select("*").eq("primary_log_id",primary.id).maybeSingle(),
    supabase.from("external_log_sources").select("id,provider,external_url,external_id,status,linked_log_id,metadata,created_at").eq("project_id",project.id).order("created_at",{ascending:false}).limit(20),
  ]);
  if(reviewError)throw new Error(`Unable to load log review: ${reviewError.message}`);
  if(sourceError)throw new Error(`Unable to load external log references: ${sourceError.message}`);
  let annotations=[];
  if(review?.id){const {data,error:annotationError}=await supabase.from("log_annotations").select("*").eq("review_id",review.id).order("created_at",{ascending:true});if(annotationError)throw new Error(`Unable to load log annotations: ${annotationError.message}`);annotations=data||[]}
  const revById=Object.fromEntries((project.revisions||[]).map(row=>[row.id,row.revisionNumber??row.revision_number??row.number]));
  const primaryView={...primary,revisionNumber:revById[primary.revision_id]??project.currentRevisionNumber,analysis:analysisFromLog(primary)};
  const comparisonView=comparison?{...comparison,revisionNumber:revById[comparison.revision_id]??null,analysis:analysisFromLog(comparison)}:null;
  const cycleLogIds=new Set(logs.map(x=>x.id));
  const scopedSources=(sources||[]).filter(source=>!source.linked_log_id||cycleLogIds.has(source.linked_log_id));
  return {mode:"supabase",project,primary:primaryView,comparison:comparisonView,review:review||null,annotations,comparisonRows:compareLogMetrics(primaryView.analysis.metrics,comparisonView?.analysis?.metrics||{}),sourceReferences:scopedSources,cycleScope:{cycleId:project.currentCycleId,automaticComparison:"current-cycle-only"}};
}

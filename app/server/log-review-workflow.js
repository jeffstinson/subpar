import { getDataMode, mutationsEnabled } from "./env";
import { analyzeLogCsv, demoMhdCsv } from "./log-intelligence";
import { getProjectById } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

const METRICS=[
  ["boostActualMaxPsi","Peak boost","psi"],
  ["boostErrorMaxAbsPsi","Peak boost error","psi"],
  ["lambdaAvgWot","WOT lambda",""],
  ["hpfpMinPsi","HPFP minimum","psi"],
  ["lpfpMinPsi","LPFP minimum","psi"],
  ["iatPeakF","IAT peak","°F"],
  ["wgdcPeakPct","WGDC peak","%"],
  ["timingCorrectionMaxAbsDeg","Worst timing correction","°"],
  ["throttleClosureCount","Throttle closure rows",""],
  ["ethanolAvgPct","Ethanol average","%"],
];

function n(value){const x=Number(value);return Number.isFinite(x)?x:null}
function round(value,digits=2){if(!Number.isFinite(value))return null;const p=10**digits;return Math.round(value*p)/p}

export function compareLogMetrics(current={},previous={}){
  return METRICS.map(([key,label,unit])=>{
    const a=n(previous?.[key]),b=n(current?.[key]);
    return {key,label,unit,previous:a,current:b,delta:a===null||b===null?null:round(b-a,key.includes("Count")?0:2)};
  });
}

function demoPreviousCsv(){
  const lines=demoMhdCsv().split("\n");
  return lines.map((line,index)=>{
    if(index===0)return line;
    const cols=line.split(",");
    cols[2]=(Number(cols[2])-.55).toFixed(2);
    cols[6]=(Number(cols[6])+3.5).toFixed(1);
    if(index===20)cols[3]="67";
    if(index===24)cols[12]="-4.2";
    return cols.join(",");
  }).join("\n");
}

async function demoWorkspace(){
  const [current,previous]=await Promise.all([
    analyzeLogCsv({csvText:demoMhdCsv(),platform:"MHD",engine:"B58TU",fileName:"rev4_pull_02.csv"}),
    analyzeLogCsv({csvText:demoPreviousCsv(),platform:"MHD",engine:"B58TU",fileName:"rev3_pull_02.csv"}),
  ]);
  return {
    mode:"demo",
    project:{id:"proj_sp1842",projectNumber:"SP-1842",customer:{name:"Alex Rivera",email:"alex.rivera@gmail.com"},vehicle:{year:2021,make:"BMW",model:"M340i",chassis:"G20",engine:"B58TU"},platform:"MHD",fuelTarget:"E40",currentRevisionNumber:4,waitingOn:"tuner",nextAction:"Review new logs"},
    primary:{id:"demo_log_rev4",revisionNumber:4,fileName:current.fileName,status:"needs_review",parserConfidence:current.confidence,analysis:current,uploadedAt:new Date().toISOString()},
    comparison:{id:"demo_log_rev3",revisionNumber:3,fileName:previous.fileName,status:"reviewed",parserConfidence:previous.confidence,analysis:previous,uploadedAt:"2026-09-11T16:00:00Z"},
    review:null,
    annotations:[{id:"demo_annotation",metricKey:"timingCorrectionMaxAbsDeg",rpm:5700,severity:"watch",note:"Small correction region to inspect against the cleaner second pull.",createdBy:"Doug Talmadge"}],
    comparisonRows:compareLogMetrics(current.metrics,previous.metrics),
    sourceReferences:[{id:"demo_datazap",provider:"datazap",externalUrl:"https://datazap.me/demo-subpar-log",status:"reference_only"}],
  };
}

export async function listLogReviewQueue({limit=40}={}){
  if(getDataMode()!=="supabase")return [
    {id:"demo_log_rev4",projectNumber:"SP-1842",customer:"Alex Rivera",vehicle:"2021 BMW M340i",engine:"B58TU",platform:"MHD",revisionNumber:4,fileName:"rev4_pull_02.csv",status:"needs_review",confidence:100,flags:2,waitingOn:"tuner",uploadedAt:new Date().toISOString()},
    {id:"demo_brandon",projectNumber:"SP-1822",customer:"Brandon Cole",vehicle:"2023 BMW X3 M40i",engine:"B58TU",platform:"MHD",revisionNumber:3,fileName:"rev3_pull.csv",status:"needs_review",confidence:94,flags:1,waitingOn:"tuner",uploadedAt:"2026-09-14T15:35:00Z"},
  ];
  const supabase=getSupabaseServerClient();
  const {data:logs,error}=await supabase.from("logs").select("id,project_id,revision_id,platform,status,file_name,parser_confidence,flags,uploaded_at").in("status",["needs_review","ready"]).order("uploaded_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||40,100)));
  if(error)throw new Error(`Unable to load log review queue: ${error.message}`);
  if(!logs?.length)return [];
  const projectIds=[...new Set(logs.map(x=>x.project_id))];
  const revisionIds=[...new Set(logs.map(x=>x.revision_id).filter(Boolean))];
  const {data:projects,error:projectError}=await supabase.from("tune_projects").select("id,project_number,customer_id,vehicle_id,platform,fuel_target,current_revision_number,waiting_on,next_action").in("id",projectIds);
  if(projectError)throw new Error(`Unable to load review projects: ${projectError.message}`);
  const customerIds=[...new Set((projects||[]).map(x=>x.customer_id))],vehicleIds=[...new Set((projects||[]).map(x=>x.vehicle_id))];
  const [{data:customers},{data:vehicles},{data:revisions}]=await Promise.all([
    supabase.from("customers").select("id,first_name,last_name,email").in("id",customerIds),
    supabase.from("vehicles").select("id,year,make,model,engine,chassis").in("id",vehicleIds),
    revisionIds.length?supabase.from("revisions").select("id,revision_number").in("id",revisionIds):Promise.resolve({data:[]}),
  ]);
  const byProject=Object.fromEntries((projects||[]).map(x=>[x.id,x])),byCustomer=Object.fromEntries((customers||[]).map(x=>[x.id,x])),byVehicle=Object.fromEntries((vehicles||[]).map(x=>[x.id,x])),byRevision=Object.fromEntries((revisions||[]).map(x=>[x.id,x]));
  return logs.map(log=>{const p=byProject[log.project_id]||{},c=byCustomer[p.customer_id]||{},v=byVehicle[p.vehicle_id]||{};return {id:log.id,projectNumber:p.project_number,customer:[c.first_name,c.last_name].filter(Boolean).join(" ")||c.email||"Customer",vehicle:[v.year,v.make,v.model].filter(Boolean).join(" "),engine:v.engine,platform:log.platform||p.platform,revisionNumber:byRevision[log.revision_id]?.revision_number||p.current_revision_number,fileName:log.file_name,status:log.status,confidence:log.parser_confidence,flags:Array.isArray(log.flags)?log.flags.length:0,waitingOn:p.waiting_on,uploadedAt:log.uploaded_at}});
}

function analysisFromLog(log){
  const summary=log.analysis_summary||{};
  return {fileName:log.file_name,platform:log.platform,parserVersion:log.parser_version,confidence:Number(log.parser_confidence)||0,metrics:log.metrics||summary.metrics||{},flags:log.flags||summary.flags||[],missingRequired:summary.missingRequired||[],summary:{headline:summary.headline||"Parsed log awaiting tuner review",note:summary.note||"Parser output is assistive only."}};
}

export async function getLogReviewWorkspace({projectNumber="SP-1842",logId=null}={}){
  if(getDataMode()!=="supabase")return demoWorkspace();
  const supabase=getSupabaseServerClient();
  const project=await getProjectById(projectNumber);
  if(!project)throw new Error("Project not found");
  let query=supabase.from("logs").select("id,project_id,revision_id,platform,status,file_name,metrics,flags,analysis_summary,parser_confidence,parser_version,uploaded_at,reviewed_at").eq("project_id",project.id).order("uploaded_at",{ascending:false}).limit(25);
  const {data:logs,error}=await query;
  if(error)throw new Error(`Unable to load project logs: ${error.message}`);
  if(!logs?.length)return {mode:"supabase",project,primary:null,comparison:null,review:null,annotations:[],comparisonRows:[],sourceReferences:[]};
  const primary=logs.find(x=>x.id===logId)||logs.find(x=>x.status==="needs_review")||logs[0];
  const comparison=logs.find(x=>x.id!==primary.id&&x.metrics&&Object.keys(x.metrics).length)||null;
  const [{data:review},{data:sources}]=await Promise.all([
    supabase.from("log_review_sessions").select("*").eq("primary_log_id",primary.id).maybeSingle(),
    supabase.from("external_log_sources").select("id,provider,external_url,external_id,status,linked_log_id,metadata,created_at").eq("project_id",project.id).order("created_at",{ascending:false}).limit(20),
  ]);
  let annotations=[];
  if(review?.id){const {data}=await supabase.from("log_annotations").select("*").eq("review_id",review.id).order("created_at",{ascending:true});annotations=data||[]}
  const primaryView={...primary,revisionNumber:project.currentRevisionNumber,analysis:analysisFromLog(primary)};
  const comparisonView=comparison?{...comparison,analysis:analysisFromLog(comparison)}:null;
  return {mode:"supabase",project,primary:primaryView,comparison:comparisonView,review:review||null,annotations,comparisonRows:compareLogMetrics(primaryView.analysis.metrics,comparisonView?.analysis?.metrics||{}),sourceReferences:sources||[]};
}

function assertPersistentReview(){
  if(getDataMode()!=="supabase")return null;
  if(!mutationsEnabled())throw new Error("Persistent log review requires SUBPAR_MUTATIONS_ENABLED=true");
  return getSupabaseServerClient();
}

export async function saveLogReviewDecision({projectNumber,primaryLogId,comparisonLogId=null,decision,note="",customerSummary="",actor="Doug Talmadge"}){
  const allowed=new Set(["create_revision","request_relog","complete","hold"]);
  if(!allowed.has(decision))throw new Error("decision must be create_revision, request_relog, complete, or hold");
  if(getDataMode()!=="supabase")return {dryRun:true,decision,projectNumber,primaryLogId,effect:decision==="create_revision"?"Would create the next draft revision":decision==="request_relog"?"Would move project to waiting on customer":decision==="complete"?"Would move project to final delivery":"Would hold for tuner review"};
  const supabase=assertPersistentReview();
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const {data:primary,error:logError}=await supabase.from("logs").select("id,project_id,revision_id,analysis_summary,metrics,flags,parser_confidence,parser_version").eq("id",primaryLogId).single();
  if(logError||primary.project_id!==project.id)throw new Error("Primary log does not belong to this project");
  const now=new Date().toISOString();
  const snapshot={metrics:primary.metrics||{},flags:primary.flags||[],analysisSummary:primary.analysis_summary||{},parserConfidence:primary.parser_confidence,parserVersion:primary.parser_version};
  let comparisonSnapshot={};
  if(comparisonLogId){const {data:other}=await supabase.from("logs").select("id,project_id,metrics,flags,analysis_summary,parser_confidence,parser_version").eq("id",comparisonLogId).maybeSingle();if(other?.project_id===project.id)comparisonSnapshot={metrics:other.metrics||{},flags:other.flags||[],analysisSummary:other.analysis_summary||{},parserConfidence:other.parser_confidence,parserVersion:other.parser_version}}
  const {data:review,error:reviewError}=await supabase.from("log_review_sessions").upsert({project_id:project.id,revision_id:primary.revision_id,primary_log_id:primaryLogId,comparison_log_id:comparisonLogId,status:"decisioned",decision,tuner_note:note||null,customer_summary:customerSummary||null,parser_snapshot:snapshot,comparison_snapshot:comparisonSnapshot,reviewed_by:actor,reviewed_at:now,updated_at:now},{onConflict:"primary_log_id"}).select("*").single();
  if(reviewError)throw new Error(`Unable to save log review: ${reviewError.message}`);
  await supabase.from("logs").update({status:"reviewed",reviewed_at:now}).eq("id",primaryLogId);
  let createdRevision=null;
  if(decision==="create_revision"){
    const next=(Number(project.currentRevisionNumber)||0)+1;
    const {data,error}=await supabase.from("revisions").upsert({project_id:project.id,revision_number:next,status:"draft",fuel_target:project.fuelTarget||null,base_revision_id:primary.revision_id||null,internal_notes:note||"Created from datalog review",updated_at:now},{onConflict:"project_id,revision_number"}).select("id,revision_number,status").single();
    if(error)throw new Error(`Review saved but next revision could not be staged: ${error.message}`);
    createdRevision=data;
    await supabase.from("tune_projects").update({current_revision_number:Math.max(next,Number(project.currentRevisionNumber)||0),status:"revision_in_progress",stage:"revision",waiting_on:"tuner",next_action:`Prepare Rev ${next}`,updated_at:now}).eq("id",project.id);
  }else if(decision==="request_relog"){
    await supabase.from("tune_projects").update({status:"waiting_customer",stage:"datalog_review",waiting_on:"customer",next_action:"Customer uploads another approved log",updated_at:now}).eq("id",project.id);
  }else if(decision==="complete"){
    await supabase.from("tune_projects").update({status:"ready_to_deliver",stage:"final_delivery",waiting_on:"none",next_action:"Final QA and customer delivery",updated_at:now}).eq("id",project.id);
  }else{
    await supabase.from("tune_projects").update({status:"log_review",stage:"datalog_review",waiting_on:"tuner",next_action:"Manual tuner review / hold",updated_at:now}).eq("id",project.id);
  }
  await supabase.from("events").upsert({project_id:project.id,customer_id:project.customerId||null,vehicle_id:project.vehicleId||null,event_type:"log.review.decision",actor_type:"internal",actor_id:actor,visibility:"internal",payload:{reviewId:review.id,primaryLogId,comparisonLogId,decision,createdRevisionNumber:createdRevision?.revision_number||null},idempotency_key:`log-review:${primaryLogId}:${decision}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return {dryRun:false,review,createdRevision};
}

export async function addLogAnnotation({projectNumber,primaryLogId,metricKey=null,rpm=null,severity="note",note,actor="Doug Talmadge"}){
  if(!note?.trim())throw new Error("Annotation note is required");
  if(getDataMode()!=="supabase")return {dryRun:true,id:`demo_annotation_${Date.now()}`,metricKey,rpm,severity,note,createdBy:actor};
  const supabase=assertPersistentReview();const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const {data:log}=await supabase.from("logs").select("id,project_id,revision_id,metrics,flags,analysis_summary,parser_confidence,parser_version").eq("id",primaryLogId).single();if(!log||log.project_id!==project.id)throw new Error("Log does not belong to project");
  const {data:review,error:reviewError}=await supabase.from("log_review_sessions").upsert({project_id:project.id,revision_id:log.revision_id,primary_log_id:log.id,status:"open",decision:"pending",parser_snapshot:{metrics:log.metrics||{},flags:log.flags||[],analysisSummary:log.analysis_summary||{},parserConfidence:log.parser_confidence,parserVersion:log.parser_version},updated_at:new Date().toISOString()},{onConflict:"primary_log_id"}).select("id").single();
  if(reviewError)throw new Error(`Unable to open review session: ${reviewError.message}`);
  const {data,error}=await supabase.from("log_annotations").insert({review_id:review.id,log_id:log.id,metric_key:metricKey,rpm:Number.isFinite(Number(rpm))?Number(rpm):null,severity,note:note.trim(),created_by:actor}).select("*").single();
  if(error)throw new Error(`Unable to save annotation: ${error.message}`);return data;
}

export function normalizeDatazapUrl(value){
  let url;try{url=new URL(String(value||"").trim())}catch{throw new Error("Enter a valid Datazap URL")}
  if(url.protocol!=="https:")throw new Error("Datazap URL must use HTTPS");
  if(!new Set(["datazap.me","www.datazap.me"]).has(url.hostname.toLowerCase()))throw new Error("Only datazap.me links are accepted here");
  url.hash="";url.search="";url.hostname="datazap.me";
  const path=url.pathname.replace(/\/+$/g,"")||"/";
  const externalId=path.split("/").filter(Boolean).pop()||null;
  return {url:`https://datazap.me${path}`,externalId};
}

export async function stageDatazapReference({projectNumber,url,revisionId=null,actor="Doug Talmadge"}){
  const normalized=normalizeDatazapUrl(url);
  if(getDataMode()!=="supabase")return {dryRun:true,provider:"datazap",externalUrl:normalized.url,externalId:normalized.externalId,status:"reference_only",note:"Demo mode links the reference only. Numeric analysis still requires a verified CSV/private file."};
  const supabase=assertPersistentReview();const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const {data,error}=await supabase.from("external_log_sources").upsert({project_id:project.id,revision_id:revisionId,provider:"datazap",external_url:normalized.url,external_id:normalized.externalId,status:"reference_only",metadata:{hydration:"verified-file-required",note:"No undocumented Datazap scraping is assumed."},created_by:actor,updated_at:new Date().toISOString()},{onConflict:"provider,external_url"}).select("*").single();
  if(error)throw new Error(`Unable to register Datazap reference: ${error.message}`);
  await supabase.from("events").upsert({project_id:project.id,customer_id:project.customerId||null,vehicle_id:project.vehicleId||null,event_type:"log.external_source.linked",actor_type:"internal",actor_id:actor,visibility:"internal",payload:{provider:"datazap",externalSourceId:data.id,url:normalized.url},idempotency_key:`external-log:datazap:${data.id}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return {...data,dryRun:false};
}

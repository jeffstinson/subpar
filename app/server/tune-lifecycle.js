import crypto from "node:crypto";
import { getDataMode, mutationsEnabled } from "./env";
import { queueGmailDraft, cancelGmailDraft } from "./gmail-outbound";
import { getProjectById } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

const completedRequirementStates=new Set(["complete","waived"]);
const unresolvedLogStates=new Set(["awaiting_upload","uploaded","parsing","ready","needs_review","error"]);

function revNumber(row){return Number(row?.revisionNumber??row?.revision_number??row?.number??0)||0}
function rowCycleId(row){return row?.cycleId||row?.cycle_id||null}
function fileName(row){return row?.originalName||row?.original_name||row?.name||"File"}
function vehicleLabel(project){return [project?.vehicle?.year,project?.vehicle?.make,project?.vehicle?.model].filter(Boolean).join(" ")||"Vehicle"}
function customerFirst(project){return String(project?.customer?.name||project?.customer?.email||"there").split(" ")[0]||"there"}
function iso(value){return value?new Date(value).toISOString():null}

function demoWorkspace(projectNumber="SP-1842"){
  const now=new Date().toISOString();
  const project={id:"proj_sp1842",projectNumber,customerId:"cus_alex-rivera",vehicleId:"veh_alex-m340i",customer:{name:"Alex Rivera",email:"alex.rivera@gmail.com"},vehicle:{year:2021,make:"BMW",model:"M340i",chassis:"G20",engine:"B58TU",transmission:"ZF8"},platform:"MHD",fuelTarget:"E40",status:"ready_to_deliver",stage:"final_delivery",waitingOn:"tuner",currentRevisionNumber:5,currentCycleId:"demo_cycle_1",metadata:{intelligenceProfileKey:"g20-b58tu-mhd",hardware:{turbo:"Stock",fuelSystem:"Stock HPFP",downpipe:"Upgraded",ethanolSensor:"Flex fuel"}}};
  const cycle={id:"demo_cycle_1",project_id:project.id,cycleNumber:1,status:"closing",reason:"initial",fuelTarget:"E40",startedAt:"2026-09-05T12:00:00Z",completedAt:null};
  const finalRevision={id:"demo_rev5",cycleId:cycle.id,revisionNumber:5,status:"delivered",fuelTarget:"E40",customerSummary:"Your E40 calibration is complete. Rev 5 preserved the strong response from Rev 4 while cleaning up the small high-RPM timing correction."};
  const finalFile={id:"demo_rev5_file",cycleId:cycle.id,revisionId:finalRevision.id,kind:"tune_revision",originalName:"alex_m340i_final_e40.bin",visibility:"customer",immutable:true,sizeBytes:524288,sha256:"demo-final-rev5-sha256"};
  const finalDelivery={id:"demo_delivery_rev5",cycleId:cycle.id,revision_id:finalRevision.id,primary_file_id:finalFile.id,status:"acknowledged",next_step:"complete",installed_at:now,delivered_at:now,file_sha256:finalFile.sha256};
  const requirements=[{id:"req_flash",cycleId:cycle.id,label:"DME / ROM flash eligibility",status:"complete",required:true},{id:"req_logging",cycleId:cycle.id,label:"MHD logging setup",status:"complete",required:true}];
  const logs=[{id:"log4",cycleId:cycle.id,status:"reviewed",fileName:"rev4_pull.csv"},{id:"log5",cycleId:cycle.id,status:"reviewed",fileName:"rev5_final_pull.csv"}];
  const files=[finalFile,{id:"stock1",cycleId:cycle.id,kind:"stock_file",originalName:"alex_stock_read.bin",visibility:"internal",immutable:true},{id:"pack1",cycleId:cycle.id,kind:"parameter_pack",originalName:"B58TU_MHD_logging_pack.pdf",visibility:"customer",immutable:true}];
  const summary=finalRevision.customerSummary;
  const aftercare="If you change fuel, turbo, HPFP, downpipe, injectors or other major hardware, contact Subpar before continuing to use this calibration. Your final revision and historical files stay attached to this vehicle.";
  const packageManifest=buildPackageManifest({finalFile,files,summary,aftercare});
  const baselineSnapshot=buildBaselineSnapshot(project,cycle,finalRevision);
  const gates=evaluateCloseoutGates({project,cycle,finalRevision,finalFile,finalDelivery,requirements,logs,customerSummary:summary,aftercareNotes:aftercare});
  return {mode:"demo",project,cycle,cycles:[cycle],finalRevision,finalFile,finalDelivery,requirements,logs,files,closeout:{id:"demo_closeout_1",cycleId:cycle.id,status:"draft",customerSummary:summary,aftercareNotes:aftercare,followupDays:7,baselineSnapshot,packageManifest,qaSnapshot:{},finalFileSha256:null},followup:null,gates,packageManifest,baselineSnapshot,history:{revisionCount:5,logCount:8,fileCount:files.length},outbound:null};
}

export function buildBaselineSnapshot(project,cycle,finalRevision){
  return {
    capturedAt:new Date().toISOString(),
    projectNumber:project?.projectNumber||project?.project_number||null,
    cycleNumber:Number(cycle?.cycleNumber??cycle?.cycle_number??1),
    finalRevisionNumber:revNumber(finalRevision),
    platform:project?.platform||null,
    fuelTarget:finalRevision?.fuelTarget||finalRevision?.fuel_target||project?.fuelTarget||project?.fuel_target||null,
    vehicle:project?.vehicle?{
      id:project.vehicle.id||null,
      year:project.vehicle.year||null,
      make:project.vehicle.make||null,
      model:project.vehicle.model||null,
      chassis:project.vehicle.chassis||null,
      engine:project.vehicle.engine||null,
      transmission:project.vehicle.transmission||null,
      vin:project.vehicle.vin||null,
    }:null,
    hardware:project?.metadata?.hardware||project?.metadata?.mods||project?.vehicle?.metadata?.hardware||{},
    intelligenceProfileKey:project?.metadata?.intelligenceProfileKey||project?.metadata?.intelligence_profile_key||null,
  };
}

export function buildPackageManifest({finalFile,files=[],summary="",aftercare=""}){
  const stock=files.filter(file=>file.kind==="stock_file").map(file=>({id:file.id,name:fileName(file),customerVisible:file.visibility==="customer"}));
  const packs=files.filter(file=>file.kind==="parameter_pack"&&file.visibility==="customer").map(file=>({id:file.id,name:fileName(file),customerVisible:true}));
  return {
    generatedAt:new Date().toISOString(),
    finalTune:finalFile?{id:finalFile.id,name:fileName(finalFile),sha256:finalFile.sha256||null,customerVisible:finalFile.visibility==="customer"}:null,
    stockFiles:stock,
    parameterPacks:packs,
    completionSummary:Boolean(String(summary||"").trim()),
    aftercare:Boolean(String(aftercare||"").trim()),
    deliveryMode:"secure-portal-individual-files",
  };
}

export function evaluateCloseoutGates({project,cycle,finalRevision,finalFile,finalDelivery,requirements=[],logs=[],customerSummary="",aftercareNotes=""}){
  const cycleId=cycle?.id||null;
  const cycleRequirements=requirements.filter(item=>!cycleId||!rowCycleId(item)||rowCycleId(item)===cycleId);
  const required=cycleRequirements.filter(item=>item.required!==false);
  const unresolvedRequirements=required.filter(item=>!completedRequirementStates.has(String(item.status||"").toLowerCase()));
  const cycleLogs=logs.filter(item=>!cycleId||!rowCycleId(item)||rowCycleId(item)===cycleId);
  const unresolvedLogs=cycleLogs.filter(item=>unresolvedLogStates.has(String(item.status||"").toLowerCase()));
  const deliveredStatus=String(finalRevision?.status||"").toLowerCase();
  const installed=Boolean(finalDelivery?.installed_at||finalDelivery?.installedAt);
  const gates=[
    {key:"cycle",label:"Active tune cycle",pass:Boolean(cycle?.id),detail:cycle?`Cycle ${cycle.cycleNumber??cycle.cycle_number} · ${cycle.status}`:"No tune cycle is attached to this project."},
    {key:"revision",label:"Final delivered revision",pass:Boolean(finalRevision?.id&&new Set(["delivered","final"]).has(deliveredStatus)),detail:finalRevision?`Rev ${revNumber(finalRevision)} · ${finalRevision.status}`:"No final revision found."},
    {key:"file",label:"Final tune artifact",pass:Boolean(finalFile?.id&&finalFile.kind==="tune_revision"),detail:finalFile?fileName(finalFile):"No final tune file is attached."},
    {key:"visible",label:"Customer-secure final file",pass:Boolean(finalFile?.id&&finalFile.visibility==="customer"),detail:finalFile?`Visibility: ${finalFile.visibility||"internal"}.`:"No final tune file."},
    {key:"immutable",label:"Immutable final artifact",pass:Boolean(finalFile?.id&&finalFile.immutable!==false&&finalFile.sha256),detail:finalFile?.sha256?`SHA-256 registered · ${String(finalFile.sha256).slice(0,14)}…`:"Final artifact must have an immutable SHA-256."},
    {key:"install",label:"Final install acknowledged",pass:installed,detail:installed?`Installed ${iso(finalDelivery.installed_at||finalDelivery.installedAt)}`:"Customer install acknowledgement is still required."},
    {key:"logs",label:"No unresolved datalogs",pass:unresolvedLogs.length===0,detail:unresolvedLogs.length?`${unresolvedLogs.length} log(s) still need parser/review attention.`:"All cycle datalogs are resolved."},
    {key:"requirements",label:"Required prerequisites complete",pass:unresolvedRequirements.length===0,detail:unresolvedRequirements.length?`${unresolvedRequirements.length} required item(s) remain open.`:"Required cycle prerequisites are complete."},
    {key:"summary",label:"Customer completion summary",pass:Boolean(String(customerSummary||"").trim()),detail:"A customer-safe completion summary is required."},
    {key:"aftercare",label:"Aftercare / change guidance",pass:Boolean(String(aftercareNotes||"").trim()),detail:"Hardware/fuel-change guidance is required before archive."},
  ];
  return {pass:gates.every(g=>g.pass),passed:gates.filter(g=>g.pass).length,total:gates.length,gates,unresolvedLogs:unresolvedLogs.map(x=>({id:x.id,status:x.status,fileName:x.fileName||x.file_name||null})),unresolvedRequirements:unresolvedRequirements.map(x=>({id:x.id,label:x.label,status:x.status}))};
}

async function hashStoredFile(supabase,file){
  if(!file?.storageBucket&&!file?.storage_bucket)return file?.sha256||null;
  const bucket=file.storageBucket||file.storage_bucket,path=file.storagePath||file.storage_path;
  const {data,error}=await supabase.storage.from(bucket).download(path);
  if(error)throw new Error(`Unable to read final tune artifact: ${error.message}`);
  const buffer=Buffer.from(await data.arrayBuffer());
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function mapCloseout(row){
  if(!row)return null;
  return {...row,cycleId:row.cycle_id,finalRevisionId:row.final_revision_id,finalFileId:row.final_file_id,finalDeliveryId:row.final_delivery_id,outboundActionId:row.outbound_action_id,customerSummary:row.customer_summary,aftercareNotes:row.aftercare_notes,baselineSnapshot:row.baseline_snapshot||{},packageManifest:row.package_manifest||{},qaSnapshot:row.qa_snapshot||{},finalFileSha256:row.final_file_sha256,followupDays:row.followup_days,approvedBy:row.approved_by,approvedAt:row.approved_at,closedBy:row.closed_by,closedAt:row.closed_at};
}
function mapCycle(row){return row?{...row,cycleNumber:row.cycle_number,changeSummary:row.change_summary,hardwareSnapshot:row.hardware_snapshot||{},fuelTarget:row.fuel_target,reopenedFromCycleId:row.reopened_from_cycle_id,startedAt:row.started_at,completedAt:row.completed_at}:null}
function mapFollowup(row){return row?{...row,closeoutId:row.closeout_id,projectId:row.project_id,cycleId:row.cycle_id,customerId:row.customer_id,dueAt:row.due_at,outboundActionId:row.outbound_action_id,lastError:row.last_error,draftedAt:row.drafted_at,sentAt:row.sent_at}:null}

export async function getLifecycleWorkspace({projectNumber="SP-1842"}={}){
  if(getDataMode()!=="supabase")return demoWorkspace(projectNumber);
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const supabase=getSupabaseServerClient();
  const {data:cycleRows,error:cycleError}=await supabase.from("tune_cycles").select("*").eq("project_id",project.id).order("cycle_number",{ascending:false});
  if(cycleError)throw new Error(`Unable to load tune cycles: ${cycleError.message}`);
  const cycles=(cycleRows||[]).map(mapCycle);
  const cycle=cycles.find(x=>x.id===project.currentCycleId)||cycles[0]||null;
  const cycleId=cycle?.id||null;
  const revisions=(project.revisions||[]).filter(row=>!cycleId||!rowCycleId(row)||rowCycleId(row)===cycleId);
  const logs=(project.logs||[]).filter(row=>!cycleId||!rowCycleId(row)||rowCycleId(row)===cycleId);
  const files=(project.files||[]).filter(row=>!cycleId||!rowCycleId(row)||rowCycleId(row)===cycleId);
  const requirements=(project.requirements||[]).filter(row=>!cycleId||!rowCycleId(row)||rowCycleId(row)===cycleId);
  const finalRevision=[...revisions].filter(row=>new Set(["delivered","final"]).has(String(row.status||"").toLowerCase())).sort((a,b)=>revNumber(b)-revNumber(a))[0]||[...revisions].sort((a,b)=>revNumber(b)-revNumber(a))[0]||null;
  let finalDelivery=null;
  if(finalRevision){const {data,error}=await supabase.from("revision_deliveries").select("*").eq("revision_id",finalRevision.id).maybeSingle();if(error)throw new Error(`Unable to load final delivery: ${error.message}`);finalDelivery=data||null}
  const finalFileId=finalDelivery?.primary_file_id||null;
  const finalFile=(finalFileId?files.find(row=>row.id===finalFileId):null)||[...files].filter(row=>row.kind==="tune_revision"&&(!finalRevision||row.revisionId===finalRevision.id||row.revision_id===finalRevision.id)).sort((a,b)=>String(b.createdAt||b.created_at||"").localeCompare(String(a.createdAt||a.created_at||"")))[0]||null;
  let closeout=null,followup=null,outbound=null;
  if(cycleId){
    const {data,error}=await supabase.from("project_closeouts").select("*").eq("cycle_id",cycleId).maybeSingle();if(error)throw new Error(`Unable to load closeout: ${error.message}`);closeout=mapCloseout(data);
    if(closeout){const {data:f}=await supabase.from("lifecycle_followups").select("*").eq("closeout_id",closeout.id).maybeSingle();followup=mapFollowup(f);if(followup?.outboundActionId){const {data:a}=await supabase.from("outbound_actions").select("id,status,recipient,subject,approved_by,approved_at,sent_at,provider_message_id,last_error,created_at").eq("id",followup.outboundActionId).maybeSingle();outbound=a||null}}
  }
  const summary=closeout?.customerSummary||finalRevision?.customerSummary||finalRevision?.customer_summary||"";
  const aftercare=closeout?.aftercareNotes||"If you change fuel, turbo, fuel system, exhaust, injectors or other major hardware, contact Subpar before continuing to use this calibration. Your completed cycle remains archived to this vehicle.";
  const packageManifest=closeout?.packageManifest&&Object.keys(closeout.packageManifest).length?closeout.packageManifest:buildPackageManifest({finalFile,files,summary,aftercare});
  const baselineSnapshot=closeout?.baselineSnapshot&&Object.keys(closeout.baselineSnapshot).length?closeout.baselineSnapshot:buildBaselineSnapshot(project,cycle,finalRevision);
  const gates=evaluateCloseoutGates({project,cycle,finalRevision,finalFile,finalDelivery,requirements,logs,customerSummary:summary,aftercareNotes:aftercare});
  return {mode:"supabase",project,cycle,cycles,finalRevision,finalFile,finalDelivery,requirements,logs,files,closeout,followup,outbound,gates,packageManifest,baselineSnapshot,history:{revisionCount:revisions.length,logCount:logs.length,fileCount:files.length}};
}

function assertPersistent(){if(getDataMode()!=="supabase")return null;if(!mutationsEnabled())throw new Error("Tune lifecycle writes require SUBPAR_MUTATIONS_ENABLED=true");return getSupabaseServerClient()}

async function loadPersistentContext(projectNumber){
  const workspace=await getLifecycleWorkspace({projectNumber});
  if(!workspace.project||!workspace.cycle)throw new Error("Project lifecycle is not initialized");
  if(!workspace.finalRevision||!workspace.finalFile)throw new Error("A delivered final revision and tune artifact are required for closeout");
  return workspace;
}

export async function saveCloseoutDraft({projectNumber,customerSummary,aftercareNotes,followupDays=7,actor="Doug Talmadge"}){
  if(getDataMode()!=="supabase"){const w=demoWorkspace(projectNumber);return {dryRun:true,closeout:{...w.closeout,customerSummary,aftercareNotes,followupDays,status:"draft"}}}
  const supabase=assertPersistent();const w=await loadPersistentContext(projectNumber);
  if(w.closeout&&new Set(["approved","closed"]).has(w.closeout.status))throw new Error("Approved/closed closeouts cannot be edited; start a new tune cycle for future work");
  const days=Math.max(0,Math.min(90,Number(followupDays)||0));
  const summary=String(customerSummary||w.finalRevision.customerSummary||w.finalRevision.customer_summary||"").trim();
  const aftercare=String(aftercareNotes||"").trim();
  const manifest=buildPackageManifest({finalFile:w.finalFile,files:w.files,summary,aftercare});
  const baseline=buildBaselineSnapshot(w.project,w.cycle,w.finalRevision);
  const payload={project_id:w.project.id,cycle_id:w.cycle.id,final_revision_id:w.finalRevision.id,final_file_id:w.finalFile.id,final_delivery_id:w.finalDelivery?.id||null,status:"draft",customer_summary:summary||null,aftercare_notes:aftercare||null,baseline_snapshot:baseline,package_manifest:manifest,followup_days:days,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from("project_closeouts").upsert(payload,{onConflict:"cycle_id"}).select("*").single();
  if(error)throw new Error(`Unable to save closeout draft: ${error.message}`);
  await supabase.from("tune_cycles").update({status:"closing",updated_at:new Date().toISOString()}).eq("id",w.cycle.id).eq("status","active");
  return {dryRun:false,closeout:mapCloseout(data),actor};
}

export async function runCloseoutQa({projectNumber,actor="Doug Talmadge"}){
  if(getDataMode()!=="supabase"){const w=demoWorkspace(projectNumber);return {dryRun:true,gates:w.gates,closeout:{...w.closeout,status:w.gates.pass?"qa_ready":"draft",finalFileSha256:w.finalFile.sha256}}}
  const supabase=assertPersistent();const w=await loadPersistentContext(projectNumber);
  if(w.closeout?.status==="closed")return {dryRun:false,replayed:true,gates:w.gates,closeout:w.closeout};
  if(w.closeout?.status==="approved")throw new Error("Closeout is already approved; complete it or start a new cycle after archive");
  const summary=w.closeout?.customerSummary||w.finalRevision.customerSummary||w.finalRevision.customer_summary||"";
  const aftercare=w.closeout?.aftercareNotes||"";
  const gates=evaluateCloseoutGates({...w,customerSummary:summary,aftercareNotes:aftercare});
  const observedHash=await hashStoredFile(supabase,w.finalFile);
  if(!observedHash)throw new Error("Final tune artifact hash could not be verified");
  if(w.finalFile.sha256&&String(w.finalFile.sha256).toLowerCase()!==observedHash.toLowerCase())throw new Error("Final tune artifact changed after delivery; closeout is blocked");
  const baseline=buildBaselineSnapshot(w.project,w.cycle,w.finalRevision);
  const manifest=buildPackageManifest({finalFile:{...w.finalFile,sha256:observedHash},files:w.files,summary,aftercare});
  const snapshot={evaluatedAt:new Date().toISOString(),evaluatedBy:actor,projectNumber:w.project.projectNumber,cycleNumber:w.cycle.cycleNumber,finalRevisionNumber:revNumber(w.finalRevision),finalFileId:w.finalFile.id,finalFileSha256:observedHash,gates,baselineSnapshot:baseline,packageManifest:manifest};
  const {data,error}=await supabase.from("project_closeouts").upsert({project_id:w.project.id,cycle_id:w.cycle.id,final_revision_id:w.finalRevision.id,final_file_id:w.finalFile.id,final_delivery_id:w.finalDelivery?.id||null,status:gates.pass?"qa_ready":"draft",customer_summary:summary||null,aftercare_notes:aftercare||null,baseline_snapshot:baseline,package_manifest:manifest,qa_snapshot:snapshot,final_file_sha256:observedHash,followup_days:w.closeout?.followupDays??7,updated_at:new Date().toISOString()},{onConflict:"cycle_id"}).select("*").single();
  if(error)throw new Error(`Unable to persist closeout QA: ${error.message}`);
  await supabase.from("events").upsert({project_id:w.project.id,customer_id:w.project.customerId||null,vehicle_id:w.project.vehicleId||null,cycle_id:w.cycle.id,event_type:"project.closeout.qa",actor_type:"internal",actor_id:actor,visibility:"internal",payload:{closeoutId:data.id,cycleNumber:w.cycle.cycleNumber,pass:gates.pass,finalRevisionNumber:revNumber(w.finalRevision),finalFileId:w.finalFile.id,finalFileSha256:observedHash},idempotency_key:`closeout-qa:${w.cycle.id}:${observedHash}:${gates.pass?"pass":"fail"}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return {dryRun:false,gates,closeout:mapCloseout(data)};
}

export async function approveCloseout({projectNumber,actor="Doug Talmadge"}){
  const qa=await runCloseoutQa({projectNumber,actor});if(!qa.gates.pass)throw new Error("Closeout cannot be approved until every QA gate passes");
  if(getDataMode()!=="supabase")return {...qa,dryRun:true,approved:true,closeout:{...qa.closeout,status:"approved",approvedBy:actor,approvedAt:new Date().toISOString()}};
  const supabase=assertPersistent();const now=new Date().toISOString();
  const {data,error}=await supabase.from("project_closeouts").update({status:"approved",approved_by:actor,approved_at:now,updated_at:now}).eq("id",qa.closeout.id).eq("status","qa_ready").select("*").single();
  if(error)throw new Error(`Unable to approve closeout: ${error.message}`);
  return {dryRun:false,approved:true,closeout:mapCloseout(data)};
}

function completionMail({project,closeout,cycle}){
  const url=(process.env.NEXT_PUBLIC_SUBPAR_APP_URL||"").replace(/\/$/,"");
  const archive=url?`${url}/portal/${encodeURIComponent(project.projectNumber)}/history`:null;
  return {subject:`Subpar Tuning · ${vehicleLabel(project)} tune complete`,body:`Hey ${customerFirst(project)},\n\nYour Subpar Tuning calibration is complete.\n\n${closeout.customerSummary||"Your final revision and project history are saved in your portal."}\n\n${closeout.aftercareNotes||"Contact Subpar before changing major hardware or fuel."}\n\n${archive?`Your vehicle/tune archive: ${archive}\n\n`:""}Cycle ${cycle.cycleNumber} is now archived. If you change hardware or fuel later, we can start a new tune cycle without losing any of this history.\n\n- Doug / Subpar Tuning`};
}

export async function completeCloseout({projectNumber,actor="Doug Talmadge",stageEmail=true}){
  if(getDataMode()!=="supabase"){const w=demoWorkspace(projectNumber);return {dryRun:true,closeout:{...w.closeout,status:"closed",closedBy:actor,closedAt:new Date().toISOString()},followup:{status:"scheduled",dueAt:new Date(Date.now()+7*86400000).toISOString()},emailDraft:stageEmail?{dryRun:true,status:"draft"}:null}}
  const supabase=assertPersistent();const w=await loadPersistentContext(projectNumber);const closeout=w.closeout;if(!closeout)throw new Error("Closeout draft does not exist");
  if(closeout.status==="closed")return {dryRun:false,replayed:true,closeout};
  if(closeout.status!=="approved")throw new Error("Closeout must be QA-approved before archive");
  const observedHash=await hashStoredFile(supabase,w.finalFile);if(!observedHash||String(observedHash).toLowerCase()!==String(closeout.finalFileSha256||"").toLowerCase())throw new Error("Final tune artifact changed after closeout approval. Run QA again.");
  const {data:result,error}=await supabase.rpc("subpar_close_tune_cycle",{p_closeout_id:closeout.id,p_actor:actor});if(error)throw new Error(`Unable to archive tune cycle atomically: ${error.message}`);
  let emailDraft=null,emailError=null;
  if(stageEmail){try{const mail=completionMail({project:w.project,closeout,cycle:w.cycle});emailDraft=await queueGmailDraft({projectNumber:w.project.projectNumber,to:w.project.customer?.email,subject:mail.subject,body:mail.body,requestId:`closeout-${closeout.id}`,createdBy:actor});}catch(err){emailError=err.message}}
  if(emailDraft?.id)await supabase.from("project_closeouts").update({outbound_action_id:emailDraft.id,updated_at:new Date().toISOString()}).eq("id",closeout.id);
  const {data:follow}=await supabase.from("lifecycle_followups").select("*").eq("closeout_id",closeout.id).maybeSingle();
  return {dryRun:false,replayed:Boolean(result?.replayed),result,closeout:{...closeout,status:"closed",closedBy:actor,closedAt:result?.closedAt||result?.closed_at||new Date().toISOString()},followup:mapFollowup(follow),emailDraft,emailError};
}

function followupMail({project,closeout,cycle}){
  const url=(process.env.NEXT_PUBLIC_SUBPAR_APP_URL||"").replace(/\/$/,"");
  return {subject:`Subpar Tuning · How's the ${project.vehicle?.model||"car"} feeling?`,body:`Hey ${customerFirst(project)},\n\nQuick follow-up now that your tune has been complete for a bit — how's the car feeling?\n\nIf everything is good, no action is needed. If anything changed or you have questions, reply here.\n\nOne reminder: before changing major hardware or fuel strategy, contact Subpar so we can confirm whether the current calibration still applies.${url?`\n\nYour tune history stays here: ${url}/portal/${encodeURIComponent(project.projectNumber)}/history`:""}\n\n- Doug / Subpar Tuning`};
}

export async function stageLifecycleFollowup({followupId,actor="Doug Talmadge",force=false}){
  if(getDataMode()!=="supabase")return {dryRun:true,id:followupId||"demo_followup",status:"drafted",outbound:{dryRun:true,status:"draft"}};
  const supabase=assertPersistent();
  const {data:follow,error}=await supabase.from("lifecycle_followups").select("*").eq("id",followupId).single();if(error)throw new Error(`Unable to load lifecycle follow-up: ${error.message}`);
  if(follow.status==="drafted"||follow.status==="sent")return {dryRun:false,replayed:true,followup:mapFollowup(follow)};
  if(follow.status!=="scheduled")throw new Error(`Follow-up cannot be drafted from status '${follow.status}'`);
  if(!force&&new Date(follow.due_at).getTime()>Date.now())throw new Error("Follow-up is not due yet");
  const project=await getProjectById(follow.project_id);if(!project)throw new Error("Follow-up project not found");
  const {data:co}=await supabase.from("project_closeouts").select("*").eq("id",follow.closeout_id).single();
  const {data:cy}=await supabase.from("tune_cycles").select("*").eq("id",follow.cycle_id).single();
  const mail=followupMail({project,closeout:mapCloseout(co),cycle:mapCycle(cy)});
  try{
    const outbound=await queueGmailDraft({projectNumber:project.projectNumber,to:project.customer?.email,subject:mail.subject,body:mail.body,requestId:`lifecycle-followup-${follow.id}`,createdBy:actor});
    const now=new Date().toISOString();const {data:updated,error:updateError}=await supabase.from("lifecycle_followups").update({status:"drafted",outbound_action_id:outbound.id||null,drafted_at:now,last_error:null,updated_at:now}).eq("id",follow.id).select("*").single();if(updateError)throw new Error(updateError.message);
    return {dryRun:false,followup:mapFollowup(updated),outbound};
  }catch(err){await supabase.from("lifecycle_followups").update({status:"failed",last_error:err.message,updated_at:new Date().toISOString()}).eq("id",follow.id);throw err}
}

export async function stageDueLifecycleFollowups({limit=20,actor="Subpar follow-up scheduler"}={}){
  if(process.env.SUBPAR_FOLLOWUP_AUTOMATION_ENABLED!=="true")return {enabled:false,staged:[],errors:[]};
  if(getDataMode()!=="supabase"||!mutationsEnabled())return {enabled:true,staged:[],errors:["Persistence/mutations are not enabled"]};
  const supabase=getSupabaseServerClient();const {data,error}=await supabase.from("lifecycle_followups").select("id,due_at,status").eq("status","scheduled").lte("due_at",new Date().toISOString()).order("due_at",{ascending:true}).limit(Math.max(1,Math.min(Number(limit)||20,100)));if(error)throw new Error(error.message);
  const staged=[],errors=[];for(const row of data||[]){try{staged.push(await stageLifecycleFollowup({followupId:row.id,actor,force:true}))}catch(err){errors.push({id:row.id,error:err.message})}}
  return {enabled:true,staged,errors};
}

export async function reopenTuneCycle({projectNumber,reason="hardware_change",changeSummary="",hardwareChanges={},fuelTarget=null,actor="Doug Talmadge"}){
  if(getDataMode()!=="supabase")return {dryRun:true,projectNumber,cycleNumber:2,reason,changeSummary,hardwareChanges,fuelTarget:fuelTarget||"E40",nextAction:"Review Cycle 2 hardware/fuel changes"};
  const supabase=assertPersistent();const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");if(!project.closedAt&&!project.closed_at)throw new Error("Project must be completed before starting another tune cycle");
  const {data,error}=await supabase.rpc("subpar_start_new_tune_cycle",{p_project_id:project.id,p_reason:String(reason||"retune"),p_change_summary:String(changeSummary||""),p_hardware_changes:hardwareChanges&&typeof hardwareChanges==="object"?hardwareChanges:{},p_fuel_target:fuelTarget||null,p_actor:actor});if(error)throw new Error(`Unable to start a new tune cycle: ${error.message}`);
  const {data:followups}=await supabase.from("lifecycle_followups").select("id,status,outbound_action_id").eq("project_id",project.id).in("status",["scheduled","drafted"]);
  const warnings=[];
  for(const follow of followups||[]){
    if(follow.outbound_action_id){try{await cancelGmailDraft(follow.outbound_action_id,actor)}catch(err){warnings.push(`Follow-up draft ${follow.id}: ${err.message}`)}}
    await supabase.from("lifecycle_followups").update({status:"canceled",last_error:"Canceled because a new tune cycle started",updated_at:new Date().toISOString()}).eq("id",follow.id);
  }
  return {dryRun:false,...data,warnings};
}

export async function getCustomerLifecycleHistory({projectNumber,principal}){
  if(getDataMode()!=="supabase"){
    const w=demoWorkspace(projectNumber);return {project:{projectNumber:w.project.projectNumber,vehicle:w.project.vehicle,platform:w.project.platform,fuelTarget:w.project.fuelTarget,status:"completed"},cycles:[{id:w.cycle.id,cycleNumber:1,status:"completed",reason:"initial",startedAt:w.cycle.startedAt,completedAt:new Date().toISOString(),closeout:{customerSummary:w.closeout.customerSummary,aftercareNotes:w.closeout.aftercareNotes,finalRevisionNumber:5,packageManifest:w.packageManifest}}]};
  }
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");if(principal?.customerId&&principal.customerId!==project.customerId)throw new Error("Project access denied");
  const supabase=getSupabaseServerClient();
  const {data:cycles,error}=await supabase.from("tune_cycles").select("*").eq("project_id",project.id).order("cycle_number",{ascending:false});if(error)throw new Error(error.message);
  const {data:closeouts}=await supabase.from("project_closeouts").select("*").eq("project_id",project.id).eq("status","closed");
  const closeByCycle=Object.fromEntries((closeouts||[]).map(row=>[row.cycle_id,row]));
  return {project:{projectNumber:project.projectNumber,vehicle:project.vehicle,platform:project.platform,fuelTarget:project.fuelTarget,status:project.status},cycles:(cycles||[]).map(raw=>{const cycle=mapCycle(raw),co=closeByCycle[raw.id];return {id:cycle.id,cycleNumber:cycle.cycleNumber,status:cycle.status,reason:cycle.reason,changeSummary:cycle.changeSummary,fuelTarget:cycle.fuelTarget,startedAt:cycle.startedAt,completedAt:cycle.completedAt,closeout:co?{customerSummary:co.customer_summary,aftercareNotes:co.aftercare_notes,finalRevisionNumber:co.baseline_snapshot?.finalRevisionNumber||null,packageManifest:co.package_manifest||{},closedAt:co.closed_at}:null}})};
}

export function lifecycleReadiness(){return {dataMode:getDataMode(),mutationsEnabled:mutationsEnabled(),cycleHistory:true,atomicCloseout:true,finalArtifactHashCheck:true,customerArchive:true,followupDraftQueue:true,followupAutomationEnabled:process.env.SUBPAR_FOLLOWUP_AUTOMATION_ENABLED==="true",retuneWithoutHistoryLoss:true};}

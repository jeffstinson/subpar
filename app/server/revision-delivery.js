import crypto from "node:crypto";
import { getDataMode, mutationsEnabled } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { queueGmailDraft } from "./gmail-outbound";
import { getProjectById } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

const allowedNextSteps=new Set(["request_log","feedback_only","complete"]);

function revisionNumber(row){return Number(row?.revisionNumber??row?.revision_number??row?.number??0)||0}
function customerName(project){return project?.customer?.name||[project?.customer?.firstName,project?.customer?.lastName].filter(Boolean).join(" ")||"Customer"}
function requirementType(item){return item?.type||item?.requirementType||item?.requirement_type||""}
function requirementStatus(item){return String(item?.status||"").toLowerCase()}
function fileName(file){return file?.originalName||file?.original_name||file?.name||"Tune file"}
function fileVisibility(file){return file?.visibility||"internal"}
function fileImmutable(file){return file?.immutable!==false}
function fileRevisionId(file){return file?.revisionId||file?.revision_id||null}
function fileBucket(file){return file?.storageBucket||file?.storage_bucket||null}
function filePath(file){return file?.storagePath||file?.storage_path||null}

function demoDeliveryWorkspace(projectNumber="SP-1842"){
  const project={id:"proj_sp1842",projectNumber,customerId:"cus_alex-rivera",vehicleId:"veh_alex-m340i",customer:{name:"Alex Rivera",email:"alex.rivera@gmail.com"},vehicle:{year:2021,make:"BMW",model:"M340i",chassis:"G20",engine:"B58TU"},platform:"MHD",fuelTarget:"E40",currentRevisionNumber:5,waitingOn:"tuner",nextAction:"QA and deliver Rev 5",metadata:{loggingRecipeKey:"mhd-b58tu-v1",parameterPackKey:"mhd-b58tu-pack"},requirements:[{type:"flash_eligibility",label:"DME / ROM flash eligibility",status:"complete",required:true},{type:"logging_setup",label:"MHD logging setup",status:"complete",required:true}]};
  const revision={id:"demo_rev5",revisionNumber:5,status:"draft",fuelTarget:"E40",customerSummary:"Small high-RPM timing cleanup while preserving the smoother torque delivery and boost response from Rev 4.",internalNotes:"Address the correction region noted in the Rev 4 review."};
  const tuneFile={id:"demo_rev5_file",revisionId:revision.id,kind:"tune_revision",originalName:"alex_m340i_rev5_e40.bin",visibility:"internal",immutable:true,sizeBytes:524288,sha256:"preview-sha256-generated-at-qa"};
  const gates=evaluateDeliveryGates({project,revision,tuneFile,customerSummary:revision.customerSummary});
  return {mode:"demo",project,revision,tuneFiles:[tuneFile],primaryFile:tuneFile,delivery:{id:"demo_delivery_rev5",status:"draft",nextStep:"request_log",customerSummary:revision.customerSummary,internalQaNotes:"",qaSnapshot:{},fileSha256:null,primary_file_id:tuneFile.id},gates,outbound:null,history:[{type:"log.review.decision",label:"Rev 5 created from datalog review",createdAt:new Date().toISOString()}]};
}

export function evaluateDeliveryGates({project,revision,tuneFile,customerSummary}){
  const requirements=project?.requirements||[];
  const compatibility=requirements.filter(item=>new Set(["flash_eligibility","platform_compatibility"]).has(requirementType(item))&&item.required!==false);
  const unresolvedCompatibility=compatibility.filter(item=>!new Set(["complete","waived"]).has(requirementStatus(item)));
  const loggingAssigned=Boolean(project?.metadata?.loggingRecipeKey||project?.metadata?.parameterPackKey||requirements.some(item=>requirementType(item)==="logging_setup"));
  const projectFuel=String(project?.fuelTarget||project?.fuel_target||"").trim().toLowerCase();
  const revisionFuel=String(revision?.fuelTarget||revision?.fuel_target||"").trim().toLowerCase();
  const gates=[
    {key:"revision",label:"Revision record",pass:Boolean(revision?.id),detail:revision?.id?`Rev ${revisionNumber(revision)} exists.`:"Revision record is missing."},
    {key:"current",label:"Current revision",pass:Boolean(revision?.id)&&revisionNumber(revision)===Number(project?.currentRevisionNumber??project?.currentRevision??0),detail:`Project current revision is ${project?.currentRevisionNumber??project?.currentRevision??"—"}.`},
    {key:"file",label:"Private tune artifact",pass:Boolean(tuneFile?.id&&tuneFile?.kind==="tune_revision"),detail:tuneFile?.id?fileName(tuneFile):"Attach one tune_revision file to this revision."},
    {key:"immutable",label:"Immutable file history",pass:Boolean(tuneFile?.id&&fileImmutable(tuneFile)),detail:tuneFile?.id?(fileImmutable(tuneFile)?"Tune artifact is immutable.":"Tune artifact is mutable and cannot be delivered."):"No tune artifact attached."},
    {key:"private",label:"Private before delivery",pass:Boolean(tuneFile?.id&&(fileVisibility(tuneFile)==="internal"||String(revision?.status)==="delivered")),detail:tuneFile?.id?`Current visibility: ${fileVisibility(tuneFile)}.`:"No tune artifact attached."},
    {key:"summary",label:"Customer-visible summary",pass:Boolean(String(customerSummary||revision?.customerSummary||revision?.customer_summary||"").trim()),detail:"A customer-safe explanation is required."},
    {key:"platform",label:"Project platform",pass:Boolean(String(project?.platform||"").trim()),detail:project?.platform||"Tuning platform is missing."},
    {key:"fuel",label:"Fuel target consistency",pass:Boolean(!projectFuel||!revisionFuel||projectFuel===revisionFuel),detail:projectFuel&&revisionFuel?`${project?.fuelTarget||project?.fuel_target} project / ${revision?.fuelTarget||revision?.fuel_target} revision.`:"Fuel target will use available project/revision context."},
    {key:"compatibility",label:"Compatibility holds cleared",pass:unresolvedCompatibility.length===0,detail:unresolvedCompatibility.length?`${unresolvedCompatibility.length} required compatibility item(s) still unresolved.`:"No unresolved required compatibility gate."},
    {key:"logging",label:"Next-step logging context",pass:loggingAssigned,detail:loggingAssigned?"Logging recipe/pack context is assigned to the project.":"No logging recipe, parameter pack or logging requirement is assigned."},
  ];
  return {pass:gates.every(item=>item.pass),passed:gates.filter(item=>item.pass).length,total:gates.length,gates,unresolvedCompatibility:unresolvedCompatibility.map(item=>({type:requirementType(item),label:item.label,status:item.status}))};
}

async function fileHash(supabase,file,{force=false}={}){
  const existing=file?.sha256||null;if(existing&&!force)return existing;
  const bucket=fileBucket(file),path=filePath(file);
  if(!bucket||!path)return existing;
  const {data,error}=await supabase.storage.from(bucket).download(path);
  if(error)throw new Error(`Unable to read private tune file for QA hash: ${error.message}`);
  const buffer=Buffer.from(await data.arrayBuffer());
  const hash=crypto.createHash("sha256").update(buffer).digest("hex");
  if(!existing){const {error:updateError}=await supabase.from("files").update({sha256:hash}).eq("id",file.id).is("sha256",null);if(updateError)throw new Error(`Unable to register tune-file hash: ${updateError.message}`)}
  return hash;
}

function pickRevision(project,requested){
  const revisions=project?.revisions||[];
  if(requested){const target=Number(requested);return revisions.find(row=>revisionNumber(row)===target)||null}
  const current=Number(project?.currentRevisionNumber??project?.currentRevision??0);
  return revisions.find(row=>revisionNumber(row)===current)||[...revisions].sort((a,b)=>revisionNumber(b)-revisionNumber(a))[0]||null;
}

export async function getRevisionDeliveryWorkspace({projectNumber="SP-1842",revision=null}={}){
  if(getDataMode()!=="supabase")return demoDeliveryWorkspace(projectNumber);
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const selected=pickRevision(project,revision);if(!selected)return {mode:"supabase",project,revision:null,tuneFiles:[],primaryFile:null,delivery:null,gates:evaluateDeliveryGates({project,revision:null,tuneFile:null,customerSummary:""}),outbound:null,history:[]};
  const files=(project.files||[]).filter(file=>file.kind==="tune_revision"&&fileRevisionId(file)===selected.id);
  const supabase=getSupabaseServerClient();
  const {data:delivery,error}=await supabase.from("revision_deliveries").select("*").eq("revision_id",selected.id).maybeSingle();
  if(error)throw new Error(`Unable to load revision delivery: ${error.message}`);
  const primaryFile=delivery?.primary_file_id?files.find(file=>file.id===delivery.primary_file_id)||null:files[0]||null;
  let outbound=null;
  if(delivery?.outbound_action_id){const {data}=await supabase.from("outbound_actions").select("id,status,recipient,subject,approved_by,approved_at,sent_at,provider_message_id,last_error,created_at").eq("id",delivery.outbound_action_id).maybeSingle();outbound=data||null}
  const gates=evaluateDeliveryGates({project,revision:selected,tuneFile:primaryFile,customerSummary:delivery?.customer_summary||selected.customerSummary||selected.customer_summary});
  const history=(project.events||[]).filter(event=>String(event.type||event.eventType||event.event_type||"").startsWith("revision.")||String(event.type||event.eventType||event.event_type||"").startsWith("delivery.")).slice(0,20);
  return {mode:"supabase",project,revision:selected,tuneFiles:files,primaryFile,delivery:delivery?{...delivery,nextStep:delivery.next_step,customerSummary:delivery.customer_summary,internalQaNotes:delivery.internal_qa_notes,qaSnapshot:delivery.qa_snapshot,fileSha256:delivery.file_sha256,approvedBy:delivery.approved_by,approvedAt:delivery.approved_at,deliveredAt:delivery.delivered_at,acknowledgedAt:delivery.acknowledged_at,installedAt:delivery.installed_at,nextLogRequestedAt:delivery.next_log_requested_at}:null,gates,outbound,history};
}

function assertPersistent(){if(getDataMode()!=="supabase")return null;if(!mutationsEnabled())throw new Error("Revision delivery writes require SUBPAR_MUTATIONS_ENABLED=true");return getSupabaseServerClient()}

async function context(projectNumber,revisionNumberInput){
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const revision=pickRevision(project,revisionNumberInput);if(!revision)throw new Error("Revision not found");
  const tuneFiles=(project.files||[]).filter(file=>file.kind==="tune_revision"&&fileRevisionId(file)===revision.id);
  return {project,revision,tuneFiles,tuneFile:tuneFiles[0]||null};
}

export async function saveRevisionDeliveryDraft({projectNumber,revisionNumber:revNumber,customerSummary,internalNotes,nextStep="request_log",actor="Doug Talmadge"}){
  if(!allowedNextSteps.has(nextStep))throw new Error("nextStep must be request_log, feedback_only, or complete");
  if(getDataMode()!=="supabase")return {...(await demoDeliveryWorkspace(projectNumber)),dryRun:true,notice:"Demo draft saved in preview only."};
  const supabase=assertPersistent();const {project,revision,tuneFile}=await context(projectNumber,revNumber);const now=new Date().toISOString();
  const summary=String(customerSummary??revision.customerSummary??revision.customer_summary??"").trim();
  const {error:revisionError}=await supabase.from("revisions").update({customer_summary:summary||null,internal_notes:String(internalNotes||revision.internalNotes||revision.internal_notes||"").trim()||null,fuel_target:revision.fuelTarget||revision.fuel_target||project.fuelTarget||project.fuel_target||null,updated_at:now}).eq("id",revision.id).in("status",["draft","ready"]);
  if(revisionError)throw new Error(`Unable to save revision draft: ${revisionError.message}`);
  const {data,error}=await supabase.from("revision_deliveries").upsert({project_id:project.id,revision_id:revision.id,primary_file_id:tuneFile?.id||null,status:"draft",next_step:nextStep,customer_summary:summary||null,internal_qa_notes:String(internalNotes||"").trim()||null,updated_at:now},{onConflict:"revision_id"}).select("*").single();
  if(error)throw new Error(`Unable to save delivery draft: ${error.message}`);
  return {dryRun:false,delivery:data};
}

export async function runRevisionDeliveryQa({projectNumber,revisionNumber:revNumber,actor="Doug Talmadge"}){
  if(getDataMode()!=="supabase"){const workspace=await demoDeliveryWorkspace(projectNumber);return {dryRun:true,gates:workspace.gates,fileSha256:"demo-sha256-preview",delivery:{...workspace.delivery,status:workspace.gates.pass?"qa_ready":"draft"}}}
  const supabase=assertPersistent();const {project,revision,tuneFile}=await context(projectNumber,revNumber);
  const {data:existing}=await supabase.from("revision_deliveries").select("*").eq("revision_id",revision.id).maybeSingle();
  const gates=evaluateDeliveryGates({project,revision,tuneFile,customerSummary:existing?.customer_summary||revision.customerSummary||revision.customer_summary});
  const hash=tuneFile?await fileHash(supabase,tuneFile):null;
  const snapshot={evaluatedAt:new Date().toISOString(),evaluatedBy:actor,projectNumber:project.projectNumber,revisionNumber:revisionNumber(revision),platform:project.platform,fuelTarget:revision.fuelTarget||revision.fuel_target||project.fuelTarget||project.fuel_target||null,fileId:tuneFile?.id||null,fileName:tuneFile?fileName(tuneFile):null,fileSha256:hash,gates};
  const {data,error}=await supabase.from("revision_deliveries").upsert({project_id:project.id,revision_id:revision.id,primary_file_id:tuneFile?.id||null,status:gates.pass?"qa_ready":"draft",next_step:existing?.next_step||"request_log",customer_summary:existing?.customer_summary||revision.customerSummary||revision.customer_summary||null,internal_qa_notes:existing?.internal_qa_notes||null,qa_snapshot:snapshot,file_sha256:hash,updated_at:new Date().toISOString()},{onConflict:"revision_id"}).select("*").single();
  if(error)throw new Error(`Unable to persist revision QA: ${error.message}`);
  await supabase.from("events").upsert({project_id:project.id,customer_id:project.customerId||null,vehicle_id:project.vehicleId||null,event_type:"revision.qa.completed",actor_type:"internal",actor_id:actor,visibility:"internal",payload:{revisionId:revision.id,revisionNumber:revisionNumber(revision),pass:gates.pass,fileId:tuneFile?.id||null,fileSha256:hash},idempotency_key:`revision-qa:${revision.id}:${hash||"no-file"}:${gates.pass?"pass":"fail"}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return {dryRun:false,gates,fileSha256:hash,delivery:data};
}

export async function approveRevisionDelivery({projectNumber,revisionNumber:revNumber,actor="Doug Talmadge"}){
  const qa=await runRevisionDeliveryQa({projectNumber,revisionNumber:revNumber,actor});if(!qa.gates.pass)throw new Error("Revision cannot be approved until every delivery QA gate passes");
  if(getDataMode()!=="supabase")return {...qa,dryRun:true,approved:true};
  const supabase=assertPersistent();const {project,revision}=await context(projectNumber,revNumber);const now=new Date().toISOString();
  const {data,error}=await supabase.from("revision_deliveries").update({status:"approved",approved_by:actor,approved_at:now,updated_at:now}).eq("revision_id",revision.id).eq("status","qa_ready").select("*").single();
  if(error)throw new Error(`Unable to approve revision delivery: ${error.message}`);
  await supabase.from("revisions").update({status:"ready",updated_at:now}).eq("id",revision.id).in("status",["draft","ready"]);
  await supabase.from("events").upsert({project_id:project.id,customer_id:project.customerId||null,vehicle_id:project.vehicleId||null,event_type:"revision.delivery.approved",actor_type:"internal",actor_id:actor,visibility:"internal",payload:{revisionId:revision.id,revisionNumber:revisionNumber(revision),deliveryId:data.id,fileSha256:data.file_sha256,fileId:data.primary_file_id},idempotency_key:`revision-delivery-approved:${revision.id}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return {dryRun:false,approved:true,delivery:data};
}

function deliveryEmail({project,revision,summary,nextStep}){
  const rev=revisionNumber(revision);const name=customerName(project).split(" ")[0]||"there";
  const next=nextStep==="request_log"?"After you install this revision, follow the logging instructions in your portal and upload the next clean log.":nextStep==="feedback_only"?"After you install it, reply with how the car feels and anything you want Doug to review.":"This revision is marked as the final delivery path; install it and confirm in your portal when you're set.";
  return {subject:`Subpar Tuning · Rev ${rev} is ready for ${project.vehicle?.model||project.projectNumber}`,body:`Hey ${name},\n\nRev ${rev} is ready in your Subpar Tuning portal.\n\n${summary}\n\n${next}\n\nYour tune file remains private and is delivered through the secure portal.\n\n- Doug / Subpar Tuning`};
}

export async function deliverRevision({projectNumber,revisionNumber:revNumber,actor="Doug Talmadge",stageEmail=true}){
  if(getDataMode()!=="supabase"){const workspace=await demoDeliveryWorkspace(projectNumber);return {dryRun:true,delivery:{...workspace.delivery,status:"delivered",deliveredAt:new Date().toISOString()},emailDraft:stageEmail?{dryRun:true,status:"draft"}:null,nextAction:"Install Rev 5 and upload the next log"}}
  const supabase=assertPersistent();const {project,revision,tuneFiles}=await context(projectNumber,revNumber);
  const {data:delivery,error:loadError}=await supabase.from("revision_deliveries").select("*").eq("revision_id",revision.id).single();if(loadError)throw new Error(`Unable to load approved delivery: ${loadError.message}`);
  if(delivery.status==="delivered"||delivery.status==="acknowledged"||delivery.status==="relog_requested"||delivery.status==="closed")return {dryRun:false,replayed:true,delivery};
  if(delivery.status!=="approved")throw new Error("Revision must be QA-approved before delivery");
  const approvedFile=tuneFiles.find(file=>file.id===delivery.primary_file_id)||null;
  if(!approvedFile)throw new Error("The exact QA-approved tune artifact is no longer attached to this revision");
  if(!fileImmutable(approvedFile))throw new Error("The QA-approved tune artifact is not immutable");
  if(fileVisibility(approvedFile)!=="internal")throw new Error("The QA-approved tune artifact must still be private before release");
  const observedHash=await fileHash(supabase,approvedFile,{force:true});
  if(!delivery.file_sha256||!observedHash||String(delivery.file_sha256).toLowerCase()!==String(observedHash).toLowerCase())throw new Error("Tune artifact changed after QA approval. Run QA again before delivery.");

  const {data:release,error:releaseError}=await supabase.rpc("subpar_release_revision_delivery",{p_delivery_id:delivery.id,p_actor:actor,p_observed_sha256:observedHash});
  if(releaseError)throw new Error(`Unable to release approved revision atomically: ${releaseError.message}`);
  const releaseResult=release||{};
  const nextStep=delivery.next_step||"request_log";const summary=String(delivery.customer_summary||revision.customerSummary||revision.customer_summary||"").trim();
  let emailDraft=null,emailError=null;
  if(stageEmail){
    try{const mail=deliveryEmail({project,revision,summary,nextStep});emailDraft=await queueGmailDraft({projectNumber:project.projectNumber,to:project.customer?.email,subject:mail.subject,body:mail.body,requestId:`revision-delivery-${revision.id}`,createdBy:actor});}
    catch(error){emailError=error.message}
  }
  if(emailDraft?.id){await supabase.from("revision_deliveries").update({outbound_action_id:emailDraft.id,updated_at:new Date().toISOString()}).eq("id",delivery.id)}
  if(emailDraft||emailError){await supabase.from("events").upsert({project_id:project.id,customer_id:project.customerId||null,vehicle_id:project.vehicleId||null,event_type:"revision.delivery.notification.staged",actor_type:"internal",actor_id:actor,visibility:"internal",payload:{revisionId:revision.id,deliveryId:delivery.id,emailDraftId:emailDraft?.id||null,emailStaged:Boolean(emailDraft),emailError},idempotency_key:`revision-delivery-notification:${revision.id}`},{onConflict:"idempotency_key",ignoreDuplicates:true})}
  const {data:updated}=await supabase.from("revision_deliveries").select("*").eq("id",delivery.id).single();
  return {dryRun:false,replayed:Boolean(releaseResult.replayed),delivery:updated||{...delivery,status:"delivered"},emailDraft,emailError,nextAction:releaseResult.nextAction||releaseResult.next_action||null,fileId:approvedFile.id,fileSha256:observedHash};
}

export async function getCustomerRevisionDelivery({projectNumber,principal}){
  if(getDataMode()!=="supabase"){
    const workspace=await demoDeliveryWorkspace(projectNumber);return {mode:"demo",project:{projectNumber:workspace.project.projectNumber,customer:workspace.project.customer,vehicle:workspace.project.vehicle,platform:workspace.project.platform,fuelTarget:workspace.project.fuelTarget},revision:{id:workspace.revision.id,revisionNumber:5,status:"delivered",customerSummary:workspace.revision.customerSummary},delivery:{...workspace.delivery,status:"delivered",nextStep:"request_log",deliveredAt:new Date().toISOString()},file:{...workspace.primaryFile,visibility:"customer"}};
  }
  const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  if(principal?.customerId&&principal.customerId!==project.customerId)throw new Error("Project access denied");
  const supabase=getSupabaseServerClient();
  const {data:rows,error}=await supabase.from("revision_deliveries").select("*").eq("project_id",project.id).in("status",["delivered","acknowledged","relog_requested","closed"]).order("delivered_at",{ascending:false}).limit(1);if(error)throw new Error(`Unable to load customer delivery: ${error.message}`);
  const delivery=rows?.[0];if(!delivery)return {mode:"supabase",project:{projectNumber:project.projectNumber,customer:project.customer,vehicle:project.vehicle,platform:project.platform,fuelTarget:project.fuelTarget},revision:null,delivery:null,file:null};
  const revision=(project.revisions||[]).find(row=>row.id===delivery.revision_id)||null;
  const file=(project.files||[]).find(row=>row.id===delivery.primary_file_id&&row.visibility==="customer")||null;
  return {mode:"supabase",project:{projectNumber:project.projectNumber,customer:project.customer,vehicle:project.vehicle,platform:project.platform,fuelTarget:project.fuelTarget},revision:revision?{id:revision.id,revisionNumber:revisionNumber(revision),status:revision.status,customerSummary:delivery.customer_summary||revision.customerSummary||revision.customer_summary,publishedAt:revision.publishedAt||revision.published_at}:null,delivery:{id:delivery.id,status:delivery.status,nextStep:delivery.next_step,deliveredAt:delivery.delivered_at,acknowledgedAt:delivery.acknowledged_at,installedAt:delivery.installed_at,nextLogRequestedAt:delivery.next_log_requested_at},file:file?{id:file.id,kind:file.kind,name:fileName(file),sizeBytes:file.sizeBytes??file.size_bytes??null,visibility:file.visibility}:null};
}

export async function acknowledgeRevisionDelivery({projectNumber,deliveryId,installed=false,actor="Customer"}){
  if(getDataMode()!=="supabase")return {dryRun:true,status:installed?"relog_requested":"acknowledged",installed,projectNumber};
  const supabase=assertPersistent();const project=await getProjectById(projectNumber);if(!project)throw new Error("Project not found");
  const {data:delivery,error:loadError}=await supabase.from("revision_deliveries").select("*").eq("id",deliveryId).eq("project_id",project.id).single();if(loadError)throw new Error(`Unable to load delivery acknowledgement: ${loadError.message}`);
  if(!new Set(["delivered","acknowledged","relog_requested"]).has(delivery.status))throw new Error("This revision is not in an acknowledgeable state");
  const now=new Date().toISOString();const firstAck=delivery.acknowledged_at||now;const installAt=installed?(delivery.installed_at||now):delivery.installed_at;
  let status="acknowledged",nextLogRequestedAt=delivery.next_log_requested_at;
  if(installed&&delivery.next_step==="request_log"){status="relog_requested";nextLogRequestedAt=nextLogRequestedAt||now;await supabase.from("tune_projects").update({status:"waiting_customer",stage:"datalog_review",waiting_on:"customer",next_action:"Upload the next approved datalog",customer_visible_status:"Waiting for your next log",updated_at:now}).eq("id",project.id)}
  else if(installed&&delivery.next_step==="feedback_only")await supabase.from("tune_projects").update({status:"waiting_customer",stage:"revision",waiting_on:"customer",next_action:"Send Doug feedback on the current revision",customer_visible_status:"Waiting for your feedback",updated_at:now}).eq("id",project.id);
  else if(installed&&delivery.next_step==="complete")await supabase.from("tune_projects").update({status:"ready_to_deliver",stage:"final_delivery",waiting_on:"tuner",next_action:"Close out completed tune",customer_visible_status:"Final revision installed",updated_at:now}).eq("id",project.id);
  const {data:updated,error:updateError}=await supabase.from("revision_deliveries").update({status,acknowledged_by:delivery.acknowledged_by||actor,acknowledged_at:firstAck,installed_at:installAt,next_log_requested_at:nextLogRequestedAt,updated_at:now}).eq("id",delivery.id).select("*").single();if(updateError)throw new Error(`Unable to save delivery acknowledgement: ${updateError.message}`);
  await supabase.from("events").upsert({project_id:project.id,customer_id:project.customerId||null,vehicle_id:project.vehicleId||null,event_type:installed?"revision.install.acknowledged":"revision.delivery.acknowledged",actor_type:"customer",actor_id:actor,visibility:"both",payload:{deliveryId:delivery.id,revisionId:delivery.revision_id,installed,nextStep:delivery.next_step,nextLogRequestedAt},idempotency_key:`revision-ack:${delivery.id}:${installed?"installed":"received"}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return {dryRun:false,delivery:updated,status,nextLogRequestedAt};
}

export function revisionDeliveryReadiness(){const integration=getIntegrationReadiness();return {dataMode:getDataMode(),mutationsEnabled:mutationsEnabled(),privateTuneFiles:true,qaBeforeVisibility:true,approvalBeforeDelivery:true,artifactPinnedAtQa:true,hashRecheckedAtRelease:true,atomicRelease:true,portalDelivery:true,gmailDraftStaging:true,gmailSendEnabled:integration.gmail.readyForOutbound,customerAcknowledgement:true,nextLogLoop:true};}

import { getAccessReadiness } from "./access-control";
import { getAuthReadiness,getDataMode,getPersistenceReadiness,mutationsEnabled } from "./env";
import { GO_LIVE_MIGRATIONS,getGoLiveReadiness } from "./go-live";
import { getIntegrationReadiness } from "./integrations";
import { getLogReviewWorkspace } from "./log-review-workflow";
import { runPreflight } from "./preflight";
import { getProjectById } from "./repository";
import { getRevisionDeliveryWorkspace } from "./revision-delivery";
import { getStorageReadiness } from "./storage";
import { getSupabaseServerClient } from "./supabase-server";
import { getCustomerLifecycleHistory,getLifecycleWorkspace } from "./tune-lifecycle";

const EXPECTED_SCHEMA_HEAD="0015";
const PASS_CHECKPOINT_STATES=new Set(["passed","ready"]);
const PROVIDER_EVIDENCE_MAX_AGE_MS=24*60*60*1000;

function check(key,category,status,detail,{severity="blocker",metadata={}}={}){
  return {key,category,severity,status,detail,metadata};
}
function pass(key,category,detail,options){return check(key,category,"pass",detail,options)}
function fail(key,category,detail,options){return check(key,category,"fail",detail,options)}
function warn(key,category,detail,options){return check(key,category,"warn",detail,{severity:"warning",...(options||{})})}
function skipped(key,category,detail,options){return check(key,category,"skipped",detail,{severity:"info",...(options||{})})}

function environmentChecks(){
  const persistence=getPersistenceReadiness();
  const auth=getAuthReadiness();
  const access=getAccessReadiness();
  const storage=getStorageReadiness();
  const integrations=getIntegrationReadiness();
  const goLive=getGoLiveReadiness();
  const checks=[];

  checks.push(persistence.supportedMode?pass("mode-supported","environment",`Data mode '${persistence.mode}' is supported.`):fail("mode-supported","environment",`Unsupported data mode '${persistence.mode}'.`));
  checks.push(persistence.supabaseConfigured?pass("supabase-config","environment","Dedicated Supabase server configuration is present."):fail("supabase-config","environment","Dedicated Subpar Supabase URL + service-role key are still required."));
  checks.push(auth.publicAuthConfigured?pass("public-auth-config","identity","Supabase public auth configuration is present."):fail("public-auth-config","identity","Public Supabase URL/anon key are required for real sessions and signed upload handoff."));
  checks.push(auth.internalAuthEnabled?pass("internal-auth-enabled","identity","Internal route authentication is enabled."):fail("internal-auth-enabled","identity","SUBPAR_INTERNAL_AUTH_ENABLED must be true before real customer data is enabled."));
  checks.push(auth.portalAuthEnabled?pass("portal-auth-enabled","identity","Customer portal authentication is enabled."):fail("portal-auth-enabled","identity","SUBPAR_PORTAL_AUTH_ENABLED must be true before real customer data is enabled."));
  checks.push(access.defaultDeny?pass("default-deny","identity","Role/portal permission model defaults closed."):fail("default-deny","identity","Access-control model is not default-deny."));
  checks.push(storage.ticketSecretConfigured?pass("file-ticket-secret","storage","Private file ticket signing is configured."):fail("file-ticket-secret","storage","A 32+ character SUBPAR_FILE_TICKET_SECRET is required."));
  checks.push(storage.configured?pass("storage-config","storage","Private storage adapter is configured."):fail("storage-config","storage","Private storage is not fully configured."));
  checks.push(integrations.wix.publicKeyConfigured?pass("wix-webhook-key","providers","Wix signed-webhook public key is configured."):fail("wix-webhook-key","providers","Dedicated Wix webhook public key is required."));
  checks.push(goLive.wixReadReadiness?.credentials?pass("wix-oauth-config","providers","Wix app/site installation credentials are configured."):fail("wix-oauth-config","providers","Wix App ID, secret and Doug-site instance ID are incomplete."));
  checks.push(integrations.gmail.oauthConfigured?pass("gmail-oauth-config","providers","Gmail OAuth credentials are configured."):fail("gmail-oauth-config","providers","Dedicated Gmail OAuth client/refresh token/mailbox are incomplete."));
  checks.push(integrations.gmail.watchConfigured?pass("gmail-watch-config","providers","Gmail Pub/Sub watch target is configured."):fail("gmail-watch-config","providers","Gmail Pub/Sub topic is required for live incremental sync."));

  return {checks,persistence,auth,access,storage,integrations,goLive};
}

function gateSequenceChecks(context){
  const {integrations,auth}=context;
  const real=integrations.realDataApproved;
  const wixApply=integrations.wix.applyEnabled;
  const wixIngress=integrations.wix.webhookEnabled;
  const gmailSync=integrations.gmail.syncEnabled;
  const gmailSend=integrations.gmail.sendEnabled;
  const importApply=process.env.SUBPAR_IMPORT_APPLY_ENABLED==="true";
  const checks=[];

  checks.push(!wixApply||real?pass("wix-apply-real-data","activation-gates","Wix apply is not enabled ahead of real-data approval."):fail("wix-apply-real-data","activation-gates","Unsafe gate combination: Wix apply is ON while real-data approval is OFF."));
  checks.push(!wixApply||wixIngress?pass("wix-apply-ingress","activation-gates","Wix apply is not enabled ahead of signed ingress."):fail("wix-apply-ingress","activation-gates","Unsafe gate combination: Wix apply is ON before signed webhook ingress is enabled."));
  checks.push(!gmailSend||real?pass("gmail-send-real-data","activation-gates","Gmail provider send is not enabled ahead of real-data approval."):fail("gmail-send-real-data","activation-gates","Unsafe gate combination: Gmail provider send is ON while real-data approval is OFF."));
  checks.push(!gmailSend||gmailSync?pass("gmail-send-sync","activation-gates","Gmail send is not enabled ahead of mailbox sync."):fail("gmail-send-sync","activation-gates","Unsafe gate combination: Gmail send is ON before Gmail read sync is enabled."));
  checks.push(!importApply||real?pass("import-apply-real-data","activation-gates","Historical import apply is not enabled ahead of real-data approval."):fail("import-apply-real-data","activation-gates","Unsafe gate combination: historical import apply is ON while real-data approval is OFF."));
  checks.push(!real||(auth.internalAuthEnabled&&auth.portalAuthEnabled)?pass("real-data-auth-boundary","activation-gates","Real-data approval is not bypassing the auth boundary."):fail("real-data-auth-boundary","activation-gates","Real-data approval is ON while one or both auth boundaries are OFF."));

  if(!real)checks.push(warn("real-data-gate","activation-gates","Real-data approval is intentionally OFF. This is the correct state while setup/validation is still in progress."));
  else checks.push(pass("real-data-gate","activation-gates","Explicit real-data approval is ON."));
  return checks;
}

async function migrationCheck(){
  const expected=GO_LIVE_MIGRATIONS.map(item=>item.id);
  const mode=getDataMode();
  if(mode!=="supabase")return skipped("schema-head","database",`Demo mode expects migrations 0001–${EXPECTED_SCHEMA_HEAD}; no live database is attached.`,{metadata:{expected}});
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("schema_migrations").select("version,name,applied_at").order("version",{ascending:true});
  if(error)return fail("schema-head","database",`Unable to read schema migration ledger: ${error.message}`);
  const installed=new Set((data||[]).map(row=>row.version));
  const missing=expected.filter(version=>!installed.has(version));
  return missing.length?fail("schema-head","database",`Missing ${missing.length} required migration(s): ${missing.join(", ")}.`,{metadata:{missing,installed:[...installed]}}):pass("schema-head","database",`Migration ledger is complete through ${EXPECTED_SCHEMA_HEAD}.`,{metadata:{installed:[...installed]}});
}

function integrityChecksFromSnapshot(snapshot={}){
  const definitions=[
    ["projectsMissingCurrentCycle","Projects missing a current tune cycle"],
    ["projectCycleOwnerMismatch","Project/current-cycle ownership mismatch"],
    ["multipleActiveCycles","Projects with multiple active tune cycles"],
    ["orphanCycleRecords","Cycle-owned records with no cycle"],
    ["customerVisibleUnreleasedTunes","Customer-visible tune files that bypassed controlled release"],
    ["releasedDeliveryFileMismatch","Released delivery/file ownership or SHA mismatch"],
    ["closedCloseoutFileMismatch","Closed closeout final-file/revision mismatch"],
    ["completedProjectCycleMismatch","Completed project/current-cycle state mismatch"],
    ["archivedLogsStillQueued","Archived-cycle logs still appearing as active review work"],
    ["sentEmailWithoutApproval","Provider-sent outbound email without recorded approval"],
  ];
  const checks=definitions.map(([key,label])=>Number(snapshot[key]||0)===0?pass(`integrity-${key}`,"data-integrity",`${label}: 0.`):fail(`integrity-${key}`,"data-integrity",`${label}: ${Number(snapshot[key]||0)}.`,{metadata:{count:Number(snapshot[key]||0)}}));
  const overdue=Number(snapshot.overdueFollowups||0);
  checks.push(overdue?warn("integrity-overdueFollowups","operations",`${overdue} lifecycle follow-up(s) are overdue for draft staging.`,{metadata:{count:overdue}}):pass("integrity-overdueFollowups","operations","No scheduled lifecycle follow-ups are overdue.",{severity:"warning"}));
  return checks;
}

async function integrityChecks(){
  if(getDataMode()!=="supabase")return [skipped("integrity-live","data-integrity","Live cross-record integrity checks require the isolated Supabase project. Synthetic workflow checks run separately.")];
  try{
    const supabase=getSupabaseServerClient();
    const {data,error}=await supabase.rpc("subpar_operational_integrity_snapshot");
    if(error)return [fail("integrity-rpc","data-integrity",`Operational integrity probe failed: ${error.message}`)];
    return [pass("integrity-rpc","data-integrity","Operational integrity RPC completed."),...integrityChecksFromSnapshot(data||{})];
  }catch(error){return [fail("integrity-rpc","data-integrity",`Operational integrity probe failed: ${error.message}`)];}
}

async function recordedSyntheticCheckpoint(){
  if(getDataMode()!=="supabase")return null;
  const supabase=getSupabaseServerClient();
  const {data}=await supabase.from("setup_checkpoints").select("status,verified_by,verified_at").eq("checkpoint_key","synthetic_end_to_end").maybeSingle();
  return data||null;
}

function recordedSmokePass(checkpoint){
  const suffix=checkpoint?.verified_by?` Verified by ${checkpoint.verified_by}${checkpoint.verified_at?` on ${new Date(checkpoint.verified_at).toISOString()}`:""}.`:"";
  return [
    pass("smoke-project","synthetic-smoke",`Synthetic project/repository loop was previously validated.${suffix}`),
    pass("smoke-review","synthetic-smoke",`Synthetic parser/review loop was previously validated.${suffix}`),
    pass("smoke-delivery","synthetic-smoke",`Synthetic revision delivery loop was previously validated.${suffix}`),
    pass("smoke-closeout","synthetic-smoke",`Synthetic closeout/retune loop was previously validated.${suffix}`),
    pass("smoke-history","synthetic-smoke",`Synthetic customer history loop was previously validated.${suffix}`),
  ];
}

async function smokeChecks(){
  try{
    if(getDataMode()==="supabase"){
      const supabase=getSupabaseServerClient();
      const {data:fixture,error}=await supabase.from("tune_projects").select("project_number").eq("project_number","SP-1842").maybeSingle();
      if(error)throw new Error(`Unable to inspect synthetic fixture: ${error.message}`);
      if(!fixture){
        const checkpoint=await recordedSyntheticCheckpoint();
        if(PASS_CHECKPOINT_STATES.has(checkpoint?.status))return recordedSmokePass(checkpoint);
        return [fail("smoke-runtime","synthetic-smoke","SP-1842 synthetic fixture is not present and synthetic_end_to_end has not been recorded passed. Run the synthetic validation before removing fixtures.")];
      }
    }
    const project=await getProjectById("SP-1842");
    if(!project)throw new Error("SP-1842 synthetic project could not be resolved");
    const [review,delivery,lifecycle,history]=await Promise.all([
      getLogReviewWorkspace({projectNumber:"SP-1842"}),
      getRevisionDeliveryWorkspace({projectNumber:"SP-1842"}),
      getLifecycleWorkspace({projectNumber:"SP-1842"}),
      getCustomerLifecycleHistory({projectNumber:"SP-1842",principal:{type:"customer",customerId:project.customerId||project.customer?.id||null,projectNumbers:["SP-1842"]}}),
    ]);
    const checks=[];
    checks.push(project?.projectNumber?pass("smoke-project","synthetic-smoke","Synthetic project repository read succeeded."):fail("smoke-project","synthetic-smoke","Synthetic project repository read did not return SP-1842."));
    checks.push(review?.primary?pass("smoke-review","synthetic-smoke","Review Cockpit resolves a parser-backed primary log."):fail("smoke-review","synthetic-smoke","Review Cockpit synthetic workspace is missing its primary log."));
    checks.push(delivery?.revision&&delivery?.primaryFile?pass("smoke-delivery","synthetic-smoke","Revision delivery resolves the revision and pinned private artifact."):fail("smoke-delivery","synthetic-smoke","Revision delivery synthetic workspace is incomplete."));
    checks.push(lifecycle?.cycle&&lifecycle?.finalRevision&&lifecycle?.finalFile?pass("smoke-closeout","synthetic-smoke","Lifecycle closeout resolves cycle, final revision and final artifact."):fail("smoke-closeout","synthetic-smoke","Lifecycle synthetic workspace is incomplete."));
    checks.push(Array.isArray(history?.cycles)&&history.cycles.length>0?pass("smoke-history","synthetic-smoke","Customer permanent tune history resolves at least one cycle."):fail("smoke-history","synthetic-smoke","Customer tune history has no synthetic cycle."));
    return checks;
  }catch(error){return [fail("smoke-runtime","synthetic-smoke",`Synthetic end-to-end read smoke failed: ${error.message}`)];}
}

async function checkpointSnapshot(){
  if(getDataMode()!=="supabase")return [];
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("setup_checkpoints").select("checkpoint_key,status,detail,verified_by,verified_at,updated_at").order("checkpoint_key",{ascending:true});
  if(error)return [];
  return data||[];
}

function preflightChecks(preflight){
  return (preflight?.tests||[]).map(test=>{
    const key=`preflight-${test.provider}`;
    const severity=new Set(["supabase","storage"]).has(test.provider)?"blocker":"warning";
    if(test.status==="pass")return pass(key,"provider-preflight",test.detail||`${test.provider} preflight passed.`,{severity,metadata:{latencyMs:test.latencyMs}});
    if(test.status==="fail")return check(key,"provider-preflight","fail",test.detail||`${test.provider} preflight failed.`,{severity,metadata:{latencyMs:test.latencyMs}});
    return skipped(key,"provider-preflight",test.detail||`${test.provider} preflight skipped.`,{metadata:{latencyMs:test.latencyMs}});
  });
}

async function providerEvidenceChecks(){
  if(getDataMode()!=="supabase")return [
    skipped("provider-evidence-wix","provider-evidence","Wix connection evidence will appear after isolated Supabase is attached and provider preflight runs."),
    skipped("provider-evidence-gmail","provider-evidence","Gmail connection evidence will appear after isolated Supabase is attached and provider preflight runs."),
  ];
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("connection_tests").select("provider,status,detail,tested_by,tested_at").in("provider",["wix","gmail"]).order("tested_at",{ascending:false}).limit(30);
  if(error)return [fail("provider-evidence-runtime","provider-evidence",`Unable to read provider connection evidence: ${error.message}`)];
  const latest={};
  for(const row of data||[]){if(!latest[row.provider])latest[row.provider]=row}
  return ["wix","gmail"].map(provider=>{
    const row=latest[provider];
    if(!row)return fail(`provider-evidence-${provider}`,"provider-evidence",`No successful ${provider} connection test has been recorded yet.`);
    const testedAt=row.tested_at?new Date(row.tested_at).getTime():0;
    const stale=!testedAt||Date.now()-testedAt>PROVIDER_EVIDENCE_MAX_AGE_MS;
    if(row.status!=="pass")return fail(`provider-evidence-${provider}`,"provider-evidence",`Latest ${provider} connection test is ${row.status}: ${row.detail||"no detail"}.`,{metadata:{testedAt:row.tested_at,testedBy:row.tested_by}});
    if(stale)return fail(`provider-evidence-${provider}`,"provider-evidence",`Latest ${provider} connection test is older than 24 hours. Run Provider Preflight again before activation.`,{metadata:{testedAt:row.tested_at,testedBy:row.tested_by}});
    return pass(`provider-evidence-${provider}`,"provider-evidence",`Latest ${provider} connection test passed within the last 24 hours.`,{metadata:{testedAt:row.tested_at,testedBy:row.tested_by}});
  });
}

function summarize(checks){
  const counts={pass:0,warn:0,fail:0,skipped:0};
  for(const item of checks)counts[item.status]=(counts[item.status]||0)+1;
  const blockers=checks.filter(item=>item.status==="fail"&&item.severity==="blocker");
  const warnings=checks.filter(item=>item.status==="warn"||(item.status==="fail"&&item.severity==="warning"));
  return {...counts,blockers:blockers.length,warnings:warnings.length,total:checks.length,status:blockers.length?"fail":warnings.length?"warn":"pass"};
}

function phaseReadiness(checks,checkpoints,context){
  const byKey=Object.fromEntries(checks.map(item=>[item.key,item]));
  const checkpoint=Object.fromEntries((checkpoints||[]).map(item=>[item.checkpoint_key,item]));
  const passing=key=>byKey[key]?.status==="pass";
  const syntheticKeys=["smoke-project","smoke-review","smoke-delivery","smoke-closeout","smoke-history"];
  const codeFoundation=syntheticKeys.every(passing);
  const infrastructure=getDataMode()==="supabase"&&[
    "supabase-config","public-auth-config","internal-auth-enabled","portal-auth-enabled","file-ticket-secret","storage-config","schema-head","integrity-rpc"
  ].every(key=>byKey[key]?.status==="pass")&&!checks.some(item=>item.category==="data-integrity"&&item.status==="fail"&&item.severity==="blocker");
  const providers=["wix-webhook-key","wix-oauth-config","gmail-oauth-config","gmail-watch-config","provider-evidence-wix","provider-evidence-gmail"].every(key=>byKey[key]?.status==="pass")&&!checks.some(item=>item.category==="activation-gates"&&item.status==="fail");
  const historicalReconciled=PASS_CHECKPOINT_STATES.has(checkpoint.historical_reconciliation?.status);
  const wixReplay=PASS_CHECKPOINT_STATES.has(checkpoint.wix_replay?.status);
  const gmailHistory=PASS_CHECKPOINT_STATES.has(checkpoint.gmail_history?.status);
  const outboundProven=PASS_CHECKPOINT_STATES.has(checkpoint.outbound_email?.status);
  const readyForLiveData=infrastructure&&providers&&historicalReconciled&&context.integrations.realDataApproved;
  const fullProduction=readyForLiveData&&wixReplay&&gmailHistory&&outboundProven;
  return {
    codeFoundation,
    infrastructure,
    providers,
    historicalReconciled,
    readyForLiveData,
    fullProduction,
    currentStage:fullProduction?"production":readyForLiveData?"live-data-cutover":historicalReconciled?"provider-validation":infrastructure?"historical-import":codeFoundation?"infrastructure-setup":"code-validation",
  };
}

async function persistAudit(audit,actor){
  if(getDataMode()!=="supabase"||!mutationsEnabled())return {persisted:false,reason:"Audit history persists only when Supabase mode and mutation mode are enabled."};
  try{
    const supabase=getSupabaseServerClient();
    const {data:run,error}=await supabase.from("activation_audit_runs").insert({mode:getDataMode(),environment:process.env.NEXT_PUBLIC_SUBPAR_ENV||"preview",app_commit:process.env.VERCEL_GIT_COMMIT_SHA||null,status:audit.summary.status,summary:{...audit.summary,phases:audit.phases},run_by:actor}).select("id").single();
    if(error)throw error;
    const rows=audit.checks.map(item=>({run_id:run.id,check_key:item.key,category:item.category,severity:item.severity,status:item.status,detail:item.detail,metadata:item.metadata||{}}));
    if(rows.length){const {error:checkError}=await supabase.from("activation_audit_checks").insert(rows);if(checkError)throw checkError}
    await supabase.from("activation_audit_runs").update({completed_at:new Date().toISOString()}).eq("id",run.id);
    return {persisted:true,runId:run.id};
  }catch(error){return {persisted:false,reason:error.message};}
}

export async function runActivationAudit({actor="Doug Talmadge",includeProviderProbes=false,persist=true}={}){
  const context=environmentChecks();
  const checks=[...context.checks,...gateSequenceChecks(context)];
  checks.push(await migrationCheck());
  checks.push(...await integrityChecks());
  checks.push(...await smokeChecks());

  const scopes=includeProviderProbes?["supabase","storage","wix","gmail"]:["supabase","storage"];
  try{checks.push(...preflightChecks(await runPreflight({scopes,testedBy:actor})))}catch(error){checks.push(fail("preflight-runtime","provider-preflight",`Preflight runner failed: ${error.message}`))}
  checks.push(...await providerEvidenceChecks());

  const checkpoints=await checkpointSnapshot();
  const summary=summarize(checks);
  const phases=phaseReadiness(checks,checkpoints,context);
  const audit={generatedAt:new Date().toISOString(),mode:getDataMode(),environment:process.env.NEXT_PUBLIC_SUBPAR_ENV||"preview",commit:process.env.VERCEL_GIT_COMMIT_SHA||null,summary,phases,checks,checkpoints,manifest:{schemaHead:EXPECTED_SCHEMA_HEAD,migrations:GO_LIVE_MIGRATIONS.map(item=>item.id),realDataApproved:context.integrations.realDataApproved,mutationsEnabled:mutationsEnabled(),providerProbesRequested:Boolean(includeProviderProbes),providerEvidenceMaxAgeHours:24}};
  audit.persistence=persist?await persistAudit(audit,actor):{persisted:false,reason:"Persistence was not requested."};
  return audit;
}

export async function listActivationAudits(limit=8){
  if(getDataMode()!=="supabase")return [];
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("activation_audit_runs").select("id,status,mode,environment,app_commit,summary,run_by,started_at,completed_at").order("created_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||8,25)));
  if(error)return [];
  return data||[];
}

export function activationCutoverSequence(){return [
  {step:1,key:"infrastructure",label:"Provision isolated infrastructure",detail:"Dedicated Supabase, private buckets, auth identities and all migrations through 0015."},
  {step:2,key:"synthetic",label:"Prove the synthetic end-to-end loop",detail:"Intake → project → parser → review → revision → delivery → closeout → Cycle 2 retune."},
  {step:3,key:"providers",label:"Verify provider connections",detail:"Wix OAuth and Gmail OAuth/profile probes can run before ingest/apply/send gates are enabled; final evidence must be less than 24 hours old."},
  {step:4,key:"history",label:"Dry-run and reconcile history",detail:"Wix orders + Gmail threads must reconcile with no unexplained records or ambiguous auto-merges."},
  {step:5,key:"live-read",label:"Enable live reads first",detail:"Wix ingress capture and Gmail read sync before any provider write/send capability."},
  {step:6,key:"live-apply",label:"Enable controlled applies",detail:"Wix order apply/import mutations only after replay/conflict tests pass."},
  {step:7,key:"outbound",label:"Enable Gmail provider send last",detail:"Draft → owner/tuner approval → provider send remains the required sequence."},
  {step:8,key:"activation",label:"Record production activation",detail:"Run one final zero-blocker audit and record the exact cutover checkpoints."},
]}

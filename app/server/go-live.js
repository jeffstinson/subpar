import { getAccessReadiness } from "./access-control";
import { getAuthReadiness, getDataMode, getPersistenceReadiness } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { getStorageReadiness } from "./storage";
import { getSupabaseServerClient } from "./supabase-server";
import { getWixReadReadiness } from "./wix-client";

export const GO_LIVE_MIGRATIONS = [
  { id:"0001", file:"0001_core.sql", purpose:"Normalized customer / vehicle / tune data core" },
  { id:"0002", file:"0002_identity_storage.sql", purpose:"Internal/customer identities + private buckets" },
  { id:"0003", file:"0003_access_hardening.sql", purpose:"Default-deny browser writes + immutable audit boundaries" },
  { id:"0004", file:"0004_integration_staging.sql", purpose:"Wix/Gmail receipt ledger + outbound queue" },
  { id:"0005", file:"0005_go_live_imports.sql", purpose:"Resumable historical import batches + conflict ledger" },
  { id:"0006", file:"0006_intake_activation.sql", purpose:"Paid-order intake staging + provider cutover checkpoints" },
  { id:"0007", file:"0007_provisioning_state.sql", purpose:"Migration ledger + non-secret connection tests + onboarding checkpoints" },
  { id:"0008", file:"0008_customer_intake_activation.sql", purpose:"Secure customer intake links + atomic vehicle/project activation" },
  { id:"0009", file:"0009_intake_handoff_queue.sql", purpose:"Approval-gated paid-order intake invitation handoff" },
  { id:"0010", file:"0010_vehicle_platform_intelligence.sql", purpose:"BMW/Supra chassis catalog + engine/platform workflow intelligence" },
  { id:"0011", file:"0011_log_intelligence.sql", purpose:"Versioned datalog channel mapping + parser confidence + review metadata" },
  { id:"0012", file:"0012_log_review_workflow.sql", purpose:"Persistent tuner review sessions + annotations + external log references" },
];

export const GO_LIVE_ENV_GROUPS = [
  {id:"supabase",label:"Supabase",required:true,vars:["SUBPAR_SUPABASE_URL","NEXT_PUBLIC_SUBPAR_SUPABASE_URL","NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY","SUBPAR_SUPABASE_SERVICE_ROLE_KEY","SUBPAR_FILE_TICKET_SECRET"]},
  {id:"wix",label:"Wix",required:true,vars:["SUBPAR_WIX_APP_ID","SUBPAR_WIX_APP_SECRET","SUBPAR_WIX_INSTANCE_ID","SUBPAR_WIX_WEBHOOK_PUBLIC_KEY"]},
  {id:"gmail",label:"Gmail",required:true,vars:["SUBPAR_GOOGLE_CLIENT_ID","SUBPAR_GOOGLE_CLIENT_SECRET","SUBPAR_GOOGLE_REFRESH_TOKEN","SUBPAR_GMAIL_ACCOUNT","SUBPAR_GMAIL_PUBSUB_TOPIC"]},
  {id:"gates",label:"Activation gates",required:true,vars:["SUBPAR_REAL_DATA_APPROVED","SUBPAR_CONNECTION_TESTS_ENABLED","SUBPAR_IMPORT_APPLY_ENABLED","SUBPAR_WIX_READ_ENABLED","SUBPAR_WIX_WEBHOOK_ENABLED","SUBPAR_WIX_APPLY_ENABLED","SUBPAR_GMAIL_SYNC_ENABLED","SUBPAR_GMAIL_SEND_ENABLED"]},
];

function envSet(name){if(name==="SUBPAR_SUPABASE_URL")return Boolean(process.env.SUBPAR_SUPABASE_URL||process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL);return Boolean(process.env[name])}

export function getGoLiveReadiness(){
  const persistence=getPersistenceReadiness();
  const auth=getAuthReadiness();
  const access=getAccessReadiness();
  const storage=getStorageReadiness();
  const integrations=getIntegrationReadiness();
  const wixRead=getWixReadReadiness();
  const checks=[
    {id:"isolated",label:"Dedicated Subpar environment",ready:true,detail:"Architecture explicitly rejects shared Stince AI credentials/projects."},
    {id:"supabase",label:"Supabase server connection",ready:persistence.supabaseConfigured,detail:persistence.supabaseConfigured?"Dedicated server credentials detected.":"Dedicated Subpar Supabase URL + service role still required."},
    {id:"public-auth",label:"Supabase public auth",ready:auth.publicAuthConfigured,detail:auth.publicAuthConfigured?"Public auth configuration detected.":"Anon/public key still required for login and private upload handoff."},
    {id:"file-secret",label:"Private file ticket secret",ready:storage.ticketSecretConfigured,detail:storage.ticketSecretConfigured?"Upload finalization signing is ready.":"32+ character server-only file ticket secret required."},
    {id:"roles",label:"Role/portal permission model",ready:access.defaultDeny&&access.customerPortalIdentity==="modeled",detail:"Owner/tuner/staff/customer permissions default deny."},
    {id:"wix-read-creds",label:"Wix app installation credentials",ready:wixRead.credentials,detail:wixRead.credentials?"App ID, secret and Doug-site instance ID detected.":"Wix App ID + secret + installation instance ID are required for historical order reads."},
    {id:"wix-key",label:"Wix signed webhook key",ready:integrations.wix.publicKeyConfigured,detail:integrations.wix.publicKeyConfigured?"Signed Wix ingress can be verified.":"Dedicated Wix webhook public key required."},
    {id:"gmail-oauth",label:"Gmail OAuth",ready:integrations.gmail.oauthConfigured,detail:integrations.gmail.oauthConfigured?"Gmail OAuth credentials detected.":"Dedicated Google OAuth client + refresh token required."},
    {id:"gmail-watch",label:"Gmail watch / PubSub",ready:integrations.gmail.watchConfigured,detail:integrations.gmail.watchConfigured?"Mailbox push cursor path configured.":"Pub/Sub topic required for push-based Gmail sync."},
    {id:"real-data",label:"Real-data approval gate",ready:integrations.realDataApproved,detail:integrations.realDataApproved?"Explicit live-data approval is ON.":"Intentionally OFF until Doug is ready and NDA/access review is complete."},
  ];
  const envGroups=GO_LIVE_ENV_GROUPS.map(group=>({...group,values:group.vars.map(name=>({name,configured:envSet(name)}))}));
  const prerequisitesReady=checks.filter(check=>check.id!=="real-data").every(check=>check.ready);
  const liveReady=prerequisitesReady&&integrations.realDataApproved;
  return {mode:getDataMode(),prerequisitesReady,liveReady,checks,envGroups,migrations:GO_LIVE_MIGRATIONS,integrationReadiness:integrations,wixReadReadiness:wixRead,connectionTestsEnabled:process.env.SUBPAR_CONNECTION_TESTS_ENABLED==="true",importApplyEnabled:process.env.SUBPAR_IMPORT_APPLY_ENABLED==="true",recommendedSequence:[
    "Provision dedicated Subpar Supabase project",
    "Run migrations 0001 through 0012 in order",
    "Run Supabase schema + private bucket preflight",
    "Seed synthetic records and verify dashboard parity",
    "Create Doug owner + synthetic customer identities",
    "Verify login, route boundaries and private files",
    "Validate the BMW/Supra intelligence matrix against Doug-approved examples",
    "Verify customer intake link → intelligence resolution → compatibility review → project activation",
    "Validate MHD parser channel aliases + review heuristics against Doug-approved sample logs",
    "Validate review cockpit comparison, annotations, decisions and Datazap reference behavior",
    "Configure Wix + Gmail credentials with all read/apply/send gates OFF",
    "Enable connection tests and prove Wix/Gmail OAuth without ingesting data",
    "Enable Wix historical read and run dry-run backfill scans",
    "Run Gmail historical dry-run and resolve customer/project conflicts",
    "Enable historical import apply and reconcile provider counts",
    "Enable signed Wix ingress",
    "Enable Wix live apply after replay tests",
    "Enable Gmail read sync from the recorded cutover cursor",
    "Enable outbound Gmail only after message approval tests",
  ]};
}

export function planHistoricalImport({provider,records,months,batchSize}){
  const source=String(provider||"").toLowerCase();
  if(!new Set(["wix","gmail"]).has(source))throw new Error("provider must be wix or gmail");
  const total=Math.max(0,Math.floor(Number(records)||0));
  const lookbackMonths=Math.min(60,Math.max(1,Math.floor(Number(months)||(source==="wix"?36:24))));
  const defaultBatch=source==="wix"?100:250;
  const size=Math.min(1000,Math.max(10,Math.floor(Number(batchSize)||defaultBatch)));
  const batches=total?Math.ceil(total/size):null;
  return {provider:source,importType:source==="wix"?"historical_orders":"historical_threads",records:total||null,lookbackMonths,batchSize:size,batches,mode:"dry-run",mutation:false,dedupe:source==="wix"?["external_source + external_order_id","customer email","existing external_links"]:["Gmail thread id","Gmail message id","customer email","existing external_links"],conflictPolicy:["Never auto-merge two existing customers with different emails","Never overwrite an existing vehicle VIN/chassis conflict","Never duplicate an order/thread already linked to a provider ID","Ambiguous project matches go to manual review instead of guessing"],phases:[
    {step:1,name:"Scan",result:"Count provider records and capture cursor/range only"},
    {step:2,name:"Dry-run",result:"Normalize, match, deduplicate and record conflicts without writes"},
    {step:3,name:"Review",result:"Resolve ambiguous customers/vehicles/projects and confirm counts"},
    {step:4,name:"Apply",result:"Run resumable batches with import_items ledger and idempotent external links"},
    {step:5,name:"Reconcile",result:"Compare provider counts, Subpar counts, skips, conflicts and failures"},
    {step:6,name:"Cutover",result:"Start live webhook/history cursor from the exact historical handoff point"},
  ]};
}

export function goLiveValidationSuite(){return [
  {id:"db",name:"Database parity",passCondition:"Synthetic customer/vehicle/order/project counts match seed manifest"},
  {id:"auth-internal",name:"Doug internal identity",passCondition:"Owner can access tuner routes and management APIs"},
  {id:"auth-customer",name:"Customer isolation",passCondition:"Synthetic customer can access only their portal/project-visible data"},
  {id:"cross-boundary",name:"Cross-boundary denial",passCondition:"Customer token is rejected from tuner routes and internal files"},
  {id:"files",name:"Private file round-trip",passCondition:"Signed upload → verify → register → signed download succeeds"},
  {id:"vehicle-intelligence",name:"Vehicle intelligence",passCondition:"G20/B58TU/MHD, F82/S55/BM3 and G80/S58/EcuTek resolve the Doug-approved workflow, recipe and requirements"},
  {id:"log-intelligence",name:"Datalog intelligence",passCondition:"Doug-approved sample logs map required channels with expected confidence and review flags before persistent analysis is enabled"},
  {id:"log-review",name:"Datalog review workflow",passCondition:"Current vs previous pull deltas, tuner annotations and explicit create-revision/re-log/complete/hold decisions persist and hand off the project correctly"},
  {id:"datazap-reference",name:"Datazap reference boundary",passCondition:"Valid datazap.me URLs link to a project as references without being treated as parsed numeric evidence until a verified source file exists"},
  {id:"intake-link",name:"Customer intake link",passCondition:"Raw token is shown once, only its hash persists, and expiration/revocation is enforced"},
  {id:"intake-activate",name:"Intake activation",passCondition:"Approved intake creates one vehicle + project + intelligence-seeded requirements and replay returns the same project"},
  {id:"wix-oauth",name:"Wix read access",passCondition:"Site-scoped OAuth token succeeds and paid-order search returns a deterministic cursor"},
  {id:"wix-replay",name:"Wix replay safety",passCondition:"Same signed event twice creates one receipt and one order effect"},
  {id:"wix-conflict",name:"Wix ambiguous match",passCondition:"Conflicting customer/vehicle data pauses for review rather than merging"},
  {id:"gmail-history",name:"Gmail history resume",passCondition:"Cursor resumes without duplicating threads/messages"},
  {id:"gmail-expired",name:"Gmail expired cursor",passCondition:"History expiration falls back to controlled full resync"},
  {id:"gmail-send",name:"Outbound email gate",passCondition:"Draft can exist while provider send remains disabled"},
]}

export async function listImportBatches(limit=10){
  if(getDataMode()!=="supabase")return [
    {id:"demo_wix_batch",integration:"wix",importType:"historical_orders",status:"planned",mode:"dry-run",expectedCount:null,scannedCount:0,conflictCount:0,failedCount:0,createdAt:new Date().toISOString()},
    {id:"demo_gmail_batch",integration:"gmail",importType:"historical_threads",status:"planned",mode:"dry-run",expectedCount:null,scannedCount:0,conflictCount:0,failedCount:0,createdAt:new Date().toISOString()},
  ];
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("import_batches").select("id,integration,import_type,status,mode,expected_count,scanned_count,created_count,matched_count,skipped_count,conflict_count,failed_count,created_at,updated_at").order("created_at",{ascending:false}).limit(Math.max(1,Math.min(Number(limit)||10,50)));
  if(error)throw new Error(`Unable to load import batches: ${error.message}`);
  return (data||[]).map(row=>({id:row.id,integration:row.integration,importType:row.import_type,status:row.status,mode:row.mode,expectedCount:row.expected_count,scannedCount:row.scanned_count,createdCount:row.created_count,matchedCount:row.matched_count,skippedCount:row.skipped_count,conflictCount:row.conflict_count,failedCount:row.failed_count,createdAt:row.created_at,updatedAt:row.updated_at}));
}

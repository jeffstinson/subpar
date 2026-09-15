import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root=process.cwd();
const failures=[];
const passes=[];
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const exists=rel=>fs.existsSync(path.join(root,rel));
function check(condition,label,detail=""){
  if(condition){passes.push(label);console.log(`PASS  ${label}`);return;}
  failures.push({label,detail});console.error(`FAIL  ${label}${detail?` — ${detail}`:""}`);
}
function envValue(text,name){
  const line=text.split(/\r?\n/).find(row=>row.trim().startsWith(`${name}=`));
  return line?line.slice(line.indexOf("=")+1).trim():null;
}

const expectedMigrations=[
  "0001_core.sql","0002_identity_storage.sql","0003_access_hardening.sql","0004_integration_staging.sql",
  "0005_go_live_imports.sql","0006_intake_activation.sql","0007_provisioning_state.sql","0008_customer_intake_activation.sql",
  "0009_intake_handoff_queue.sql","0010_vehicle_platform_intelligence.sql","0011_log_intelligence.sql","0012_log_review_workflow.sql",
  "0013_revision_delivery_loop.sql","0014_tune_lifecycle_closeout.sql","0015_activation_readiness.sql","0016_tuner_library.sql",
];
const migrationDir=path.join(root,"supabase/migrations");
const migrations=fs.readdirSync(migrationDir).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
check(migrations.length===expectedMigrations.length,"migration count is exactly 16",`found ${migrations.length}: ${migrations.join(", ")}`);
for(const file of expectedMigrations)check(migrations.includes(file),`migration exists: ${file}`);
const versions=migrations.map(name=>name.slice(0,4));
const duplicateVersions=[...new Set(versions.filter((version,index)=>versions.indexOf(version)!==index))];
check(duplicateVersions.length===0,"migration versions are unique",duplicateVersions.join(", "));
const expectedVersions=Array.from({length:16},(_,i)=>String(i+1).padStart(4,"0"));
check(expectedVersions.every((version,index)=>versions[index]===version),"migration sequence is gap-free 0001–0016",versions.join(", "));

const env=read(".env.example");
const safeFalse=[
  "SUBPAR_MUTATIONS_ENABLED","SUBPAR_ALLOW_SYNTHETIC_SEED","SUBPAR_INTERNAL_AUTH_ENABLED","SUBPAR_PORTAL_AUTH_ENABLED",
  "SUBPAR_REAL_DATA_APPROVED","SUBPAR_INTEGRATION_STAGING_ENABLED","SUBPAR_CONNECTION_TESTS_ENABLED","SUBPAR_IMPORT_APPLY_ENABLED",
  "SUBPAR_WIX_READ_ENABLED","SUBPAR_WIX_WEBHOOK_ENABLED","SUBPAR_WIX_APPLY_ENABLED","SUBPAR_GMAIL_SYNC_ENABLED","SUBPAR_GMAIL_SEND_ENABLED",
  "SUBPAR_FOLLOWUP_AUTOMATION_ENABLED",
];
check(envValue(env,"SUBPAR_DATA_MODE")==="demo",".env example defaults to demo data mode");
check(envValue(env,"SUBPAR_AUTH_MODE")==="demo",".env example defaults to demo auth mode");
for(const name of safeFalse)check(envValue(env,name)==="false",`.env example keeps ${name} disabled`,String(envValue(env,name)));

const repository=read("app/server/repository.js");
check(repository.includes('schemaHead: "0016_tuner_library"'),"repository advertises schema head 0016");
check(repository.includes("0016_tuner_library.sql"),"repository migration manifest contains 0016 tuner library");
const goLive=read("app/server/go-live.js");
check(goLive.includes('{ id:"0016", file:"0016_tuner_library.sql"'),"Go Live manifest contains migration 0016");
check(goLive.includes("Run migrations 0001 through 0016 in order"),"Go Live sequence names schema 0016");
const activation=read("app/server/activation-readiness.js");
check(activation.includes('const EXPECTED_SCHEMA_HEAD="0016"'),"Activation Audit expects schema 0016");
check(activation.includes("provider-evidence-wix")&&activation.includes("provider-evidence-gmail"),"Activation Audit requires provider evidence");
check(activation.includes("24 hours"),"Activation Audit expires stale provider evidence");

const middleware=read("middleware.js");
check(middleware.includes('"/activation"'),"Activation Center is behind internal route protection");
check(middleware.includes('"/validation"'),"Quality Gates workspace is behind internal route protection");
check(middleware.includes('path.startsWith("/portal/")'),"customer portal route boundary exists");
check(middleware.includes("SUBPAR_INTERNAL_AUTH_ENABLED")&&middleware.includes("SUBPAR_PORTAL_AUTH_ENABLED"),"middleware honors both auth gates");
check(exists("app/validation/page.js")&&exists("app/validation/validation.module.css"),"Quality Gates workspace files exist");

const archiveDownload=read("app/api/v1/portal/history/[project]/download/route.js");
check(archiveDownload.includes("requireCustomerPrincipal"),"archived final download requires customer identity");
check(archiveDownload.includes("closeout.final_file_id"),"archived download resolves pinned closeout final_file_id");
check(archiveDownload.includes('file.visibility!=="customer"')&&archiveDownload.includes("file.immutable!==true"),"archived download enforces customer visibility + immutability");

const migration15=read("supabase/migrations/0015_activation_readiness.sql");
check(migration15.includes("subpar_operational_integrity_snapshot"),"0015 defines operational integrity RPC");
check(migration15.includes("grant execute on function subpar_operational_integrity_snapshot() to service_role"),"integrity RPC explicitly grants service_role");
check(migration15.includes("revoke all on function subpar_operational_integrity_snapshot() from authenticated"),"integrity RPC is revoked from authenticated browser role");
const migration16=read("supabase/migrations/0016_tuner_library.sql");
check(migration16.includes("values ('0016','tuner_library')"),"0016 records its unique schema migration version");
check(migration16.includes("grant execute on function subpar_publish_tuner_library_revision(uuid,text) to service_role"),"tuner-library publish RPC explicitly grants service_role");
check(migration16.includes("revoke all on function subpar_publish_tuner_library_revision(uuid,text) from authenticated"),"tuner-library publish RPC is revoked from authenticated browser role");

const preflight=read("app/server/preflight.js");
for(const table of ["tuner_library_revisions","tuner_library_assets","tuner_library_audit"]){
  check(preflight.includes(`"${table}"`),`schema preflight includes ${table}`);
}

const requiredRoutes=[
  "app/api/health/route.js",
  "app/api/v1/readiness/route.js",
  "app/api/v1/activation/audit/route.js",
  "app/api/v1/activation/checkpoint/route.js",
  "app/api/v1/dashboard/route.js",
  "app/api/v1/projects/[id]/route.js",
  "app/api/v1/portal/history/[project]/route.js",
  "app/api/v1/portal/history/[project]/download/route.js",
];
for(const rel of requiredRoutes)check(exists(rel),`required API route exists: ${rel}`);

console.log(`\nRepository validation: ${passes.length} passed, ${failures.length} failed.`);
if(failures.length){
  console.error("\nBlocking repository invariant failures:");
  for(const item of failures)console.error(`- ${item.label}${item.detail?`: ${item.detail}`:""}`);
  process.exit(1);
}

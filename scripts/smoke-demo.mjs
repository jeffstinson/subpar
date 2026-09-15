import process from "node:process";

const base=(process.env.SUBPAR_SMOKE_BASE_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const failures=[];
const passes=[];
function assert(condition,label,detail=""){
  if(condition){passes.push(label);console.log(`PASS  ${label}`);return;}
  failures.push({label,detail});console.error(`FAIL  ${label}${detail?` — ${detail}`:""}`);
}
async function json(path,options={}){
  const response=await fetch(`${base}${path}`,{cache:"no-store",...options,headers:{Accept:"application/json",...(options.headers||{})}});
  let body=null;
  try{body=await response.json()}catch{body={};}
  if(!response.ok)throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}
async function waitForServer(){
  const deadline=Date.now()+90000;
  let last="";
  while(Date.now()<deadline){
    try{
      const response=await fetch(`${base}/api/health`,{cache:"no-store"});
      if(response.ok)return;
      last=`HTTP ${response.status}`;
    }catch(error){last=error.message;}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error(`Subpar server did not become ready within 90s (${last})`);
}

await waitForServer();

try{
  const health=await json("/api/health");
  assert(health.ok===true,"health endpoint is OK");
  assert(health.mode==="demo","runtime is in demo data mode",String(health.mode));
  assert(health.mutationsEnabled===false,"persistent mutations are disabled in smoke runtime");
  assert(health.schemaHead==="0016_tuner_library","health reports schema head 0016",String(health.schemaHead));
  assert(health.goLive?.migrations===16,"health reports 16 ordered migrations",String(health.goLive?.migrations));
  assert(health.integrationStaging?.realDataApproved===false,"real-data approval is disabled in smoke runtime");

  const readiness=await json("/api/v1/readiness");
  assert(readiness.ok===true,"readiness endpoint is OK");
  assert(readiness.repositoryAdapter==="demo-memory","readiness uses demo-memory repository",String(readiness.repositoryAdapter));
  assert(readiness.schemaHead==="0016_tuner_library","readiness reports schema head 0016",String(readiness.schemaHead));
  assert(Array.isArray(readiness.schemaMigrations)&&readiness.schemaMigrations.length===16,"readiness exposes all 16 migrations",String(readiness.schemaMigrations?.length));

  const dashboard=await json("/api/v1/dashboard");
  assert(dashboard.meta?.mode==="demo","dashboard API is in demo mode",String(dashboard.meta?.mode));
  assert(dashboard.meta?.principal?.role==="owner","dashboard demo principal resolves as owner",String(dashboard.meta?.principal?.role));
  assert(Boolean(dashboard.data),"dashboard returns data");

  const project=await json("/api/v1/projects/SP-1842");
  assert(project.data?.projectNumber==="SP-1842","project API resolves synthetic SP-1842",String(project.data?.projectNumber));
  assert(project.meta?.principal?.type==="internal","project API resolves internal demo principal",String(project.meta?.principal?.type));

  const history=await json("/api/v1/portal/history/SP-1842?preview=alex");
  assert(history.ok===true,"customer history API is OK");
  assert(Array.isArray(history.data?.cycles)&&history.data.cycles.length>0,"customer history contains an archived tune cycle");

  const archive=await json("/api/v1/portal/history/SP-1842/download?preview=alex",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({cycleId:"demo_cycle_1"}),
  });
  assert(archive.data?.dryRun===true,"archived final download stays dry-run in demo mode");
  assert(archive.data?.signedUrl===null,"demo archive download never exposes a signed URL");

  const action=await json("/api/v1/actions",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"project.next_action.change",project:"SP-1842",input:{nextAction:"CI smoke only"}}),
  });
  assert(action.data?.dryRun===true&&action.data?.accepted===false,"generic mutation API remains dry-run");

  const activation=await json("/api/v1/activation/audit");
  assert(activation.ok===true,"Activation Audit API is reachable");
  assert(activation.audit?.manifest?.schemaHead==="0016","Activation Audit manifest expects schema 0016",String(activation.audit?.manifest?.schemaHead));
  assert(activation.audit?.phases?.codeFoundation===true,"Activation Audit synthetic code foundation passes");
  assert(activation.audit?.manifest?.realDataApproved===false,"Activation Audit confirms live-data gate is closed");
}catch(error){
  failures.push({label:"runtime smoke exception",detail:error.message});
  console.error(`FAIL  runtime smoke exception — ${error.message}`);
}

console.log(`\nDemo smoke: ${passes.length} passed, ${failures.length} failed.`);
if(failures.length){
  console.error("\nBlocking runtime smoke failures:");
  for(const item of failures)console.error(`- ${item.label}${item.detail?`: ${item.detail}`:""}`);
  process.exit(1);
}

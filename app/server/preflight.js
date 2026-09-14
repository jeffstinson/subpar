import { getPersistenceReadiness } from "./env";
import { getIntegrationReadiness } from "./integrations";
import { getStorageReadiness, storageBuckets } from "./storage";
import { getSupabaseServerClient } from "./supabase-server";
import { getWixReadReadiness } from "./wix-client";

const expectedTables = [
  "customers","vehicles","orders","tune_projects","project_requirements","revisions","logs","files","conversations","messages","events",
  "automation_rules","automation_runs","integration_sync_state","webhook_receipts","internal_users","customer_portal_users","external_links","outbound_actions",
  "import_batches","import_items","intake_requests","intake_access_tokens","integration_cutovers","schema_migrations","connection_tests","setup_checkpoints",
  "vehicle_catalog","logging_recipes","parameter_pack_profiles","platform_workflow_profiles","log_parser_profiles","log_review_sessions","log_annotations","external_log_sources","revision_deliveries",
  "tune_cycles","project_closeouts","lifecycle_followups","activation_audit_runs","activation_audit_checks",
];

function ms(start){return Math.max(0,Date.now()-start)}

async function probeWixToken(){
  const response=await fetch("https://www.wixapis.com/oauth2/token",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({grant_type:"client_credentials",client_id:process.env.SUBPAR_WIX_APP_ID,client_secret:process.env.SUBPAR_WIX_APP_SECRET,instance_id:process.env.SUBPAR_WIX_INSTANCE_ID}),
    cache:"no-store",
  });
  const raw=await response.json();
  const data=raw?.access_token?raw:raw?.body?(typeof raw.body==="string"?JSON.parse(raw.body):raw.body):raw;
  if(!response.ok||!data?.access_token)throw new Error(`Wix OAuth failed: ${data?.error_description||data?.error||raw?.message||response.status}`);
  return data.access_token;
}

async function probeGmailToken(){
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:process.env.SUBPAR_GOOGLE_CLIENT_ID,client_secret:process.env.SUBPAR_GOOGLE_CLIENT_SECRET,refresh_token:process.env.SUBPAR_GOOGLE_REFRESH_TOKEN,grant_type:"refresh_token"}),
    cache:"no-store",
  });
  const data=await response.json();
  if(!response.ok||!data.access_token)throw new Error(`Gmail OAuth refresh failed: ${data.error_description||data.error||response.status}`);
  return data.access_token;
}

export async function probeSupabaseSchema(){
  const readiness=getPersistenceReadiness();
  if(!readiness.supabaseConfigured)return {provider:"supabase",status:"skipped",detail:"Supabase server credentials are not configured",latencyMs:0,tables:[]};
  const start=Date.now();
  const supabase=getSupabaseServerClient();
  const results=await Promise.all(expectedTables.map(async table=>{
    try{const {error}=await supabase.from(table).select("*",{head:true,count:"exact"});return {table,exists:!error,error:error?.message||null}}
    catch(error){return {table,exists:false,error:error.message}}
  }));
  const missing=results.filter(item=>!item.exists).map(item=>item.table);
  let versions=[];
  if(!missing.includes("schema_migrations")){const {data,error}=await supabase.from("schema_migrations").select("version,name,applied_at").order("version",{ascending:true});if(!error)versions=data||[]}
  return {provider:"supabase",status:missing.length?"fail":"pass",detail:missing.length?`${missing.length} expected table(s) missing`:`${expectedTables.length} expected tables available`,latencyMs:ms(start),tables:results,missing,migrations:versions};
}

export async function probePrivateStorage(){
  const storage=getStorageReadiness();
  if(!storage.configured)return {provider:"storage",status:"skipped",detail:"Private storage is not configured",latencyMs:0,buckets:[]};
  const start=Date.now();
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.storage.listBuckets();
  if(error)return {provider:"storage",status:"fail",detail:error.message,latencyMs:ms(start),buckets:[]};
  const expected=Object.values(storageBuckets());
  const actual=(data||[]).map(bucket=>({id:bucket.id,name:bucket.name,public:Boolean(bucket.public)}));
  const missing=expected.filter(name=>!actual.some(bucket=>bucket.id===name||bucket.name===name));
  const publicBuckets=actual.filter(bucket=>expected.includes(bucket.id||bucket.name)&&bucket.public).map(bucket=>bucket.name||bucket.id);
  return {provider:"storage",status:missing.length||publicBuckets.length?"fail":"pass",detail:missing.length?`${missing.length} private bucket(s) missing`:publicBuckets.length?`${publicBuckets.length} Subpar bucket(s) unexpectedly public`:`${expected.length} private buckets verified`,latencyMs:ms(start),buckets:actual.filter(bucket=>expected.includes(bucket.id)||expected.includes(bucket.name)),missing,publicBuckets};
}

export async function probeWixConnection(){
  const readiness=getWixReadReadiness();
  if(!readiness.credentials)return {provider:"wix",status:"skipped",detail:"Wix App ID, secret and installation instance ID are incomplete",latencyMs:0};
  if(process.env.SUBPAR_CONNECTION_TESTS_ENABLED!=="true")return {provider:"wix",status:"skipped",detail:"Connection-test gate is disabled",latencyMs:0};
  if(process.env.SUBPAR_REAL_DATA_APPROVED!=="true")return {provider:"wix",status:"skipped",detail:"Real-data approval gate is closed",latencyMs:0};
  const start=Date.now();
  try{const token=await probeWixToken();return {provider:"wix",status:token?"pass":"fail",detail:token?"Site-scoped Wix OAuth token issued successfully":"Wix OAuth did not return a token",latencyMs:ms(start),tokenExposed:false,readEnabled:readiness.readEnabled}}
  catch(error){return {provider:"wix",status:"fail",detail:error.message,latencyMs:ms(start),tokenExposed:false,readEnabled:readiness.readEnabled}}
}

export async function probeGmailConnection(){
  const integration=getIntegrationReadiness();
  if(!integration.gmail.oauthConfigured)return {provider:"gmail",status:"skipped",detail:"Gmail OAuth credentials are incomplete",latencyMs:0};
  if(process.env.SUBPAR_CONNECTION_TESTS_ENABLED!=="true")return {provider:"gmail",status:"skipped",detail:"Connection-test gate is disabled",latencyMs:0};
  if(process.env.SUBPAR_REAL_DATA_APPROVED!=="true")return {provider:"gmail",status:"skipped",detail:"Real-data approval gate is closed",latencyMs:0};
  const start=Date.now();
  try{
    const token=await probeGmailToken();
    const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error?.message||`Gmail profile probe failed (${response.status})`);
    return {provider:"gmail",status:"pass",detail:"Gmail OAuth and mailbox profile access verified",latencyMs:ms(start),emailAddress:data.emailAddress||null,historyId:data.historyId?String(data.historyId):null,messagesTotal:data.messagesTotal??null,threadsTotal:data.threadsTotal??null,tokenExposed:false,syncEnabled:integration.gmail.syncEnabled};
  }catch(error){return {provider:"gmail",status:"fail",detail:error.message,latencyMs:ms(start),tokenExposed:false,syncEnabled:integration.gmail.syncEnabled}}
}

async function storeConnectionTest(result,testedBy){
  if(!getPersistenceReadiness().supabaseConfigured)return;
  try{
    const supabase=getSupabaseServerClient();
    await supabase.from("connection_tests").insert({provider:result.provider,test_type:result.provider==="supabase"?"schema":result.provider==="storage"?"private_buckets":"oauth_connection",status:result.status,latency_ms:result.latencyMs??null,detail:result.detail||null,metadata:{missing:result.missing||undefined,migrations:result.migrations?.map(item=>item.version)||undefined,emailAddress:result.provider==="gmail"?result.emailAddress||undefined:undefined},tested_by:testedBy||"Subpar OS"});
  }catch{}
}

export async function runPreflight({scopes=["supabase","storage"],testedBy="Doug Talmadge"}={}){
  const allowed=new Set(["supabase","storage","wix","gmail"]);
  const requested=[...new Set((scopes||[]).map(scope=>String(scope).toLowerCase()).filter(scope=>allowed.has(scope)))];
  const tests=[];
  for(const scope of requested){
    let result;
    if(scope==="supabase")result=await probeSupabaseSchema();
    else if(scope==="storage")result=await probePrivateStorage();
    else if(scope==="wix")result=await probeWixConnection();
    else result=await probeGmailConnection();
    tests.push(result);if(result.status!=="skipped")await storeConnectionTest(result,testedBy);
  }
  const failed=tests.filter(test=>test.status==="fail");
  const passed=tests.filter(test=>test.status==="pass");
  return {ok:failed.length===0,tests,summary:{requested:tests.length,passed:passed.length,failed:failed.length,skipped:tests.length-passed.length-failed.length},connectionTestGate:process.env.SUBPAR_CONNECTION_TESTS_ENABLED==="true",realDataApproved:process.env.SUBPAR_REAL_DATA_APPROVED==="true"};
}

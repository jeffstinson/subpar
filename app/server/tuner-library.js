import crypto from "node:crypto";
import { getDataMode, mutationsEnabled } from "./env";
import { getSupabaseServerClient } from "./supabase-server";
import { loggingRecipes, parameterPackProfiles } from "../lib/vehicle-intelligence";

const ENTITY_TYPES=new Set(["logging_recipe","parameter_pack","workflow_profile"]);
const clean=value=>String(value??"").trim();
const now=()=>new Date().toISOString();

function demoWorkflowProfiles(){
  const profiles=[];
  const combos=[
    ["MHD","N55","mhd-n55-v1","mhd-n55-pack"],["MHD","B58","mhd-b58-v1","mhd-b58-pack"],["MHD","B58TU","mhd-b58tu-v1","mhd-b58tu-pack"],["MHD","S55","mhd-s55-v1","mhd-s55-pack"],["MHD","S58","mhd-s58-v1","mhd-s58-pack"],
    ["BM3","N55","bm3-n55-v1","bm3-n55-pack"],["BM3","B58","bm3-b58-v1","bm3-b58-pack"],["BM3","B58TU","bm3-b58tu-v1","bm3-b58tu-pack"],["BM3","S55","bm3-s55-v1","bm3-s55-pack"],["BM3","S58","bm3-s58-v1","bm3-s58-pack"],
    ["EcuTek","B58","ecutek-b58-v1","ecutek-b58-pack"],["EcuTek","B58TU","ecutek-b58tu-v1","ecutek-b58tu-pack"],["EcuTek","S58","ecutek-s58-v1","ecutek-s58-pack"],
  ];
  for(const [platform,engine,recipe,pack] of combos){
    profiles.push({entityType:"workflow_profile",entityKey:`${platform.toLowerCase()}-${engine.toLowerCase()}`,title:`${engine} · ${platform}`,platform,engineFamily:engine,status:"published",version:1,compatibilityState:"workflow_ready",loggingRecipeKey:recipe,parameterPackKey:pack,source:"demo"});
  }
  return profiles;
}

function demoEntities(){
  const recipes=Object.values(loggingRecipes).map(item=>({entityType:"logging_recipe",entityKey:item.key,title:item.title,platform:item.platform,engineFamily:item.engineFamily,status:"published",version:item.version,source:"demo",snapshot:{platform:item.platform,engineFamily:item.engineFamily,chassisScope:[],title:item.title,version:item.version,channelGroups:item.channelGroups,customerInstructions:"",tunerNotes:"",active:true}}));
  const packs=Object.values(parameterPackProfiles).map(item=>({entityType:"parameter_pack",entityKey:item.key,title:item.title,platform:item.platform,engineFamily:item.engineFamily,status:item.productionReady?"published":"placeholder",version:item.version,productionReady:item.productionReady,source:"demo",snapshot:{platform:item.platform,engineFamily:item.engineFamily,chassisScope:[],title:item.title,versionLabel:item.version,productionReady:item.productionReady,customerVisible:true,notes:"Awaiting Doug-approved production asset.",metadata:{},active:true}}));
  return [...recipes,...packs,...demoWorkflowProfiles()];
}

function normalizeRevision(row){
  return {id:row.id,entityType:row.entity_type,entityKey:row.entity_key,revisionNumber:row.revision_number,status:row.status,snapshot:row.snapshot||{},changeSummary:row.change_summary||"",createdBy:row.created_by||null,approvedBy:row.approved_by||null,approvedAt:row.approved_at||null,createdAt:row.created_at,updatedAt:row.updated_at};
}

function baseSnapshot(entityType,row){
  if(entityType==="logging_recipe")return {platform:row.platform,engineFamily:row.engine_family,chassisScope:row.chassis_scope||[],title:row.title,channelGroups:row.channel_groups||[],customerInstructions:row.customer_instructions||"",tunerNotes:row.tuner_notes||"",active:row.active!==false};
  if(entityType==="parameter_pack")return {platform:row.platform,engineFamily:row.engine_family,chassisScope:row.chassis_scope||[],title:row.title,versionLabel:row.version_label||"draft",productionReady:Boolean(row.production_ready),customerVisible:row.customer_visible!==false,notes:row.notes||"",metadata:row.metadata||{},active:true};
  return {platform:row.platform,engineFamily:row.engine_family,chassisScope:row.chassis_scope||[],compatibilityState:row.compatibility_state,loggingRecipeKey:row.logging_recipe_key||"",parameterPackKey:row.parameter_pack_key||"",requirements:row.requirements||[],automations:row.automations||[],priority:row.priority??100,notes:row.notes||"",active:row.active!==false};
}

async function loadBaseEntities(supabase){
  const [recipes,packs,profiles]=await Promise.all([
    supabase.from("logging_recipes").select("*").order("platform").order("engine_family"),
    supabase.from("parameter_pack_profiles").select("*").order("platform").order("engine_family"),
    supabase.from("platform_workflow_profiles").select("*").order("platform").order("engine_family"),
  ]);
  const error=recipes.error||packs.error||profiles.error;if(error)throw new Error(`Unable to load tuner library: ${error.message}`);
  return [
    ...(recipes.data||[]).map(row=>({entityType:"logging_recipe",entityKey:row.recipe_key,title:row.title,platform:row.platform,engineFamily:row.engine_family,status:"published",version:row.version,source:"supabase",snapshot:baseSnapshot("logging_recipe",row)})),
    ...(packs.data||[]).map(row=>({entityType:"parameter_pack",entityKey:row.pack_key,title:row.title,platform:row.platform,engineFamily:row.engine_family,status:row.production_ready?"published":"placeholder",version:row.version_label,productionReady:Boolean(row.production_ready),source:"supabase",snapshot:baseSnapshot("parameter_pack",row)})),
    ...(profiles.data||[]).map(row=>({entityType:"workflow_profile",entityKey:row.profile_key,title:`${row.engine_family} · ${row.platform}`,platform:row.platform,engineFamily:row.engine_family,status:row.compatibility_state==="blocked"?"blocked":"published",version:row.version,compatibilityState:row.compatibility_state,source:"supabase",snapshot:baseSnapshot("workflow_profile",row)})),
  ];
}

export async function getTunerLibrary(){
  if(getDataMode()!=="supabase"){
    const entities=demoEntities();
    return {source:"demo",entities,revisions:[],assets:[],audit:[],counts:{entities:entities.length,drafts:0,approved:entities.filter(e=>e.status==="published").length,assets:0}};
  }
  const supabase=getSupabaseServerClient();
  const [entities,{data:revisionRows,error:revisionError},{data:assets,error:assetsError},{data:audit,error:auditError}]=await Promise.all([
    loadBaseEntities(supabase),
    supabase.from("tuner_library_revisions").select("*").order("created_at",{ascending:false}).limit(200),
    supabase.from("tuner_library_assets").select("*").order("created_at",{ascending:false}).limit(100),
    supabase.from("tuner_library_audit").select("*").order("created_at",{ascending:false}).limit(100),
  ]);
  const error=revisionError||assetsError||auditError;if(error)throw new Error(`Unable to load tuner library history: ${error.message}`);
  const revisions=(revisionRows||[]).map(normalizeRevision);
  return {source:"supabase",entities,revisions,assets:assets||[],audit:audit||[],counts:{entities:entities.length,drafts:revisions.filter(r=>new Set(["draft","review"]).has(r.status)).length,approved:revisions.filter(r=>r.status==="approved").length,assets:(assets||[]).length}};
}

async function currentEntitySnapshot(supabase,entityType,entityKey){
  if(entityType==="logging_recipe"){
    const {data,error}=await supabase.from("logging_recipes").select("*").eq("recipe_key",entityKey).maybeSingle();if(error)throw new Error(error.message);return data?baseSnapshot(entityType,data):null;
  }
  if(entityType==="parameter_pack"){
    const {data,error}=await supabase.from("parameter_pack_profiles").select("*").eq("pack_key",entityKey).maybeSingle();if(error)throw new Error(error.message);return data?baseSnapshot(entityType,data):null;
  }
  const {data,error}=await supabase.from("platform_workflow_profiles").select("*").eq("profile_key",entityKey).maybeSingle();if(error)throw new Error(error.message);return data?baseSnapshot(entityType,data):null;
}

export async function createLibraryDraft({entityType,entityKey,snapshot=null,changeSummary="",createdBy="Doug Talmadge"}){
  if(!ENTITY_TYPES.has(entityType))throw new Error("Unsupported library entity type");
  const key=clean(entityKey);if(!key)throw new Error("entityKey is required");
  if(getDataMode()!=="supabase")return {dryRun:true,id:`demo_${crypto.randomBytes(6).toString("hex")}`,entityType,entityKey:key,revisionNumber:1,status:"draft",snapshot:snapshot||{},changeSummary,createdBy,createdAt:now(),updatedAt:now()};
  if(!mutationsEnabled())throw new Error("Tuner library writes require SUBPAR_MUTATIONS_ENABLED=true");
  const supabase=getSupabaseServerClient();
  const base=snapshot||await currentEntitySnapshot(supabase,entityType,key)||{};
  const {data:last,error:lastError}=await supabase.from("tuner_library_revisions").select("revision_number").eq("entity_type",entityType).eq("entity_key",key).order("revision_number",{ascending:false}).limit(1);
  if(lastError)throw new Error(`Unable to determine next library revision: ${lastError.message}`);
  const revisionNumber=Number(last?.[0]?.revision_number||0)+1;
  const {data,error}=await supabase.from("tuner_library_revisions").insert({entity_type:entityType,entity_key:key,revision_number:revisionNumber,status:"draft",snapshot:base,change_summary:clean(changeSummary)||null,created_by:createdBy}).select("*").single();
  if(error)throw new Error(`Unable to create library draft: ${error.message}`);
  await supabase.from("tuner_library_audit").insert({entity_type:entityType,entity_key:key,library_revision_id:data.id,action:"draft_created",actor:createdBy,detail:clean(changeSummary)||null,metadata:{revisionNumber}});
  return normalizeRevision(data);
}

export async function updateLibraryDraft(id,{snapshot,changeSummary,actor="Doug Talmadge"}){
  if(getDataMode()!=="supabase")return {dryRun:true,id,status:"draft",snapshot:snapshot||{},changeSummary:clean(changeSummary),updatedAt:now()};
  if(!mutationsEnabled())throw new Error("Tuner library writes require SUBPAR_MUTATIONS_ENABLED=true");
  const supabase=getSupabaseServerClient();
  const {data:existing,error:loadError}=await supabase.from("tuner_library_revisions").select("*").eq("id",id).single();
  if(loadError)throw new Error(`Unable to load library draft: ${loadError.message}`);
  if(!new Set(["draft","review"]).has(existing.status))throw new Error("Only draft/review library revisions can be edited");
  const {data,error}=await supabase.from("tuner_library_revisions").update({snapshot:snapshot||existing.snapshot,change_summary:changeSummary!==undefined?clean(changeSummary)||null:existing.change_summary,status:"draft",updated_at:now()}).eq("id",id).select("*").single();
  if(error)throw new Error(`Unable to update library draft: ${error.message}`);
  await supabase.from("tuner_library_audit").insert({entity_type:data.entity_type,entity_key:data.entity_key,library_revision_id:data.id,action:"draft_updated",actor,detail:data.change_summary,metadata:{revisionNumber:data.revision_number}});
  return normalizeRevision(data);
}

export async function submitLibraryDraft(id,{actor="Doug Talmadge"}={}){
  if(getDataMode()!=="supabase")return {dryRun:true,id,status:"review",updatedAt:now()};
  if(!mutationsEnabled())throw new Error("Tuner library writes require SUBPAR_MUTATIONS_ENABLED=true");
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("tuner_library_revisions").update({status:"review",updated_at:now()}).eq("id",id).eq("status","draft").select("*").maybeSingle();
  if(error)throw new Error(`Unable to submit library draft: ${error.message}`);if(!data)throw new Error("Only a draft can be submitted for review");
  await supabase.from("tuner_library_audit").insert({entity_type:data.entity_type,entity_key:data.entity_key,library_revision_id:data.id,action:"submitted_for_review",actor,detail:data.change_summary,metadata:{revisionNumber:data.revision_number}});
  return normalizeRevision(data);
}

export async function publishLibraryDraft(id,{actor="Doug Talmadge"}={}){
  if(getDataMode()!=="supabase")return {dryRun:true,id,status:"approved",replayed:false,updatedAt:now(),reason:"Demo mode previews publication without changing the intelligence source."};
  if(!mutationsEnabled())throw new Error("Tuner library writes require SUBPAR_MUTATIONS_ENABLED=true");
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.rpc("subpar_publish_tuner_library_revision",{p_revision_id:id,p_actor:actor});
  if(error)throw new Error(`Unable to publish tuner library revision: ${error.message}`);
  return data;
}

export async function cancelLibraryDraft(id,{actor="Doug Talmadge"}={}){
  if(getDataMode()!=="supabase")return {dryRun:true,id,status:"canceled"};
  if(!mutationsEnabled())throw new Error("Tuner library writes require SUBPAR_MUTATIONS_ENABLED=true");
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("tuner_library_revisions").update({status:"canceled",updated_at:now()}).eq("id",id).in("status",["draft","review"]).select("*").maybeSingle();
  if(error)throw new Error(`Unable to cancel library draft: ${error.message}`);if(!data)throw new Error("Library revision cannot be canceled");
  await supabase.from("tuner_library_audit").insert({entity_type:data.entity_type,entity_key:data.entity_key,library_revision_id:data.id,action:"canceled",actor,detail:data.change_summary,metadata:{revisionNumber:data.revision_number}});
  return normalizeRevision(data);
}

import { getDataMode } from "./env";
import { getSupabaseServerClient } from "./supabase-server";
import {
  intelligenceSummary,
  normalizeEngine,
  resolveVehicleIntelligence,
  vehicleIntelligenceCatalog,
} from "../lib/vehicle-intelligence";

const platformKey = (value) => {
  const text = String(value || "").trim();
  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact === "BOOTMOD3" || compact === "BM3") return "BM3";
  if (compact === "ECUTEK") return "EcuTek";
  if (compact === "MHD") return "MHD";
  return text;
};
const chassisCodes = (value) => String(value || "").toUpperCase().split(/[\/,+ ]+/).map(v => v.trim()).filter(Boolean);

function dbVehicleView(row){
  return {
    key:row.vehicle_key,
    group:row.make,
    make:row.make,
    label:row.model,
    model:row.model,
    chassis:row.chassis||[],
    years:row.year_end?`${row.year_start || ""}–${row.year_end}`:`${row.year_start || ""}+`,
    engineDisplay:(row.engine_families||[]).join(" / "),
    engineFamilies:row.engine_families||[],
    tankGallons:Number(row.tank_gallons)||null,
    aliases:row.aliases||[],
  };
}

function recipeView(row){
  if(!row)return null;
  return {key:row.recipe_key,platform:row.platform,engineFamily:row.engine_family,title:row.title,version:row.version,channelGroups:row.channel_groups||[],customerInstructions:row.customer_instructions||null,tunerNotes:row.tuner_notes||null};
}
function packView(row){
  if(!row)return null;
  return {key:row.pack_key,platform:row.platform,engineFamily:row.engine_family,title:row.title,version:row.version_label,productionReady:Boolean(row.production_ready),customerVisible:Boolean(row.customer_visible),notes:row.notes||null};
}

export async function getVehicleIntelligenceCatalogServer(){
  if(getDataMode()!=="supabase")return {source:"demo",vehicles:vehicleIntelligenceCatalog,summary:intelligenceSummary()};
  const supabase=getSupabaseServerClient();
  const {data,error}=await supabase.from("vehicle_catalog").select("vehicle_key,make,model,chassis,year_start,year_end,engine_families,tank_gallons,aliases,active").eq("active",true).order("make").order("model");
  if(error)throw new Error(`Unable to load vehicle intelligence catalog: ${error.message}`);
  const vehicles=(data||[]).map(dbVehicleView);
  return {source:"supabase",vehicles,summary:{vehicles:vehicles.length,engines:[...new Set(vehicles.flatMap(v=>v.engineFamilies))],platforms:["MHD","BM3","EcuTek"]}};
}

export async function resolveVehicleIntelligenceServer(input={}){
  const fallback=resolveVehicleIntelligence(input);
  if(getDataMode()!=="supabase")return {...fallback,source:"demo",profileKey:null};

  const supabase=getSupabaseServerClient();
  const engine=normalizeEngine(input.engine||fallback.engine);
  const platform=platformKey(input.platform||fallback.platform);
  const codes=chassisCodes(input.chassis||fallback.chassis?.join("/")||"");

  const [{data:vehicles,error:vehicleError},{data:profiles,error:profileError}]=await Promise.all([
    supabase.from("vehicle_catalog").select("vehicle_key,make,model,chassis,year_start,year_end,engine_families,tank_gallons,aliases,active").eq("active",true),
    engine&&platform?supabase.from("platform_workflow_profiles").select("profile_key,platform,engine_family,chassis_scope,compatibility_state,logging_recipe_key,parameter_pack_key,requirements,automations,priority,version,notes").eq("active",true).eq("platform",platform).eq("engine_family",engine).order("priority",{ascending:false}).order("version",{ascending:false}):Promise.resolve({data:[],error:null}),
  ]);
  if(vehicleError||profileError)throw new Error(vehicleError?.message||profileError?.message||"Unable to resolve vehicle intelligence");

  const vehicleRow=(vehicles||[]).find(row=>codes.some(code=>(row.chassis||[]).map(item=>String(item).toUpperCase()).includes(code)))||null;
  const scoped=(profiles||[]).filter(row=>!(row.chassis_scope||[]).length||codes.some(code=>(row.chassis_scope||[]).map(item=>String(item).toUpperCase()).includes(code)));
  const profile=scoped.sort((a,b)=>((b.chassis_scope||[]).length-(a.chassis_scope||[]).length)||(b.priority-a.priority)||(b.version-a.version))[0]||null;

  let recipe=null,pack=null;
  if(profile?.logging_recipe_key){const {data}=await supabase.from("logging_recipes").select("*").eq("recipe_key",profile.logging_recipe_key).maybeSingle();recipe=recipeView(data)}
  if(profile?.parameter_pack_key){const {data}=await supabase.from("parameter_pack_profiles").select("*").eq("pack_key",profile.parameter_pack_key).maybeSingle();pack=packView(data)}

  const profileRequirements=(profile?.requirements||[]).map(item=>({type:item.type,label:item.label,customerVisible:item.customerVisible!==false,required:item.required!==false,owner:item.customerVisible===false?"tuner":"customer"}));
  const dynamicRequirements=fallback.requirements.filter(item=>new Set(["flash_eligibility","ethanol_content"]).has(item.type));
  const requirements=[...dynamicRequirements,...profileRequirements.filter(item=>!dynamicRequirements.some(existing=>existing.type===item.type))];
  const warnings=[...fallback.warnings];
  if(profile?.notes&&!warnings.includes(profile.notes))warnings.push(profile.notes);
  if(!profile)warnings.unshift("No matching live workflow profile exists in Supabase. Keep this project in manual review.");
  if(pack&&!pack.productionReady&&!warnings.some(item=>item.includes("placeholder")))warnings.push("The matching parameter/logging pack is still a placeholder until Doug approves his production version.");

  return {
    ...fallback,
    source:"supabase",
    profileKey:profile?.profile_key||null,
    vehicle:vehicleRow?dbVehicleView(vehicleRow):fallback.vehicle,
    engine,
    platform,
    state:profile?.compatibility_state||"review_required",
    requirements:requirements.length?requirements:fallback.requirements,
    loggingRecipe:recipe||fallback.loggingRecipe,
    parameterPack:pack||fallback.parameterPack,
    automations:profile?.automations||fallback.automations,
    warnings:[...new Set(warnings)],
  };
}

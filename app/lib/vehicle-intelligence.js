import { fuelVehicles } from "./fuel-vehicles";

const normalize = (value) => String(value || "").trim();
const upper = (value) => normalize(value).toUpperCase();
const platformKey = (value) => {
  const text = upper(value).replace(/[^A-Z0-9]/g, "");
  if (text === "BOOTMOD3" || text === "BM3") return "BM3";
  if (text === "ECUTEK") return "EcuTek";
  if (text === "MHD") return "MHD";
  return normalize(value);
};

const engineAliases = new Map([
  ["B58B30M0", "B58"], ["B58B30M1", "B58TU"], ["B58B30O1", "B58TU"],
  ["B58TU1", "B58TU"], ["B58TU2", "B58TU"], ["B58TU", "B58TU"], ["B58", "B58"],
  ["S55", "S55"], ["S58", "S58"], ["N55", "N55"], ["N54", "N54"],
  ["S63TU", "S63TU"], ["S63", "S63TU"], ["N63TU", "N63TU"], ["N63", "N63TU"],
]);

export function normalizeEngine(value) {
  const key = upper(value).replace(/[^A-Z0-9]/g, "");
  return engineAliases.get(key) || upper(value);
}

function splitChassis(value) {
  return upper(value).split(/[\/,+ ]+/).map((item) => item.trim()).filter(Boolean);
}

export const vehicleIntelligenceCatalog = fuelVehicles.map((vehicle) => ({
  key: vehicle.id,
  group: vehicle.group,
  make: vehicle.id === "a90-supra" ? "Toyota" : "BMW",
  label: vehicle.label,
  model: vehicle.label.replace(/\s*\([^)]*\)\s*/g, "").trim(),
  chassis: splitChassis(vehicle.chassis),
  years: vehicle.years,
  engineDisplay: vehicle.engine,
  engineFamilies: vehicle.engine.split("/").map((item) => normalizeEngine(item)),
  tankGallons: vehicle.tank,
}));

export const loggingRecipes = {
  "mhd-n55-v1": {
    key: "mhd-n55-v1", platform: "MHD", engineFamily: "N55", title: "N55 MHD baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "timing corrections", "HPFP / LPFP", "IAT", "fuel trims", "WGDC"],
  },
  "mhd-b58-v1": {
    key: "mhd-b58-v1", platform: "MHD", engineFamily: "B58", title: "B58 MHD baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "timing corrections", "rail + low-side fuel pressure", "IAT", "fuel trims", "WGDC", "ethanol content when available"],
  },
  "mhd-b58tu-v1": {
    key: "mhd-b58tu-v1", platform: "MHD", engineFamily: "B58TU", title: "B58TU MHD baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "timing corrections", "rail + low-side fuel pressure", "IAT", "fuel trims", "WGDC", "ethanol content when available"],
  },
  "mhd-s55-v1": {
    key: "mhd-s55-v1", platform: "MHD", engineFamily: "S55", title: "S55 MHD baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR banks", "timing corrections", "HPFP / LPFP", "IAT", "fuel trims", "WGDC"],
  },
  "mhd-s58-v1": {
    key: "mhd-s58-v1", platform: "MHD", engineFamily: "S58", title: "S58 MHD baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR banks", "timing corrections", "rail + low-side fuel pressure", "IAT", "fuel trims", "WGDC", "ethanol content when available"],
  },
  "bm3-n55-v1": {
    key: "bm3-n55-v1", platform: "BM3", engineFamily: "N55", title: "N55 bootmod3 baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "timing corrections", "fuel pressure", "IAT", "fuel trims", "WGDC"],
  },
  "bm3-b58-v1": {
    key: "bm3-b58-v1", platform: "BM3", engineFamily: "B58", title: "B58 bootmod3 baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "timing corrections", "rail + low-side fuel pressure", "IAT", "fuel trims", "WGDC"],
  },
  "bm3-b58tu-v1": {
    key: "bm3-b58tu-v1", platform: "BM3", engineFamily: "B58TU", title: "B58TU bootmod3 baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "timing corrections", "rail + low-side fuel pressure", "IAT", "fuel trims", "WGDC", "ethanol content when available"],
  },
  "bm3-s55-v1": {
    key: "bm3-s55-v1", platform: "BM3", engineFamily: "S55", title: "S55 bootmod3 baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR banks", "timing corrections", "fuel pressure", "IAT", "fuel trims", "WGDC"],
  },
  "bm3-s58-v1": {
    key: "bm3-s58-v1", platform: "BM3", engineFamily: "S58", title: "S58 bootmod3 baseline logging recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR banks", "timing corrections", "rail + low-side fuel pressure", "IAT", "fuel trims", "WGDC", "ethanol content when available"],
  },
  "ecutek-b58-v1": {
    key: "ecutek-b58-v1", platform: "EcuTek", engineFamily: "B58", title: "B58 EcuTek / ECU Connect baseline recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "ignition / knock correction", "fuel pressure", "IAT", "fuel trims"],
  },
  "ecutek-b58tu-v1": {
    key: "ecutek-b58tu-v1", platform: "EcuTek", engineFamily: "B58TU", title: "B58TU EcuTek / ECU Connect baseline recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR", "ignition / knock correction", "rail + low-side fuel pressure", "IAT", "fuel trims", "ethanol content when available"],
  },
  "ecutek-s58-v1": {
    key: "ecutek-s58-v1", platform: "EcuTek", engineFamily: "S58", title: "S58 EcuTek / ECU Connect baseline recipe", version: 1,
    channelGroups: ["RPM / load", "boost target + actual", "throttle", "lambda / AFR banks", "ignition / knock correction", "rail + low-side fuel pressure", "IAT", "fuel trims", "ethanol content when available"],
  },
};

export const parameterPackProfiles = {
  "mhd-n55-pack": { key:"mhd-n55-pack", platform:"MHD", engineFamily:"N55", title:"N55 MHD logging parameter pack", version:"draft", productionReady:false },
  "mhd-b58-pack": { key:"mhd-b58-pack", platform:"MHD", engineFamily:"B58", title:"B58 MHD logging parameter pack", version:"draft", productionReady:false },
  "mhd-b58tu-pack": { key:"mhd-b58tu-pack", platform:"MHD", engineFamily:"B58TU", title:"B58TU MHD logging parameter pack", version:"draft", productionReady:false },
  "mhd-s55-pack": { key:"mhd-s55-pack", platform:"MHD", engineFamily:"S55", title:"S55 MHD logging parameter pack", version:"draft", productionReady:false },
  "mhd-s58-pack": { key:"mhd-s58-pack", platform:"MHD", engineFamily:"S58", title:"S58 MHD logging parameter pack", version:"draft", productionReady:false },
  "bm3-n55-pack": { key:"bm3-n55-pack", platform:"BM3", engineFamily:"N55", title:"N55 bootmod3 logging checklist", version:"draft", productionReady:false },
  "bm3-b58-pack": { key:"bm3-b58-pack", platform:"BM3", engineFamily:"B58", title:"B58 bootmod3 logging checklist", version:"draft", productionReady:false },
  "bm3-b58tu-pack": { key:"bm3-b58tu-pack", platform:"BM3", engineFamily:"B58TU", title:"B58TU bootmod3 logging checklist", version:"draft", productionReady:false },
  "bm3-s55-pack": { key:"bm3-s55-pack", platform:"BM3", engineFamily:"S55", title:"S55 bootmod3 logging checklist", version:"draft", productionReady:false },
  "bm3-s58-pack": { key:"bm3-s58-pack", platform:"BM3", engineFamily:"S58", title:"S58 bootmod3 logging checklist", version:"draft", productionReady:false },
  "ecutek-b58-pack": { key:"ecutek-b58-pack", platform:"EcuTek", engineFamily:"B58", title:"B58 ECU Connect logging checklist", version:"draft", productionReady:false },
  "ecutek-b58tu-pack": { key:"ecutek-b58tu-pack", platform:"EcuTek", engineFamily:"B58TU", title:"B58TU ECU Connect logging checklist", version:"draft", productionReady:false },
  "ecutek-s58-pack": { key:"ecutek-s58-pack", platform:"EcuTek", engineFamily:"S58", title:"S58 ECU Connect logging checklist", version:"draft", productionReady:false },
};

const ready = {
  MHD: new Set(["N54","N55","B58","B58TU","S55","S58"]),
  BM3: new Set(["N55","B58","B58TU","S55","S58","N63TU","S63TU"]),
  EcuTek: new Set(["B58","B58TU","S58"]),
};

const recipeKey = (platform, engine) => {
  const p = platformKey(platform).toLowerCase();
  const normalized = engine.toLowerCase();
  const key = `${p}-${normalized}-v1`;
  return loggingRecipes[key] ? key : null;
};
const packKey = (platform, engine) => {
  const p = platformKey(platform).toLowerCase();
  const normalized = engine.toLowerCase();
  const key = `${p}-${normalized}-pack`;
  return parameterPackProfiles[key] ? key : null;
};

const modernUnlockChassis = new Set(["G20","G21","G22","G23","G26","G42","G80","G81","G82","G83","G87","G01","G02","F97","F98","G05","G06","F95","F96","G29","A90","A91"]);

function vehicleMatch({chassis, model, make}) {
  const codes = splitChassis(chassis);
  const modelText = upper(model);
  const makeText = upper(make);
  return vehicleIntelligenceCatalog.find((vehicle) => codes.some((code) => vehicle.chassis.includes(code)))
    || vehicleIntelligenceCatalog.find((vehicle) => (!makeText || upper(vehicle.make) === makeText) && modelText && upper(vehicle.label).includes(modelText))
    || null;
}

function requirementsFor({platform, engine, chassisCodes, fuel}) {
  const items = [];
  const p = platformKey(platform);
  const modern = chassisCodes.some((code) => modernUnlockChassis.has(code));
  if (modern && new Set(["MHD","BM3","EcuTek"]).has(p)) items.push({type:"flash_eligibility",label:"DME / ROM flash eligibility",customerVisible:false,required:true,owner:"tuner",reason:"Modern BMW/Supra platforms can require ECU/ROM or unlock verification before calibration work begins."});
  if (p === "MHD") items.push({type:"stock_file",label:"MHD stock file",customerVisible:true,required:true,owner:"customer"});
  if (p === "BM3") items.push({type:"platform_access",label:"bootmod3 tune-request / platform access",customerVisible:true,required:true,owner:"customer"});
  if (p === "EcuTek") items.push({type:"ecu_rom_info",label:"EcuTek ECU / ROM information",customerVisible:true,required:true,owner:"customer"});
  items.push({type:"logging_setup",label:`${p || "Platform"} logging setup`,customerVisible:true,required:true,owner:"customer"});
  items.push({type:"baseline_log",label:"Baseline datalog",customerVisible:true,required:true,owner:"customer"});
  if (/E\s?\d+|ETHANOL|FLEX/i.test(String(fuel || ""))) items.push({type:"ethanol_content",label:"Verified ethanol content / fuel target",customerVisible:true,required:true,owner:"customer"});
  return items;
}

function automationsFor({platform, engine, pack, recipe}) {
  const p = platformKey(platform);
  const actions = [];
  if (p === "MHD") actions.push("Request MHD stock file if missing");
  if (p === "BM3") actions.push("Request bootmod3 access / tune-request context");
  if (p === "EcuTek") actions.push("Request EcuTek ECU / ROM details");
  if (pack) actions.push(`Attach ${pack.title} when Doug marks it production-ready`);
  if (recipe) actions.push(`Show ${recipe.title} in the project and customer instructions`);
  actions.push("Route received baseline log to Doug's datalog queue");
  actions.push("After revision delivery, request the next approved log or customer feedback");
  return actions;
}

export function resolveVehicleIntelligence(input = {}) {
  const vehicle = vehicleMatch(input);
  const platform = platformKey(input.platform);
  const engine = normalizeEngine(input.engine || (vehicle?.engineFamilies.length === 1 ? vehicle.engineFamilies[0] : ""));
  const chassisCodes = splitChassis(input.chassis || vehicle?.chassis.join("/") || "");
  const workflowReady = Boolean(platform && engine && ready[platform]?.has(engine));
  const recipe = recipeKey(platform, engine) ? loggingRecipes[recipeKey(platform, engine)] : null;
  const pack = packKey(platform, engine) ? parameterPackProfiles[packKey(platform, engine)] : null;
  const requirements = requirementsFor({platform,engine,chassisCodes,fuel:input.fuel});
  const warnings = [];
  if (!vehicle) warnings.push("Vehicle is not in the curated BMW/Supra chassis catalog. Keep manual review enabled.");
  if (!engine) warnings.push("Engine family is missing or ambiguous.");
  if (!platform || !new Set(["MHD","BM3","EcuTek"]).has(platform)) warnings.push("Tuning platform needs manual review.");
  if (!workflowReady) warnings.push("No production workflow profile is marked ready for this engine/platform combination yet.");
  if (chassisCodes.some((code) => modernUnlockChassis.has(code))) warnings.push("Verify exact DME/ROM flash or unlock eligibility before calibration. Workflow support is not a guarantee of ECU compatibility.");
  if (pack && !pack.productionReady) warnings.push("The matching parameter/logging pack is still a placeholder until Doug approves his production version.");

  return {
    vehicle,
    engine,
    platform,
    chassis: chassisCodes,
    state: workflowReady ? "workflow_ready" : "review_required",
    confidence: vehicle && engine && platform ? "vehicle-engine-platform" : engine && platform ? "engine-platform" : "manual-review",
    requirements,
    loggingRecipe: recipe,
    parameterPack: pack,
    automations: automationsFor({platform,engine,pack,recipe}),
    warnings,
    safetyNote: "Subpar workflow readiness does not guarantee ROM/DME support, unlock state, hardware compatibility, or safe operating conditions. Doug remains the approval gate.",
  };
}

export function intelligenceSummary() {
  const engines = [...new Set(Object.values(loggingRecipes).map((item) => item.engineFamily))];
  return {
    vehicles: vehicleIntelligenceCatalog.length,
    engines,
    platforms: ["MHD","BM3","EcuTek"],
    recipes: Object.keys(loggingRecipes).length,
    packs: Object.keys(parameterPackProfiles).length,
  };
}

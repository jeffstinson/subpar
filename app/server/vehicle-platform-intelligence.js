const upper=value=>String(value||"").trim().toUpperCase();
const text=value=>String(value||"").trim();

export const VEHICLE_CATALOG=[
  {key:"e82-135i",make:"BMW",model:"135i",chassis:["E82","E88"],years:[2008,2013],engines:["N54","N55"],tankGallons:14.0,aliases:["1 Series"]},
  {key:"f22-m235i",make:"BMW",model:"M235i",chassis:["F22","F23"],years:[2014,2016],engines:["N55"],tankGallons:13.7,aliases:["2 Series"]},
  {key:"f22-m240i",make:"BMW",model:"M240i",chassis:["F22","F23"],years:[2017,2021],engines:["B58"],tankGallons:13.7,aliases:["2 Series"]},
  {key:"g42-m240i",make:"BMW",model:"M240i",chassis:["G42"],years:[2022,null],engines:["B58TU"],tankGallons:13.7,aliases:["M240","2 Series"]},
  {key:"f87-m2",make:"BMW",model:"M2",chassis:["F87"],years:[2016,2018],engines:["N55"],tankGallons:13.7,aliases:["M2"]},
  {key:"f87-m2c",make:"BMW",model:"M2 Competition",chassis:["F87"],years:[2019,2021],engines:["S55"],tankGallons:13.7,aliases:["M2C","M2 CS"]},
  {key:"g87-m2",make:"BMW",model:"M2",chassis:["G87"],years:[2023,null],engines:["S58"],tankGallons:13.7,aliases:["M2"]},
  {key:"e9x-335i",make:"BMW",model:"335i",chassis:["E90","E91","E92","E93"],years:[2007,2013],engines:["N54","N55"],tankGallons:16.1,aliases:["3 Series"]},
  {key:"f3x-335i",make:"BMW",model:"335i",chassis:["F30","F31","F34"],years:[2012,2015],engines:["N55"],tankGallons:15.8,aliases:["3 Series"]},
  {key:"f3x-340i",make:"BMW",model:"340i",chassis:["F30","F31","F34"],years:[2016,2019],engines:["B58"],tankGallons:15.8,aliases:["3 Series"]},
  {key:"g20-m340i",make:"BMW",model:"M340i",chassis:["G20","G21"],years:[2020,null],engines:["B58TU"],tankGallons:15.6,aliases:["M340","3 Series"]},
  {key:"f80-m3",make:"BMW",model:"M3",chassis:["F80"],years:[2015,2018],engines:["S55"],tankGallons:15.8,aliases:["M3"]},
  {key:"g8x-m3",make:"BMW",model:"M3",chassis:["G80","G81"],years:[2021,null],engines:["S58"],tankGallons:15.6,aliases:["M3 Competition"]},
  {key:"f3x-435i",make:"BMW",model:"435i",chassis:["F32","F33","F36"],years:[2014,2016],engines:["N55"],tankGallons:15.8,aliases:["4 Series"]},
  {key:"f3x-440i",make:"BMW",model:"440i",chassis:["F32","F33","F36"],years:[2017,2020],engines:["B58"],tankGallons:15.8,aliases:["4 Series"]},
  {key:"g22-m440i",make:"BMW",model:"M440i",chassis:["G22","G23","G26"],years:[2021,null],engines:["B58TU"],tankGallons:15.6,aliases:["M440","4 Series"]},
  {key:"f82-m4",make:"BMW",model:"M4",chassis:["F82","F83"],years:[2015,2020],engines:["S55"],tankGallons:15.8,aliases:["M4"]},
  {key:"g82-m4",make:"BMW",model:"M4",chassis:["G82","G83"],years:[2021,null],engines:["S58"],tankGallons:15.6,aliases:["M4 Competition"]},
  {key:"g30-540i",make:"BMW",model:"540i",chassis:["G30","G31"],years:[2017,2023],engines:["B58","B58TU"],tankGallons:18.0,aliases:["5 Series"]},
  {key:"g30-m550i",make:"BMW",model:"M550i",chassis:["G30"],years:[2018,2023],engines:["N63TU"],tankGallons:18.0,aliases:["M550","5 Series"]},
  {key:"f90-m5",make:"BMW",model:"M5",chassis:["F90"],years:[2018,2023],engines:["S63TU"],tankGallons:20.1,aliases:["M5 Competition"]},
  {key:"g01-x3m40i",make:"BMW",model:"X3 M40i",chassis:["G01"],years:[2018,2024],engines:["B58","B58TU"],tankGallons:17.2,aliases:["X3M40","X3"]},
  {key:"g02-x4m40i",make:"BMW",model:"X4 M40i",chassis:["G02"],years:[2019,2024],engines:["B58","B58TU"],tankGallons:17.2,aliases:["X4M40","X4"]},
  {key:"f97-x3m",make:"BMW",model:"X3 M",chassis:["F97"],years:[2020,2024],engines:["S58"],tankGallons:17.2,aliases:["X3M","X3 M Competition"]},
  {key:"f98-x4m",make:"BMW",model:"X4 M",chassis:["F98"],years:[2020,2024],engines:["S58"],tankGallons:17.2,aliases:["X4M","X4 M Competition"]},
  {key:"g05-x540i",make:"BMW",model:"X5 xDrive40i",chassis:["G05"],years:[2019,null],engines:["B58","B58TU"],tankGallons:21.9,aliases:["X5 40i","X5"]},
  {key:"g06-x640i",make:"BMW",model:"X6 xDrive40i",chassis:["G06"],years:[2020,null],engines:["B58","B58TU"],tankGallons:21.9,aliases:["X6 40i","X6"]},
  {key:"f95-x5m",make:"BMW",model:"X5 M",chassis:["F95"],years:[2020,null],engines:["S63TU"],tankGallons:21.9,aliases:["X5M","X5 M Competition"]},
  {key:"f96-x6m",make:"BMW",model:"X6 M",chassis:["F96"],years:[2020,null],engines:["S63TU"],tankGallons:21.9,aliases:["X6M","X6 M Competition"]},
  {key:"g29-z4m40i",make:"BMW",model:"Z4 M40i",chassis:["G29"],years:[2020,null],engines:["B58","B58TU"],tankGallons:13.7,aliases:["Z4"]},
  {key:"a90-supra",make:"Toyota",model:"GR Supra 3.0",chassis:["A90","A91"],years:[2020,null],engines:["B58","B58TU"],tankGallons:13.7,aliases:["Supra","GR Supra"]},
];

const ENGINE_ALIASES={
  "B58B30M0":"B58","B58B30M1":"B58TU","B58B30O1":"B58TU","B58B30P1":"B58TU","B58TU1":"B58TU","B58TU2":"B58TU",
  "S58B30O0":"S58","S58B30T0":"S58","S55B30":"S55","N55B30":"N55","N54B30":"N54","S63B44T4":"S63TU","N63B44":"N63TU",
};
const PLATFORM_ALIASES={"BOOTMOD3":"BM3","BOOTMOD 3":"BM3","BM3":"BM3","MHD":"MHD","ECUTEK":"EcuTek","ECU TEK":"EcuTek","ECU CONNECT":"EcuTek"};

const CHANNELS={
  N55:["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","HPFP / LPFP","IAT","fuel trims","WGDC"],
  B58:["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"],
  B58TU:["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"],
  S55:["RPM / load","boost target + actual","throttle","lambda / AFR banks","timing corrections","HPFP / LPFP","IAT","fuel trims","WGDC"],
  S58:["RPM / load","boost target + actual","throttle","lambda / AFR banks","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"],
};

const SUPPORTED_ENGINES=new Set(["N55","B58","B58TU","S55","S58"]);
const SUPPORTED_PLATFORMS=new Set(["MHD","BM3","EcuTek"]);

export function normalizeEngine(value){const key=upper(value).replace(/[-_ ]/g,"");return ENGINE_ALIASES[key]||upper(value).replace(/\s+/g,"")}
export function normalizePlatform(value){const key=upper(value).replace(/\s+/g," ");return PLATFORM_ALIASES[key]||text(value)}

function modelMatch(vehicle,input){
  const q=text(input.model).toLowerCase();
  if(!q)return true;
  return [vehicle.model,...vehicle.aliases].some(value=>String(value).toLowerCase()===q||String(value).toLowerCase().includes(q)||q.includes(String(value).toLowerCase()));
}
function yearMatch(vehicle,year){if(!year)return true;return year>=vehicle.years[0]&&(!vehicle.years[1]||year<=vehicle.years[1])}

export function findVehicleCatalogMatch(input={}){
  const chassis=upper(input.chassis);
  const year=Number(input.year)||null;
  const make=text(input.make).toLowerCase();
  let candidates=VEHICLE_CATALOG.filter(vehicle=>!make||vehicle.make.toLowerCase()===make);
  if(chassis)candidates=candidates.filter(vehicle=>vehicle.chassis.includes(chassis));
  if(!candidates.length&&input.model)candidates=VEHICLE_CATALOG.filter(vehicle=>(!make||vehicle.make.toLowerCase()===make)&&modelMatch(vehicle,input)&&yearMatch(vehicle,year));
  if(candidates.length>1&&input.model)candidates=candidates.filter(vehicle=>modelMatch(vehicle,input));
  if(candidates.length>1&&year)candidates=candidates.filter(vehicle=>yearMatch(vehicle,year));
  return candidates[0]||null;
}

function baseRequirements(platform){
  if(platform==="MHD")return [
    {type:"stock_file",label:"MHD stock file",customerVisible:true,required:true},
    {type:"logging_setup",label:"MHD logging setup",customerVisible:true,required:true},
    {type:"baseline_log",label:"Baseline datalog",customerVisible:true,required:true},
  ];
  if(platform==="BM3")return [
    {type:"platform_access",label:"bootmod3 tune request / access confirmed",customerVisible:true,required:true},
    {type:"logging_setup",label:"bootmod3 logging setup",customerVisible:true,required:true},
    {type:"baseline_log",label:"Baseline datalog",customerVisible:true,required:true},
  ];
  if(platform==="EcuTek")return [
    {type:"platform_access",label:"EcuTek / ECU Connect setup confirmed",customerVisible:true,required:true},
    {type:"logging_setup",label:"ECU Connect logging setup",customerVisible:true,required:true},
    {type:"baseline_log",label:"Baseline datalog",customerVisible:true,required:true},
  ];
  return [{type:"platform_review",label:"Tuning platform compatibility review",customerVisible:false,required:true}];
}

function dynamicRequirements({fuel,hardware={}}){
  const out=[];
  if(/^E\d+|ETHANOL|FLEX/i.test(text(fuel)))out.push({type:"ethanol_content",label:"Current ethanol content / blend confirmed",customerVisible:true,required:true});
  const turbo=text(hardware.turbo).toLowerCase();
  if(turbo&&!["stock","oem"].includes(turbo))out.push({type:"turbo_details",label:"Turbocharger specification confirmed",customerVisible:true,required:true});
  const fueling=text(hardware.fuelSystem||hardware.fueling).toLowerCase();
  if(fueling&&!["stock","oem"].includes(fueling))out.push({type:"fuel_system_details",label:"Fuel-system hardware confirmed",customerVisible:true,required:true});
  return out;
}

function automationPlan(platform){
  if(platform==="MHD")return ["request_stock_file","attach_parameter_pack","request_baseline_log","route_log_to_tuner"];
  if(platform==="BM3")return ["send_bm3_intake","confirm_tune_request","request_baseline_log","route_log_to_tuner"];
  if(platform==="EcuTek")return ["send_ecutek_setup","confirm_ecu_connect","request_baseline_log","route_log_to_tuner"];
  return ["manual_platform_review"];
}

export function resolveVehiclePlatformIntelligence(input={}){
  const vehicle=findVehicleCatalogMatch(input);
  const engine=normalizeEngine(input.engine);
  const platform=normalizePlatform(input.platform);
  const warnings=[];
  const reviewReasons=[];
  if(!vehicle)reviewReasons.push("Vehicle/chassis is not in the curated Subpar catalog");
  if(vehicle&&engine&&!vehicle.engines.includes(engine))reviewReasons.push(`${engine} does not match the curated engine family for ${vehicle.model} ${vehicle.chassis.join("/")}`);
  if(!SUPPORTED_ENGINES.has(engine))reviewReasons.push(`${engine||"Engine"} does not have a production workflow profile yet`);
  if(!SUPPORTED_PLATFORMS.has(platform))reviewReasons.push(`${platform||"Tuning platform"} does not have a production workflow profile yet`);
  if(["N54","N63TU","S63TU"].includes(engine))warnings.push("Vehicle is recognized, but this engine family remains manual-review only until Doug approves a production workflow.");
  if(vehicle&&input.year&&!yearMatch(vehicle,Number(input.year)))warnings.push(`Model year ${input.year} falls outside the curated ${vehicle.years[0]}–${vehicle.years[1]||"current"} range.`);

  const workflowReady=Boolean(vehicle&&vehicle.engines.includes(engine)&&SUPPORTED_ENGINES.has(engine)&&SUPPORTED_PLATFORMS.has(platform));
  const requirements=[{type:"vehicle_intake",label:"Vehicle intake",customerVisible:true,required:true,status:"complete"},...baseRequirements(platform),...dynamicRequirements({fuel:input.fuel,hardware:input.hardware})];
  const recipe=workflowReady?{
    key:`${platform.toLowerCase().replace("ecutek","ecutek")}-${engine.toLowerCase()}-v1`,
    title:`${engine} ${platform} baseline logging recipe`,
    channelGroups:CHANNELS[engine]||[],
    status:"category-level",
    note:"Exact channel names and the production parameter pack remain Doug-controlled and versioned separately.",
  }:null;
  const parameterPack=workflowReady?{
    key:`${platform.toLowerCase().replace("ecutek","ecutek")}-${engine.toLowerCase()}-pack`,
    title:`${engine} ${platform} logging ${platform==="MHD"?"parameter pack":"checklist"}`,
    versionLabel:"draft",
    productionReady:false,
  }:null;

  return {
    recognized:Boolean(vehicle),
    vehicle,
    engine,
    platform,
    workflowReady,
    compatibilityState:workflowReady?"workflow_ready":"review_required",
    tunerApprovalRequired:true,
    requirements,
    automations:automationPlan(platform),
    loggingRecipe:recipe,
    parameterPack,
    reviewReasons,
    warnings,
    nextAction:workflowReady?"Doug reviews exact ROM/DME, hardware and fuel compatibility":"Manual compatibility review required",
  };
}

export function getVehicleIntelligenceCatalog(){
  return {
    vehicles:VEHICLE_CATALOG,
    platforms:["MHD","BM3","EcuTek"],
    productionWorkflowEngines:[...SUPPORTED_ENGINES],
    manualReviewEngines:["N54","N63TU","S63TU"],
    disclaimer:"Workflow-ready means Subpar OS knows the intake/logging process. It never guarantees ROM/DME/platform support; Doug remains the compatibility authority.",
  };
}

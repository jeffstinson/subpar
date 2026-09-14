import { resolveVehicleIntelligenceServer } from "./intelligence-store";

const cases = [
  {
    id:"g20-b58tu-mhd",
    label:"G20 M340i · B58TU · MHD · E40",
    input:{make:"BMW",model:"M340i",chassis:"G20",engine:"B58TU",platform:"MHD",fuel:"E40"},
    expectedRequirements:["flash_eligibility","stock_file","logging_setup","baseline_log","ethanol_content"],
    expectedRecipe:"mhd-b58tu-v1",
  },
  {
    id:"f82-s55-bm3",
    label:"F82 M4 · S55 · BM3 · 93",
    input:{make:"BMW",model:"M4",chassis:"F82",engine:"S55",platform:"BM3",fuel:"93"},
    expectedRequirements:["platform_access","logging_setup","baseline_log"],
    expectedRecipe:"bm3-s55-v1",
  },
  {
    id:"g80-s58-ecutek",
    label:"G80 M3 · S58 · EcuTek · E50",
    input:{make:"BMW",model:"M3",chassis:"G80",engine:"S58",platform:"EcuTek",fuel:"E50"},
    expectedRequirements:["flash_eligibility","ecu_rom_info","logging_setup","baseline_log","ethanol_content"],
    expectedRecipe:"ecutek-s58-v1",
  },
];

export async function validateVehicleIntelligence(){
  const results=[];
  for(const test of cases){
    try{
      const resolution=await resolveVehicleIntelligenceServer(test.input);
      const requirementTypes=new Set((resolution.requirements||[]).map(item=>item.type));
      const missing=test.expectedRequirements.filter(type=>!requirementTypes.has(type));
      const recipePass=resolution.loggingRecipe?.key===test.expectedRecipe;
      const statePass=resolution.state==="workflow_ready";
      const pass=statePass&&recipePass&&!missing.length;
      results.push({id:test.id,label:test.label,pass,source:resolution.source,profileKey:resolution.profileKey||null,state:resolution.state,recipeKey:resolution.loggingRecipe?.key||null,expectedRecipe:test.expectedRecipe,missingRequirements:missing,requirements:[...requirementTypes]});
    }catch(error){
      results.push({id:test.id,label:test.label,pass:false,error:error.message,missingRequirements:test.expectedRequirements,requirements:[]});
    }
  }
  return {pass:results.every(item=>item.pass),passed:results.filter(item=>item.pass).length,total:results.length,results};
}

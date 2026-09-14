import { getDataMode } from "./env";
import { getProjects } from "./repository";
import { getSupabaseServerClient } from "./supabase-server";

function vehicle(project){return [project?.vehicle?.year,project?.vehicle?.make,project?.vehicle?.model].filter(Boolean).join(" ")||"Vehicle"}
function customer(project){return project?.customer?.name||project?.customer?.email||"Customer"}

function demoOverview(){
  const now=Date.now();
  return {
    mode:"demo",
    counts:{readyToClose:2,archived:3,activeRetunes:1,followups:2},
    readyToClose:[
      {projectNumber:"SP-1842",customer:"Alex Rivera",vehicle:"2021 BMW M340i",platform:"MHD",fuelTarget:"E40",cycleNumber:1,status:"ready_to_deliver",nextAction:"Final QA and customer delivery"},
      {projectNumber:"SP-1834",customer:"Ryan Gallagher",vehicle:"2022 BMW M3 Competition",platform:"EcuTek",fuelTarget:"E50",cycleNumber:1,status:"ready_to_deliver",nextAction:"Close out final delivery"},
    ],
    archived:[
      {projectNumber:"SP-1819",customer:"Demo Customer",vehicle:"2020 BMW M340i",platform:"MHD",fuelTarget:"E30",cycleNumber:1,closedAt:new Date(now-12*86400000).toISOString(),finalRevisionNumber:5},
      {projectNumber:"SP-1808",customer:"Demo Customer",vehicle:"2021 Toyota GR Supra",platform:"MHD",fuelTarget:"93",cycleNumber:1,closedAt:new Date(now-28*86400000).toISOString(),finalRevisionNumber:4},
      {projectNumber:"SP-1794",customer:"Demo Customer",vehicle:"2019 BMW M2 Competition",platform:"BM3",fuelTarget:"93",cycleNumber:1,closedAt:new Date(now-41*86400000).toISOString(),finalRevisionNumber:3},
    ],
    activeRetunes:[{projectNumber:"SP-1777",customer:"Demo Retune",vehicle:"2020 BMW M4",platform:"BM3",fuelTarget:"E40",cycleNumber:2,status:"retune_intake",reason:"hardware_change",changeSummary:"Hybrid turbo + fuel system update"}],
    followups:[
      {id:"demo_fu_1",projectNumber:"SP-1819",customer:"Demo Customer",vehicle:"2020 BMW M340i",status:"scheduled",dueAt:new Date(now-3600000).toISOString()},
      {id:"demo_fu_2",projectNumber:"SP-1808",customer:"Demo Customer",vehicle:"2021 Toyota GR Supra",status:"drafted",dueAt:new Date(now-2*86400000).toISOString()},
    ],
  };
}

export async function getLifecycleOverview(){
  if(getDataMode()!=="supabase")return demoOverview();
  const [projects,supabase]=await Promise.all([getProjects(),Promise.resolve(getSupabaseServerClient())]);
  const projectMap=Object.fromEntries(projects.map(p=>[p.id,p]));
  const [{data:cycles,error:cycleError},{data:closeouts,error:closeoutError},{data:followups,error:followupError}]=await Promise.all([
    supabase.from("tune_cycles").select("id,project_id,cycle_number,status,reason,change_summary,fuel_target,started_at,completed_at").order("cycle_number",{ascending:false}),
    supabase.from("project_closeouts").select("id,project_id,cycle_id,status,final_revision_id,closed_at,baseline_snapshot,updated_at").order("updated_at",{ascending:false}),
    supabase.from("lifecycle_followups").select("id,project_id,cycle_id,status,due_at,outbound_action_id,last_error,drafted_at,sent_at").in("status",["scheduled","drafted","failed"]).order("due_at",{ascending:true}),
  ]);
  if(cycleError)throw new Error(`Unable to load lifecycle cycles: ${cycleError.message}`);
  if(closeoutError)throw new Error(`Unable to load lifecycle closeouts: ${closeoutError.message}`);
  if(followupError)throw new Error(`Unable to load lifecycle follow-ups: ${followupError.message}`);
  const cycleById=Object.fromEntries((cycles||[]).map(x=>[x.id,x]));
  const currentCycleByProject={};for(const c of cycles||[]){if(!currentCycleByProject[c.project_id]||c.cycle_number>currentCycleByProject[c.project_id].cycle_number)currentCycleByProject[c.project_id]=c}
  const readyToClose=projects.filter(p=>!p.closedAt&&(p.stage==="final_delivery"||String(p.status||"").includes("ready_to_deliver"))).map(p=>{const c=currentCycleByProject[p.id];return {projectNumber:p.projectNumber,customer:customer(p),vehicle:vehicle(p),platform:p.platform,fuelTarget:p.fuelTarget,cycleNumber:c?.cycle_number||1,status:p.status,nextAction:p.nextAction||"Final closeout"}});
  const archived=(closeouts||[]).filter(co=>co.status==="closed").map(co=>{const p=projectMap[co.project_id],c=cycleById[co.cycle_id];return {projectNumber:p?.projectNumber||co.project_id,customer:customer(p),vehicle:vehicle(p),platform:p?.platform||null,fuelTarget:c?.fuel_target||p?.fuelTarget||null,cycleNumber:c?.cycle_number||1,closedAt:co.closed_at,finalRevisionNumber:co.baseline_snapshot?.finalRevisionNumber||null}});
  const activeRetunes=projects.filter(p=>!p.closedAt&&(currentCycleByProject[p.id]?.cycle_number||1)>1).map(p=>{const c=currentCycleByProject[p.id];return {projectNumber:p.projectNumber,customer:customer(p),vehicle:vehicle(p),platform:p.platform,fuelTarget:c?.fuel_target||p.fuelTarget,cycleNumber:c?.cycle_number,status:p.status,reason:c?.reason,changeSummary:c?.change_summary}});
  const followupRows=(followups||[]).map(f=>{const p=projectMap[f.project_id];return {id:f.id,projectNumber:p?.projectNumber||f.project_id,customer:customer(p),vehicle:vehicle(p),status:f.status,dueAt:f.due_at,outboundActionId:f.outbound_action_id,lastError:f.last_error}});
  return {mode:"supabase",counts:{readyToClose:readyToClose.length,archived:archived.length,activeRetunes:activeRetunes.length,followups:followupRows.length},readyToClose,archived,activeRetunes,followups:followupRows};
}

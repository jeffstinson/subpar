"use client";

import { useMemo,useState } from "react";
import { Activity, Car, CheckCircle2, ChevronRight, ClipboardList, Cpu, Fuel, Gauge, Search, ShieldCheck, TriangleAlert, Workflow } from "lucide-react";
import styles from "./vehicle-intelligence.module.css";

const sampleByKey={
  "g20-m340i":{year:2021,make:"BMW",model:"M340i",chassis:"G20",engine:"B58TU",platform:"MHD",fuel:"E40",hardware:{turbo:"Stock",fuelSystem:"Dorch Stage 2"}},
  "f82-m4":{year:2016,make:"BMW",model:"M4",chassis:"F82",engine:"S55",platform:"BM3",fuel:"93",hardware:{turbo:"Stock",fuelSystem:"Stock"}},
  "g8x-m3":{year:2022,make:"BMW",model:"M3",chassis:"G80",engine:"S58",platform:"EcuTek",fuel:"E50",hardware:{turbo:"Stock",fuelSystem:"Stock"}},
  "a90-supra":{year:2021,make:"Toyota",model:"GR Supra 3.0",chassis:"A90",engine:"B58TU",platform:"MHD",fuel:"E30",hardware:{turbo:"Stock",fuelSystem:"Stock"}},
};

export default function VehicleIntelligenceClient({catalog}){
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState("g20-m340i");
  const [platform,setPlatform]=useState("MHD");
  const [fuel,setFuel]=useState("E40");
  const [turbo,setTurbo]=useState("Stock");
  const [fuelSystem,setFuelSystem]=useState("Stock");
  const [result,setResult]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return catalog.vehicles;return catalog.vehicles.filter(v=>[v.make,v.model,...v.chassis,...v.engines,...v.aliases].join(" ").toLowerCase().includes(q))},[query,catalog]);
  const vehicle=catalog.vehicles.find(v=>v.key===selected)||filtered[0]||catalog.vehicles[0];
  const engine=vehicle?.engines?.[0]||"";

  async function resolve(){
    if(!vehicle)return;setBusy(true);setError("");
    try{
      const sample=sampleByKey[vehicle.key]||{};
      const input={year:sample.year||vehicle.years?.[0],make:vehicle.make,model:vehicle.model,chassis:sample.chassis||vehicle.chassis?.[0],engine:sample.engine||engine,platform,fuel,hardware:{turbo,fuelSystem}};
      const response=await fetch("/api/v1/intelligence/resolve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
      const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to resolve workflow");setResult(body.intelligence);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  function choose(key){
    const item=catalog.vehicles.find(v=>v.key===key);setSelected(key);setResult(null);setError("");
    const sample=sampleByKey[key];if(sample){setPlatform(sample.platform);setFuel(sample.fuel);setTurbo(sample.hardware.turbo);setFuelSystem(sample.hardware.fuelSystem)}
    else {setPlatform("MHD");setFuel("93");setTurbo("Stock");setFuelSystem("Stock")}
  }

  return <div className={styles.workspace}>
    <aside className={styles.catalog}>
      <div className={styles.sectionHead}><div><span>CURATED VEHICLE CATALOG</span><h2>BMW + Toyota Supra</h2></div><Car size={18}/></div>
      <label className={styles.search}><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search M340i, G80, S58…"/></label>
      <div className={styles.vehicleList}>{filtered.map(item=><button key={item.key} className={selected===item.key?styles.active:""} onClick={()=>choose(item.key)}><div><b>{item.make} {item.model}</b><span>{item.chassis.join(" / ")} · {item.engines.join(" / ")}</span></div><ChevronRight size={14}/></button>)}</div>
    </aside>

    <section className={styles.builder}>
      <div className={styles.vehicleHero}>
        <div><span>SELECTED VEHICLE</span><h2>{vehicle.make} {vehicle.model}</h2><p>{vehicle.chassis.join(" / ")} · {vehicle.years[0]}–{vehicle.years[1]||"current"} · {vehicle.engines.join(" / ")} · {vehicle.tankGallons} gal</p></div>
        <div className={styles.engineBadge}><Cpu size={18}/><b>{engine}</b><small>engine family</small></div>
      </div>

      <div className={styles.controls}>
        <label><span>TUNING PLATFORM</span><select value={platform} onChange={e=>{setPlatform(e.target.value);setResult(null)}}>{catalog.platforms.map(p=><option key={p}>{p}</option>)}</select></label>
        <label><span>FUEL TARGET</span><select value={fuel} onChange={e=>{setFuel(e.target.value);setResult(null)}}>{["91","93","E30","E40","E50","E60","Flex Fuel"].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>TURBO</span><select value={turbo} onChange={e=>{setTurbo(e.target.value);setResult(null)}}><option>Stock</option><option>Hybrid / Upgraded</option><option>Single Turbo</option></select></label>
        <label><span>FUEL SYSTEM</span><select value={fuelSystem} onChange={e=>{setFuelSystem(e.target.value);setResult(null)}}><option>Stock</option><option>Upgraded HPFP</option><option>Port Injection</option><option>Full Fuel System</option></select></label>
      </div>
      <button className={styles.resolve} onClick={resolve} disabled={busy}><Workflow size={15}/>{busy?"Resolving…":"Resolve Subpar workflow"}</button>
      {error&&<div className={styles.error}><TriangleAlert size={14}/>{error}</div>}

      {!result&&<div className={styles.empty}><Gauge size={28}/><b>Choose the setup and resolve it</b><p>Subpar OS will show the exact workflow family, prerequisites, logging recipe and automation plan it would attach to the project.</p></div>}
      {result&&<div className={styles.results}>
        <section className={styles.statusCard}>
          <div className={result.workflowReady?styles.good:styles.warn}>{result.workflowReady?<CheckCircle2 size={18}/>:<TriangleAlert size={18}/>}<div><span>WORKFLOW RESOLUTION</span><b>{result.workflowReady?"Workflow ready":"Manual review required"}</b></div></div>
          <p>{result.nextAction}</p>
          <small><ShieldCheck size={12}/>Exact ROM/DME and hardware compatibility still requires Doug’s approval.</small>
        </section>

        <div className={styles.resultGrid}>
          <section className={styles.panel}><div className={styles.sectionHead}><div><span>PROJECT PREREQUISITES</span><h3>{result.requirements.length} requirements</h3></div><ClipboardList size={17}/></div><div className={styles.requirements}>{result.requirements.map(req=><div key={`${req.type}-${req.label}`}><span className={req.status==="complete"?styles.done:""}>{req.status==="complete"?"✓":"•"}</span><div><b>{req.label}</b><small>{req.customerVisible?"Customer visible":"Internal"} · {req.required?"Required":"Optional"}</small></div></div>)}</div></section>
          <section className={styles.panel}><div className={styles.sectionHead}><div><span>LOGGING RECIPE</span><h3>{result.loggingRecipe?.title||"Manual recipe"}</h3></div><Activity size={17}/></div>{result.loggingRecipe?<><div className={styles.channels}>{result.loggingRecipe.channelGroups.map(channel=><span key={channel}>{channel}</span>)}</div><p className={styles.note}>{result.loggingRecipe.note}</p></>:<p className={styles.note}>No production workflow recipe exists for this combination yet. Route it to Doug instead of guessing.</p>}</section>
          <section className={styles.panel}><div className={styles.sectionHead}><div><span>AUTOMATION PLAN</span><h3>Project handoff</h3></div><Workflow size={17}/></div><div className={styles.steps}>{result.automations.map((step,index)=><div key={step}><i>{index+1}</i><b>{step.replaceAll("_"," ")}</b></div>)}</div></section>
          <section className={styles.panel}><div className={styles.sectionHead}><div><span>PARAMETER PACK</span><h3>{result.parameterPack?.title||"Manual"}</h3></div><Cpu size={17}/></div>{result.parameterPack?<div className={styles.pack}><b>{result.parameterPack.versionLabel}</b><span>{result.parameterPack.productionReady?"Production ready":"Waiting on Doug-approved pack"}</span></div>:<p className={styles.note}>No pack is assigned until Doug approves a platform workflow.</p>}<div className={styles.fuel}><Fuel size={14}/><span>{fuel}</span><small>{/^E|Flex/i.test(fuel)?"ethanol confirmation added to requirements":"gasoline workflow"}</small></div></section>
        </div>

        {(result.reviewReasons.length>0||result.warnings.length>0)&&<section className={styles.review}><TriangleAlert size={18}/><div><b>Review flags</b>{[...result.reviewReasons,...result.warnings].map(item=><p key={item}>{item}</p>)}</div></section>}
      </div>}
    </section>
  </div>;
}

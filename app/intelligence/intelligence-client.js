"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, ClipboardList, FileText, Gauge, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { resolveVehicleIntelligence } from "../lib/vehicle-intelligence";
import styles from "./intelligence.module.css";

export default function IntelligenceClient({vehicles}){
  const [vehicleKey,setVehicleKey]=useState("g20-m340i");
  const selected=useMemo(()=>vehicles.find(v=>v.key===vehicleKey)||vehicles[0],[vehicleKey,vehicles]);
  const [engine,setEngine]=useState("B58TU");
  const [platform,setPlatform]=useState("MHD");
  const [fuel,setFuel]=useState("E40");

  function chooseVehicle(key){
    setVehicleKey(key);
    const next=vehicles.find(v=>v.key===key);
    if(next?.engineFamilies?.length===1)setEngine(next.engineFamilies[0]);
    else if(next?.engineFamilies?.includes("B58TU"))setEngine("B58TU");
    else if(next?.engineFamilies?.length)setEngine(next.engineFamilies[0]);
  }

  const resolution=useMemo(()=>resolveVehicleIntelligence({make:selected?.make,model:selected?.model,chassis:selected?.chassis?.[0],engine,platform,fuel}),[selected,engine,platform,fuel]);
  const ready=resolution.state==="workflow_ready";

  return <section className={styles.workspace}>
    <aside className={styles.selector}>
      <div className={styles.sectionHead}><div><span>TEST A CONFIGURATION</span><h2>Vehicle context</h2></div><Settings2 size={18}/></div>
      <label><span>VEHICLE / CHASSIS</span><select value={vehicleKey} onChange={e=>chooseVehicle(e.target.value)}>{vehicles.map(v=><option key={v.key} value={v.key}>{v.make} {v.label} · {v.chassis.join("/")}</option>)}</select></label>
      <div className={styles.vehicleCard}><div><span>{selected?.years}</span><h3>{selected?.make} {selected?.label}</h3><p>{selected?.chassis.join("/")} · {selected?.engineDisplay}</p></div><div><small>TANK</small><b>{selected?.tankGallons?.toFixed?.(1)||selected?.tankGallons} gal</b></div></div>
      <label><span>ENGINE FAMILY</span><select value={engine} onChange={e=>setEngine(e.target.value)}>{[...new Set([...(selected?.engineFamilies||[]),"N54","N55","B58","B58TU","S55","S58","N63TU","S63TU"])].map(item=><option key={item}>{item}</option>)}</select></label>
      <label><span>TUNING PLATFORM</span><select value={platform} onChange={e=>setPlatform(e.target.value)}><option>MHD</option><option>BM3</option><option>EcuTek</option><option>Other / unsure</option></select></label>
      <label><span>FUEL / TARGET</span><input value={fuel} onChange={e=>setFuel(e.target.value)} placeholder="93, E30, E50, Flex…"/></label>
      <div className={styles.safety}><ShieldCheck size={15}/><p>{resolution.safetyNote}</p></div>
    </aside>

    <div className={styles.main}>
      <section className={`${styles.statusCard} ${ready?styles.ready:styles.review}`}>
        <div><span>RESOLUTION</span><h2>{ready?"Workflow ready":"Manual review required"}</h2><p>{resolution.vehicle?`${resolution.vehicle.make} ${resolution.vehicle.label} resolved from ${resolution.chassis.join("/")}.`:"No curated chassis match found."}</p></div>
        <div className={styles.statusBadge}>{ready?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}<b>{resolution.engine||"ENGINE?"} · {resolution.platform||"PLATFORM?"}</b><small>{resolution.confidence}</small></div>
      </section>

      <section className={styles.grid2}>
        <article className={styles.panel}>
          <div className={styles.sectionHead}><div><span>PROJECT REQUIREMENTS</span><h2>Seeded at activation</h2></div><ClipboardList size={18}/></div>
          <div className={styles.reqList}>{resolution.requirements.map((req,index)=><div key={`${req.type}-${index}`}><i>{index+1}</i><div><b>{req.label}</b><p>{req.type.replaceAll("_"," ")} · {req.owner==="tuner"?"Doug/internal":"customer-visible"}</p></div><em>{req.required?"REQUIRED":"OPTIONAL"}</em></div>)}</div>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHead}><div><span>LOGGING RECIPE</span><h2>{resolution.loggingRecipe?.title||"No recipe mapped"}</h2></div><Gauge size={18}/></div>
          {resolution.loggingRecipe?<><div className={styles.channelGrid}>{resolution.loggingRecipe.channelGroups.map(channel=><span key={channel}>{channel}</span>)}</div><p className={styles.note}>These are channel groups, not Doug’s final exact parameter names. His approved pack remains the production source of truth.</p></>:<div className={styles.empty}>This combination stays in manual review until Doug adds a logging recipe.</div>}
        </article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.panel}>
          <div className={styles.sectionHead}><div><span>PARAMETER / LOGGING PACK</span><h2>{resolution.parameterPack?.title||"No pack mapped"}</h2></div><FileText size={18}/></div>
          {resolution.parameterPack?<div className={styles.pack}><div><span>VERSION</span><b>{resolution.parameterPack.version}</b></div><div><span>PRODUCTION STATUS</span><b>{resolution.parameterPack.productionReady?"APPROVED":"AWAITING DOUG"}</b></div><p>Subpar OS can map the correct pack now, but it will not claim Doug’s real parameter pack exists until he uploads and approves it.</p></div>:<div className={styles.empty}>No versioned pack profile is assigned yet.</div>}
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHead}><div><span>AUTOMATION PLAN</span><h2>What the OS would stage</h2></div><Bot size={18}/></div>
          <div className={styles.autoList}>{resolution.automations.map((item,index)=><div key={item}><i>{index+1}</i><span>{item}</span></div>)}</div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}><div><span>COMPATIBILITY GUARDRAILS</span><h2>Reasons this still needs a tuner</h2></div><Wrench size={18}/></div>
        <div className={styles.warningList}>{resolution.warnings.length?resolution.warnings.map(item=><div key={item}><AlertTriangle size={14}/><span>{item}</span></div>):<div><CheckCircle2 size={14}/><span>No additional workflow warnings for this configured example.</span></div>}</div>
      </section>
    </div>
  </section>;
}

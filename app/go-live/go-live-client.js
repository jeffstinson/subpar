"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, DatabaseZap, Mail, ShoppingBag, Play, RefreshCw, TriangleAlert } from "lucide-react";
import styles from "./go-live.module.css";

const defaults={wix:{records:400,months:36,batchSize:100},gmail:{records:1200,months:24,batchSize:250}};

export default function GoLiveClient(){
  const [provider,setProvider]=useState("wix");
  const [form,setForm]=useState(defaults.wix);
  const [plan,setPlan]=useState(null);
  const [batch,setBatch]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  function switchProvider(next){
    setProvider(next);setForm(defaults[next]);setPlan(null);setBatch(null);setError("");
  }

  async function buildPlan(){
    setBusy(true);setError("");setBatch(null);
    try{
      const res=await fetch("/api/v1/go-live/import-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider,...form,principal:"doug"})});
      const body=await res.json();
      if(!res.ok)throw new Error(body.error||"Unable to build import plan");
      setPlan(body.plan);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  async function createBatch(){
    if(!plan)return;
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/v1/go-live/batches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({integration:provider,importType:plan.importType,mode:"dry-run",expectedCount:plan.records,options:{lookbackMonths:plan.lookbackMonths,batchSize:plan.batchSize},principal:"doug"})});
      const body=await res.json();
      if(!res.ok)throw new Error(body.error||"Unable to create import batch");
      setBatch(body.data);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  const title=provider==="wix"?"Wix historical orders":"Gmail historical threads";
  const icon=provider==="wix"?<ShoppingBag size={17}/>:<Mail size={17}/>;
  const batchLabel=useMemo(()=>plan?.batches?`${plan.batches} resumable batches`:"Batch count calculated after record count",[plan]);

  return <section className={styles.planner}>
    <div className={styles.sectionHead}><div><span>HISTORICAL IMPORT PLANNER</span><h2>Know the cutover before importing anything</h2></div><DatabaseZap size={19}/></div>
    <div className={styles.providerTabs}><button className={provider==="wix"?styles.active:""} onClick={()=>switchProvider("wix")}><ShoppingBag size={14}/>Wix orders</button><button className={provider==="gmail"?styles.active:""} onClick={()=>switchProvider("gmail")}><Mail size={14}/>Gmail threads</button></div>
    <div className={styles.plannerGrid}>
      <div className={styles.planForm}>
        <div className={styles.planTitle}>{icon}<div><b>{title}</b><small>Dry-run first · apply has a separate gate</small></div></div>
        <label><span>Estimated records</span><input type="number" min="0" value={form.records} onChange={e=>setForm({...form,records:Number(e.target.value)})}/></label>
        <label><span>Lookback months</span><input type="number" min="1" max="60" value={form.months} onChange={e=>setForm({...form,months:Number(e.target.value)})}/></label>
        <label><span>Batch size</span><input type="number" min="10" max="1000" value={form.batchSize} onChange={e=>setForm({...form,batchSize:Number(e.target.value)})}/></label>
        <button className={styles.primary} onClick={buildPlan} disabled={busy}>{busy?<RefreshCw className={styles.spin} size={14}/>:<Play size={14}/>}Build dry-run plan</button>
        {plan&&<button className={styles.primary} style={{background:"#111713",color:"#8ed0a0",borderColor:"#365943"}} onClick={createBatch} disabled={busy}><DatabaseZap size={14}/>Create tracked dry-run batch</button>}
        {batch&&<div style={{marginTop:10,padding:"9px 10px",border:"1px solid #31573d",borderRadius:9,background:"rgba(97,189,124,.08)",display:"flex",gap:8,alignItems:"center",color:"#81cc93",fontSize:9}}><CheckCircle2 size={14}/><div><b style={{display:"block",fontSize:10}}>Batch staged</b><span>{batch.id}</span></div></div>}
        {error&&<div className={styles.error}><TriangleAlert size={14}/>{error}</div>}
      </div>
      <div className={styles.planResult}>
        {!plan&&<div className={styles.empty}><DatabaseZap size={24}/><b>No import plan yet</b><p>Choose a source and build a dry-run plan. Nothing is fetched or written from this screen.</p></div>}
        {plan&&<>
          <div className={styles.resultTop}><div><span>IMPORT TYPE</span><b>{plan.importType.replaceAll("_"," ")}</b></div><div><span>MODE</span><b>{plan.mode}</b></div><div><span>BATCHES</span><b>{plan.batches??"TBD"}</b></div></div>
          <p className={styles.batchLine}>{plan.records??"Unknown"} records · {plan.lookbackMonths} months · {plan.batchSize}/batch · {batchLabel}</p>
          <div className={styles.phaseList}>{plan.phases.map(phase=><div key={phase.step}><i>{phase.step}</i><div><b>{phase.name}</b><p>{phase.result}</p></div></div>)}</div>
          <div className={styles.dedupe}><span>DEDUPE KEYS</span>{plan.dedupe.map(item=><b key={item}>{item}</b>)}</div>
        </>}
      </div>
    </div>
  </section>;
}

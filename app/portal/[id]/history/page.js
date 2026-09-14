"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { Archive,ArrowLeft,CheckCircle2,Clock3,FileKey2,History,Loader2,RotateCcw,ShieldCheck,Wrench } from "lucide-react";
import styles from "./history.module.css";

function nice(value){return String(value||"—").replaceAll("_"," ")}

export default function CustomerTuneHistory({params}){
  const id=params?.id||"SP-1842";
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{(async()=>{try{const r=await fetch(`/api/v1/portal/history/${encodeURIComponent(id)}?preview=alex`,{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to load tune history");setData(b.data)}catch(e){setError(e.message)}finally{setLoading(false)}})()},[id]);
  if(loading)return <main className={styles.center}><Loader2 size={24}/><b>Loading your tune history…</b></main>;
  if(error)return <main className={styles.center}><Archive size={24}/><b>{error}</b><Link href={`/portal/${id}`}>Back to portal</Link></main>;
  const project=data?.project||{},cycles=data?.cycles||[],vehicle=[project.vehicle?.year,project.vehicle?.make,project.vehicle?.model].filter(Boolean).join(" ");
  return <main className={styles.page}>
    <header className={styles.top}><Link href={`/portal/${id}`}><ArrowLeft size={14}/>Portal</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><span><b>SUBPAR TUNING</b><small>TUNE HISTORY</small></span></div><span className={styles.project}>{project.projectNumber}</span></header>
    <section className={styles.hero}><div><span>PERMANENT VEHICLE HISTORY</span><h1>{vehicle||"Your vehicle"}</h1><p>Every completed tune cycle stays attached to this vehicle. A future retune starts a new cycle instead of replacing the files, revisions or history you already have.</p><div><b>{project.platform||"—"}</b><b>{project.fuelTarget||"—"}</b><b>{nice(project.status)}</b></div></div><History size={34}/></section>
    <section className={styles.cycles}>{cycles.map(cycle=><article className={styles.cycle} key={cycle.id}>
      <div className={styles.cycleHead}><div><span>CYCLE {cycle.cycleNumber}</span><h2>{cycle.cycleNumber===1?"Original calibration":nice(cycle.reason)}</h2><p>{cycle.changeSummary||"This cycle remains archived as part of the permanent vehicle history."}</p></div><em className={cycle.status==="completed"?styles.complete:styles.active}>{nice(cycle.status)}</em></div>
      <div className={styles.meta}><span><Clock3 size={13}/><b>Started</b>{cycle.startedAt?new Date(cycle.startedAt).toLocaleDateString():"—"}</span><span><CheckCircle2 size={13}/><b>Completed</b>{cycle.completedAt?new Date(cycle.completedAt).toLocaleDateString():"Active"}</span><span><Wrench size={13}/><b>Fuel</b>{cycle.fuelTarget||"—"}</span></div>
      {cycle.closeout?<div className={styles.closeout}>
        <div className={styles.summary}><ShieldCheck size={17}/><div><b>Final Rev {cycle.closeout.finalRevisionNumber||"—"}</b><p>{cycle.closeout.customerSummary||"Completed calibration archived by Subpar Tuning."}</p></div></div>
        {cycle.closeout.aftercareNotes&&<div className={styles.aftercare}><Archive size={15}/><p>{cycle.closeout.aftercareNotes}</p></div>}
        <div className={styles.package}><span><FileKey2 size={14}/>Final package</span><b>{cycle.closeout.packageManifest?.finalTune?.name||"Secure final calibration"}</b><small>{cycle.closeout.packageManifest?.parameterPacks?.length||0} reference pack(s) · private portal delivery</small></div>
      </div>:<div className={styles.open}><RotateCcw size={16}/><span>This tune cycle is still active.</span></div>}
    </article>)}</section>
    {!cycles.length&&<section className={styles.empty}><History size={28}/><b>No tune cycles yet</b><p>Your completed calibration history will appear here.</p></section>}
  </main>;
}

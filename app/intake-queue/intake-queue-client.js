"use client";

import { useMemo,useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, ClipboardCopy, ExternalLink, FileText, Gauge, Link2, Search, ShieldCheck, TriangleAlert, UserRound, Wrench } from "lucide-react";
import styles from "./intake-queue.module.css";

function vehicleName(payload={}){return [payload.year,payload.make,payload.model].filter(Boolean).join(" ")||"Vehicle not submitted"}
function meta(payload={}){return [payload.chassis,payload.engine,payload.platform,payload.fuel].filter(Boolean).join(" · ")||"Waiting on customer details"}

export default function IntakeQueueClient({initialIntakes=[]}){
  const [intakes,setIntakes]=useState(initialIntakes);
  const [selectedId,setSelectedId]=useState(initialIntakes[0]?.id||null);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState("");
  const [link,setLink]=useState("");
  const [reviewNotes,setReviewNotes]=useState("");
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?intakes.filter(item=>[item.customer?.name,item.customer?.email,item.externalOrderId,item.productName,item.platform,vehicleName(item.vehiclePayload)].filter(Boolean).join(" ").toLowerCase().includes(q)):intakes},[query,intakes]);
  const active=intakes.find(item=>item.id===selectedId)||filtered[0]||null;

  async function call(action,extra={}){
    if(!active)return null;setBusy(action);setStatus("");
    try{
      const response=await fetch("/api/v1/intake/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,intakeId:active.id,...extra})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||"Intake action failed");
      if(action==="create-link"){setLink(body.data.url);setStatus(body.data.dryRun?"Preview customer intake link created.":"Secure customer intake link created.");}
      if(action==="review"){setIntakes(rows=>rows.map(row=>row.id===active.id?{...row,compatibilityStatus:body.data.compatibility_status||body.data.compatibilityStatus||extra.decision,compatibilityNotes:body.data.compatibility_notes||reviewNotes,nextAction:body.data.next_action||row.nextAction}:row));setStatus(extra.decision==="compatible"?"Compatibility approved. Project activation is now the next gated action.":"Compatibility review updated.");}
      if(action==="activate"){setIntakes(rows=>rows.map(row=>row.id===active.id?{...row,status:"converted",projectId:body.data.projectId||row.projectId,projectNumber:body.data.projectNumber||row.projectNumber}:row));setStatus(body.data.dryRun?"Preview activation passed. No project was created.":`Project ${body.data.projectNumber} created with ${body.data.intelligenceProfileKey||"manual"} workflow intelligence.`);}
      return body.data;
    }catch(error){setStatus(error.message);return null}finally{setBusy("")}
  }

  async function copy(){if(!link)return;try{await navigator.clipboard.writeText(link);setStatus("Customer intake link copied.")}catch{setStatus("Copy failed — select the link manually.")}}

  return <section className={styles.workspace}>
    <aside className={styles.queue}>
      <div className={styles.queueHead}><div><span>INTAKE QUEUE</span><h2>Orders waiting to become projects</h2></div><b>{filtered.length}</b></div>
      <label className={styles.search}><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, order, vehicle…"/></label>
      <div className={styles.rows}>{filtered.map(item=><button key={item.id} className={active?.id===item.id?styles.active:""} onClick={()=>{setSelectedId(item.id);setStatus("");setLink("")}}><span className={`${styles.dot} ${styles[item.status]||""}`}/><div><b>{item.customer?.name||"Unknown customer"}</b><strong>{item.externalOrderId||item.orderId}</strong><p>{vehicleName(item.vehiclePayload)}</p><small>{item.status.replaceAll("_"," ")} · {item.intelligence?.state?.replaceAll("_"," ")||item.compatibilityStatus||"pending"}</small></div></button>)}</div>
    </aside>

    <section className={styles.detail}>
      {!active?<div className={styles.empty}><UserRound size={25}/><b>No intake selected</b></div>:<>
        <header className={styles.detailHead}><div><span>{active.externalOrderId||active.orderId}</span><h2>{active.customer?.name}</h2><p>{active.customer?.email}</p></div><span className={`${styles.state} ${styles[active.status]||""}`}>{active.status.replaceAll("_"," ")}</span></header>
        <div className={styles.cards}>
          <article><span>PRODUCT</span><b>{active.productName||"Custom Tune"}</b><small>{active.platform||active.vehiclePayload?.platform||"Platform not supplied"}</small></article>
          <article><span>VEHICLE</span><b>{vehicleName(active.vehiclePayload)}</b><small>{meta(active.vehiclePayload)}</small></article>
          <article><span>WORKFLOW RESOLUTION</span><b>{active.intelligence?.state?.replaceAll("_"," ")||"manual review"}</b><small>{active.intelligence?.loggingRecipe?.title||"No logging recipe resolved yet."}</small></article>
        </div>

        {active.intelligence&&<section className={`${styles.panel} ${styles.intelligencePanel}`}><div className={styles.panelHead}><div><span>VEHICLE INTELLIGENCE</span><h3>{active.intelligence.engine||"Engine?"} · {active.intelligence.platform||"Platform?"}</h3><p>The workflow is resolved automatically, but Doug still owns compatibility approval.</p></div><Bot size={18}/></div><div className={styles.intelligenceGrid}><div><span>REQUIREMENTS</span><b>{active.intelligence.requirements?.length||0}</b><small>{active.intelligence.requirements?.slice(0,3).map(item=>item.label).join(" · ")||"Manual setup"}</small></div><div><span>LOGGING RECIPE</span><b>{active.intelligence.loggingRecipe?"MAPPED":"REVIEW"}</b><small>{active.intelligence.loggingRecipe?.title||"No recipe assigned"}</small></div><div><span>PARAMETER PACK</span><b>{active.intelligence.parameterPack?.productionReady?"APPROVED":"PLACEHOLDER"}</b><small>{active.intelligence.parameterPack?.title||"No pack assigned"}</small></div></div><div className={styles.intelligenceActions}><Link href="/intelligence"><Gauge size={13}/>Open Intelligence Center</Link>{active.intelligence.parameterPack&&<span><FileText size={13}/>{active.intelligence.parameterPack.productionReady?"Production pack ready":"Doug pack still needs approval"}</span>}</div>{active.intelligence.warnings?.length>0&&<div className={styles.intelligenceWarnings}>{active.intelligence.warnings.map(item=><div key={item}><TriangleAlert size={12}/><span>{item}</span></div>)}</div>}</section>}

        <section className={styles.panel}><div className={styles.panelHead}><div><span>STEP 1</span><h3>Customer intake link</h3><p>Send one expiring secure link instead of collecting the car across five emails.</p></div><Link2 size={18}/></div><div className={styles.linkActions}><button disabled={Boolean(busy)||active.status==="converted"} onClick={()=>call("create-link")}><Link2 size={13}/>{busy==="create-link"?"Creating…":"Create secure link"}</button>{link&&<><div className={styles.linkBox}>{link}</div><button className={styles.secondary} onClick={copy}><ClipboardCopy size={13}/>Copy</button><a href={link} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Open</a></>}</div></section>

        <section className={styles.panel}><div className={styles.panelHead}><div><span>STEP 2</span><h3>Compatibility review</h3><p>Complete intake means “ready for Doug,” not “automatically compatible.”</p></div><ShieldCheck size={18}/></div><div className={styles.vehicleFacts}>{[["Year",active.vehiclePayload?.year],["Make",active.vehiclePayload?.make],["Model",active.vehiclePayload?.model],["Chassis",active.vehiclePayload?.chassis],["Engine",active.vehiclePayload?.engine],["Transmission",active.vehiclePayload?.transmission],["Platform",active.vehiclePayload?.platform||active.platform],["Fuel",active.vehiclePayload?.fuel]].map(([label,value])=><div key={label}><span>{label}</span><b>{value||"—"}</b></div>)}</div><label className={styles.notes}><span>REVIEW NOTES</span><textarea rows={3} value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} placeholder="ROM concern, hardware mismatch, platform exception, fuel-system note…"/></label><div className={styles.reviewActions}><button disabled={Boolean(busy)||active.status!=="ready"} onClick={()=>call("review",{decision:"compatible",notes:reviewNotes})}><CheckCircle2 size={13}/>Approve compatibility</button><button className={styles.warn} disabled={Boolean(busy)||active.status!=="ready"} onClick={()=>call("review",{decision:"review",notes:reviewNotes})}><TriangleAlert size={13}/>Needs review</button><button className={styles.danger} disabled={Boolean(busy)||active.status!=="ready"} onClick={()=>call("review",{decision:"blocked",notes:reviewNotes})}>Block</button></div></section>

        <section className={`${styles.panel} ${styles.activation}`}><div className={styles.panelHead}><div><span>STEP 3</span><h3>Activate tune project</h3><p>One atomic action creates the vehicle, links the paid order and seeds requirements from the resolved engine/platform workflow.</p></div><Wrench size={18}/></div><div className={styles.activationRow}><div><b>{active.compatibilityStatus==="compatible"?"Ready to activate":"Compatibility approval required"}</b><p>{active.compatibilityStatus==="compatible"?"The transaction is replay-safe and carries the intelligence profile, logging recipe and pack mapping into the project.":"Doug must explicitly approve compatibility before project creation unlocks."}</p></div><button disabled={Boolean(busy)||active.compatibilityStatus!=="compatible"||active.status==="converted"} onClick={()=>call("activate")}><Wrench size={13}/>{busy==="activate"?"Activating…":active.status==="converted"?"Converted":"Create tune project"}</button></div></section>
        {status&&<div className={styles.status}>{status}</div>}
        {active.projectNumber&&<div className={styles.projectLink}><CheckCircle2 size={14}/><span>Intake converted to {active.projectNumber}.</span><Link href={`/project/${active.projectNumber}`}>Open project <ExternalLink size={12}/></Link></div>}
      </>}
    </section>
  </section>;
}

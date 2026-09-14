"use client";

import Link from "next/link";
import { useMemo,useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, FileText, GitCompare, Link2, MessageSquare, Plus, RefreshCw, Save, ShieldCheck } from "lucide-react";
import styles from "./reviews.module.css";

function fmt(value,unit){if(value===null||value===undefined||Number.isNaN(Number(value)))return "—";const n=Number(value);const digits=Math.abs(n)>=100?0:Math.abs(n)>=10?1:2;return `${n.toFixed(digits)}${unit?` ${unit}`:""}`}
function tone(delta,key){if(delta===null)return "";if(key==="boostErrorMaxAbsPsi"||key==="iatPeakF"||key==="timingCorrectionMaxAbsDeg"||key==="throttleClosureCount")return delta<0?styles.goodDelta:delta>0?styles.watchDelta:"";if(key==="hpfpMinPsi"||key==="lpfpMinPsi")return delta>0?styles.goodDelta:delta<0?styles.watchDelta:"";return ""}

export default function ReviewCockpit({initialQueue=[],initialWorkspace}){
  const [queue,setQueue]=useState(initialQueue);
  const [workspace,setWorkspace]=useState(initialWorkspace);
  const [selectedId,setSelectedId]=useState(initialQueue[0]?.id||null);
  const [busy,setBusy]=useState("");
  const [status,setStatus]=useState("");
  const [note,setNote]=useState("Clean overall. Compare the flagged regions against the previous pull before choosing the next revision path.");
  const [customerSummary,setCustomerSummary]=useState("I reviewed the new log. I’ll send the next step once I finish the revision decision.");
  const [annotation,setAnnotation]=useState("");
  const [annotationMetric,setAnnotationMetric]=useState("timingCorrectionMaxAbsDeg");
  const [datazap,setDatazap]=useState("");
  const primary=workspace?.primary;
  const comparison=workspace?.comparison;
  const project=workspace?.project;

  async function load(item){
    setSelectedId(item.id);setBusy("load");setStatus("");
    try{const res=await fetch(`/api/v1/log-reviews?project=${encodeURIComponent(item.projectNumber)}&log=${encodeURIComponent(item.id)}`);const body=await res.json();if(!res.ok)throw new Error(body.error||"Unable to load review");setWorkspace(body.workspace)}catch(error){setStatus(error.message)}finally{setBusy("")}
  }

  async function act(payload){
    const res=await fetch("/api/v1/log-reviews/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const body=await res.json();if(!res.ok)throw new Error(body.error||"Review action failed");return body.data;
  }

  async function decide(decision){
    if(!project||!primary)return;setBusy(decision);setStatus("");
    try{
      const data=await act({action:"decision",project:project.projectNumber,primaryLogId:primary.id,comparisonLogId:comparison?.id||null,decision,note,customerSummary});
      const label=decision==="create_revision"?"Next revision staged":decision==="request_relog"?"Project moved to waiting on customer":decision==="complete"?"Project moved to final delivery":"Project held for tuner review";
      setStatus(data.dryRun?`${label} — preview only.`:label);
      setQueue(rows=>rows.filter(row=>row.id!==primary.id));
    }catch(error){setStatus(error.message)}finally{setBusy("")}
  }

  async function addAnnotation(){
    if(!annotation.trim()||!project||!primary)return;setBusy("annotation");setStatus("");
    try{const data=await act({action:"annotate",project:project.projectNumber,primaryLogId:primary.id,metricKey:annotationMetric,severity:"watch",note:annotation});setWorkspace(current=>({...current,annotations:[...(current.annotations||[]),data]}));setAnnotation("");setStatus(data.dryRun?"Preview annotation added.":"Annotation saved to the review.")}catch(error){setStatus(error.message)}finally{setBusy("")}
  }

  async function addDatazap(){
    if(!datazap.trim()||!project)return;setBusy("datazap");setStatus("");
    try{const res=await fetch("/api/v1/datazap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project:project.projectNumber,url:datazap,revisionId:primary?.revision_id||null})});const body=await res.json();if(!res.ok)throw new Error(body.error||"Unable to link Datazap");setWorkspace(current=>({...current,sourceReferences:[body.data,...(current.sourceReferences||[])]}));setDatazap("");setStatus(body.data.dryRun?"Preview Datazap reference linked.":"Datazap reference linked to this project.")}catch(error){setStatus(error.message)}finally{setBusy("")}
  }

  const flags=primary?.analysis?.flags||[];
  const compareRows=workspace?.comparisonRows||[];
  const annotations=workspace?.annotations||[];
  const sourceReferences=workspace?.sourceReferences||[];
  const mapped=useMemo(()=>primary?.analysis?.confidence??primary?.parserConfidence??0,[primary]);

  return <section className={styles.workspace}>
    <aside className={styles.queue}>
      <div className={styles.sectionHead}><div><span>NEEDS DOUG</span><h2>Review queue</h2></div><b>{queue.length}</b></div>
      <div className={styles.queueRows}>{queue.map(item=><button key={item.id} className={selectedId===item.id?styles.selected:""} onClick={()=>load(item)} disabled={busy==="load"}><div><b>{item.customer}</b><span>{item.projectNumber} · Rev {item.revisionNumber||"—"}</span><p>{item.vehicle}</p><small>{item.fileName} · {item.confidence||0}% mapped</small></div><em>{item.flags} flags</em></button>)}</div>
      {!queue.length&&<div className={styles.emptyQueue}><CheckCircle2 size={20}/><b>Queue clear</b><p>No parsed logs are waiting on Doug.</p></div>}
    </aside>

    <div className={styles.main}>
      {!primary?<div className={styles.emptyMain}><FileText size={28}/><b>No review selected</b><p>Choose a parsed log from the queue.</p></div>:<>
        <section className={styles.reviewHeader}>
          <div><span>{project?.projectNumber} · DATALOG REVIEW</span><h2>{project?.customer?.name||"Customer"} · {project?.vehicle?.year} {project?.vehicle?.make} {project?.vehicle?.model}</h2><p>{project?.vehicle?.engine} · {project?.platform} · {project?.fuelTarget||"Fuel target pending"}</p></div>
          <div className={styles.confidence}><b>{mapped}%</b><span>CHANNEL MAP</span><small>{primary.analysis?.parserVersion||"parser pending"}</small></div>
        </section>

        <section className={styles.pullGrid}>
          <article><span>CURRENT PULL</span><h3>{primary.fileName||primary.file_name}</h3><p>Rev {primary.revisionNumber||project?.currentRevisionNumber} · {primary.status}</p><div><b>{primary.analysis?.metrics?.rpmMin||"—"}–{primary.analysis?.metrics?.rpmMax||"—"}</b><small>RPM RANGE</small></div></article>
          <article><span>COMPARISON</span><h3>{comparison?.fileName||comparison?.file_name||"No previous parsed pull"}</h3><p>{comparison?`Previous parsed context · ${comparison.status}`:"Upload/analyze another pull to enable deltas"}</p><div><b>{comparison?.analysis?.confidence??"—"}{comparison?"%":""}</b><small>CHANNEL MAP</small></div></article>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}><div><span>REVISION / PULL DELTA</span><h2>What changed</h2></div><GitCompare size={18}/></div>
          <div className={styles.compareTable}><div className={styles.compareHead}><span>Metric</span><span>Previous</span><span>Current</span><span>Delta</span></div>{compareRows.map(row=><div key={row.key}><b>{row.label}</b><span>{fmt(row.previous,row.unit)}</span><span>{fmt(row.current,row.unit)}</span><span className={tone(row.delta,row.key)}>{row.delta===null?"—":`${row.delta>0?"+":""}${fmt(row.delta,row.unit)}`}</span></div>)}</div>
        </section>

        <section className={styles.twoCol}>
          <article className={styles.panel}><div className={styles.sectionHead}><div><span>PARSER FLAGS</span><h2>Review context</h2></div><AlertTriangle size={18}/></div><div className={styles.flagList}>{flags.length?flags.map(flag=><div key={`${flag.code}-${flag.title}`} className={styles[flag.severity]||""}><AlertTriangle size={13}/><div><b>{flag.title}</b><p>{flag.detail}</p></div></div>):<div className={styles.noFlags}><CheckCircle2 size={14}/>No configured review flags.</div>}</div><p className={styles.safety}><ShieldCheck size={13}/>Flags are heuristics only. They do not approve or reject a calibration.</p></article>

          <article className={styles.panel}><div className={styles.sectionHead}><div><span>DOUG ANNOTATIONS</span><h2>Human context</h2></div><MessageSquare size={18}/></div><div className={styles.annotations}>{annotations.map(item=><div key={item.id}><span>{item.metricKey||item.metric_key||"General"}</span><b>{item.note}</b><small>{item.rpm?`${item.rpm} RPM · `:""}{item.createdBy||item.created_by||"Doug"}</small></div>)}</div><div className={styles.annotate}><select value={annotationMetric} onChange={e=>setAnnotationMetric(e.target.value)}><option value="timingCorrectionMaxAbsDeg">Timing correction</option><option value="boostErrorMaxAbsPsi">Boost tracking</option><option value="hpfpMinPsi">HPFP</option><option value="throttleClosureCount">Throttle</option><option value="iatPeakF">IAT</option><option value="general">General</option></select><input value={annotation} onChange={e=>setAnnotation(e.target.value)} placeholder="Add Doug's note…"/><button onClick={addAnnotation} disabled={busy==="annotation"||!annotation.trim()}><Plus size={13}/>Add</button></div></article>
        </section>

        <section className={styles.panel}><div className={styles.sectionHead}><div><span>EXTERNAL LOG SOURCES</span><h2>Datazap references</h2></div><Link2 size={18}/></div><div className={styles.datazapRow}><input value={datazap} onChange={e=>setDatazap(e.target.value)} placeholder="https://datazap.me/..."/><button onClick={addDatazap} disabled={busy==="datazap"||!datazap.trim()}><Link2 size={13}/>Link to project</button></div><div className={styles.sourceList}>{sourceReferences.map(item=><div key={item.id||item.externalUrl||item.external_url}><div><b>Datazap</b><span>{item.externalUrl||item.external_url}</span></div><em>{item.status||"reference_only"}</em><a href={item.externalUrl||item.external_url} target="_blank" rel="noreferrer"><ExternalLink size={12}/></a></div>)}</div><p className={styles.safety}><ShieldCheck size={13}/>A Datazap URL is stored as context only until Subpar has verified numeric source data. No undocumented scraping is treated as analysis.</p></section>

        <section className={styles.decisionPanel}>
          <div className={styles.sectionHead}><div><span>TUNER DECISION</span><h2>Doug decides what happens next</h2></div><Save size={18}/></div>
          <div className={styles.notesGrid}><label><span>INTERNAL REVIEW NOTE</span><textarea rows={5} value={note} onChange={e=>setNote(e.target.value)}/></label><label><span>CUSTOMER-SAFE SUMMARY</span><textarea rows={5} value={customerSummary} onChange={e=>setCustomerSummary(e.target.value)}/></label></div>
          <div className={styles.decisionButtons}><button onClick={()=>decide("create_revision")} disabled={Boolean(busy)}><ArrowRight size={14}/><span><b>Create next revision</b><small>Open the next draft and keep work with Doug</small></span></button><button onClick={()=>decide("request_relog")} disabled={Boolean(busy)}><RefreshCw size={14}/><span><b>Request re-log</b><small>Move project to waiting on customer</small></span></button><button onClick={()=>decide("complete")} disabled={Boolean(busy)}><CheckCircle2 size={14}/><span><b>Ready for final delivery</b><small>Advance only from Doug's explicit decision</small></span></button><button onClick={()=>decide("hold")} disabled={Boolean(busy)}><AlertTriangle size={14}/><span><b>Hold / investigate</b><small>Keep it in Doug's review queue</small></span></button></div>
          {status&&<div className={styles.status}>{status}</div>}
          <div className={styles.projectLinks}><Link href={`/project/${project?.projectNumber}`}>Open project <ExternalLink size={12}/></Link><Link href="/log-lab">Open Parser Lab <ExternalLink size={12}/></Link></div>
        </section>
      </>}
    </div>
  </section>;
}

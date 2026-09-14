"use client";

import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { AlertTriangle,Check,CheckCircle2,ChevronRight,Database,History,Loader2,Play,RefreshCw,ServerCog,ShieldAlert,ShieldCheck,Wifi } from "lucide-react";
import styles from "./activation.module.css";

function nice(value){return String(value||"—").replaceAll("_"," ")}
function statusIcon(status){if(status==="pass")return <Check size={12}/>;if(status==="fail")return <ShieldAlert size={12}/>;if(status==="warn")return <AlertTriangle size={12}/>;return <span>–</span>}

export default function ActivationClient(){
  const [payload,setPayload]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState("");

  async function load(){setLoading(true);setError("");try{const r=await fetch("/api/v1/activation/audit",{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to load activation audit");setPayload(b)}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);

  async function run(includeProviderProbes){setBusy(includeProviderProbes?"providers":"audit");setError("");try{const r=await fetch("/api/v1/activation/audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({includeProviderProbes,persist:true})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Activation audit failed");setPayload(b)}catch(e){setError(e.message)}finally{setBusy("")}}

  const audit=payload?.audit||{};
  const checks=audit.checks||[];
  const grouped=useMemo(()=>checks.reduce((acc,item)=>{(acc[item.category]??=[]).push(item);return acc},{}),[checks]);
  const phaseEntries=[
    ["Code foundation",audit.phases?.codeFoundation,"Synthetic end-to-end read path"],
    ["Infrastructure",audit.phases?.infrastructure,"Database, auth, storage, schema and integrity"],
    ["Providers",audit.phases?.providers,"Wix + Gmail credentials and safe gate ordering"],
    ["Historical reconciliation",audit.phases?.historicalReconciled,"Imports reconciled with no unexplained records"],
    ["Live customer data",audit.phases?.readyForLiveData,"Safe to begin controlled real-data cutover"],
    ["Full production",audit.phases?.fullProduction,"Wix replay, Gmail history and outbound send all proven"],
  ];

  if(loading)return <section className={styles.loading}><Loader2 size={26}/><b>Running safe activation checks…</b><p>No provider writes or customer actions occur from this screen.</p></section>;
  if(error&&!payload)return <section className={styles.loading}><ShieldAlert size={26}/><b>{error}</b><button onClick={load}>Try again</button></section>;

  return <section className={styles.shell}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><span>GO-LIVE HARDENING · SCHEMA {audit.manifest?.schemaHead||"—"}</span><h1>Know exactly what is safe to turn on.</h1><p>Subpar OS separates code readiness, infrastructure readiness and real-customer cutover. A green preview does not automatically mean provider writes or Gmail send are safe.</p><div className={styles.heroMeta}><b>{nice(audit.mode)} mode</b><b>{nice(audit.phases?.currentStage)}</b><b>{audit.environment||"preview"}</b>{audit.commit&&<b>{String(audit.commit).slice(0,8)}</b>}</div></div>
      <aside className={`${styles.score} ${styles[audit.summary?.status||"warn"]}`}><span>ACTIVATION AUDIT</span><strong>{audit.summary?.blockers??0}</strong><b>blocking issue{audit.summary?.blockers===1?"":"s"}</b><p>{audit.summary?.pass||0} passed · {audit.summary?.warnings||0} warning{audit.summary?.warnings===1?"":"s"} · {audit.summary?.skipped||0} skipped</p></aside>
    </section>

    <section className={styles.controls}><div><button disabled={Boolean(busy)} onClick={()=>run(false)}><RefreshCw size={14}/>{busy==="audit"?"Running…":"Run Subpar audit"}</button><button className={styles.providerButton} disabled={Boolean(busy)} onClick={()=>run(true)}><Wifi size={14}/>{busy==="providers"?"Testing…":"Run provider preflight"}</button></div><p>Provider preflight is explicit. Wix/Gmail probes still obey the real-data and connection-test gates.</p></section>

    {error&&<div className={styles.error}><AlertTriangle size={15}/>{error}</div>}

    <section className={styles.phases}>{phaseEntries.map(([label,ready,detail])=><article className={ready?styles.phaseReady:styles.phasePending} key={label}><i>{ready?<Check size={13}/>:"·"}</i><div><span>{label}</span><b>{ready?"Ready":"Not ready"}</b><p>{detail}</p></div></article>)}</section>

    <div className={styles.layout}>
      <section className={styles.main}>
        {Object.entries(grouped).map(([category,items])=><article className={styles.panel} key={category}>
          <header><div><span>{nice(category).toUpperCase()}</span><h2>{nice(category)}</h2></div><em>{items.filter(x=>x.status==="pass").length}/{items.length} passing</em></header>
          <div className={styles.checks}>{items.map(item=><div className={`${styles.check} ${styles[item.status]}`} key={item.key}><i>{statusIcon(item.status)}</i><div><b>{nice(item.key)}</b><p>{item.detail}</p></div><em>{item.status}</em></div>)}</div>
        </article>)}
      </section>

      <aside className={styles.side}>
        <article className={styles.panel}><header><div><span>CUTOVER ORDER</span><h2>Green path</h2></div><Play size={17}/></header><div className={styles.sequence}>{(payload?.sequence||[]).map(step=><div key={step.step}><i>{step.step}</i><div><b>{step.label}</b><p>{step.detail}</p></div></div>)}</div></article>

        <article className={styles.panel}><header><div><span>CURRENT MANIFEST</span><h2>Runtime safety</h2></div><ServerCog size={17}/></header><div className={styles.manifest}><span><b>Schema head</b>{audit.manifest?.schemaHead||"—"}</span><span><b>Data mode</b>{audit.mode||"—"}</span><span><b>Mutation gate</b>{audit.manifest?.mutationsEnabled?"ON":"OFF"}</span><span><b>Real-data gate</b>{audit.manifest?.realDataApproved?"ON":"OFF"}</span><span><b>Provider probes</b>{audit.manifest?.providerProbesRequested?"Included":"Not requested"}</span><span><b>Audit persistence</b>{audit.persistence?.persisted?"Recorded":audit.persistence?.reason||"Preview only"}</span></div></article>

        <article className={styles.panel}><header><div><span>AUDIT HISTORY</span><h2>Recent runs</h2></div><History size={17}/></header><div className={styles.history}>{(payload?.history||[]).length?(payload.history||[]).map(run=><div key={run.id}><i className={styles[run.status]}/><div><b>{nice(run.status)} · {run.run_by||"Subpar OS"}</b><span>{run.completed_at?new Date(run.completed_at).toLocaleString():new Date(run.started_at).toLocaleString()}</span></div></div>):<p>No persisted audit runs yet. They begin once isolated Supabase + mutation mode are enabled.</p>}</div></article>

        <article className={styles.next}><Database size={19}/><div><span>SETUP WORKSPACE</span><h3>Go Live Center</h3><p>Provisioning, historical imports and provider cutover controls remain separate from this audit.</p></div><Link href="/go-live">Open setup <ChevronRight size={13}/></Link></article>
      </aside>
    </div>
  </section>;
}

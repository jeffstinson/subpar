"use client";

import { useMemo,useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, FileSpreadsheet, Gauge, RefreshCw, ShieldCheck, Upload, XCircle } from "lucide-react";
import styles from "./log-lab.module.css";

const metrics=[
  ["boostTargetMaxPsi","BOOST TARGET","psi"],["boostActualMaxPsi","BOOST ACTUAL","psi"],["boostErrorMaxAbsPsi","MAX BOOST ERROR","psi"],["lambdaAvgWot","WOT LAMBDA",""],
  ["hpfpMinPsi","HPFP MIN","psi"],["lpfpMinPsi","LPFP MIN","psi"],["iatPeakF","IAT PEAK","°F"],["wgdcPeakPct","WGDC PEAK","%"],["timingCorrectionMaxAbsDeg","MAX TIMING CORR","°"],["throttleClosureCount","THROTTLE FLAGS",""]
];

export default function LogLabClient(){
  const [platform,setPlatform]=useState("MHD");
  const [engine,setEngine]=useState("B58TU");
  const [fileName,setFileName]=useState("");
  const [csvText,setCsvText]=useState("");
  const [analysis,setAnalysis]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function analyze(text=csvText,name=fileName||"upload.csv"){
    if(!text.trim())return;setBusy(true);setError("");
    try{
      const response=await fetch("/api/v1/log-intelligence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csvText:text,platform,engine,fileName:name})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to analyze log");setAnalysis(body.analysis);
    }catch(err){setError(err.message);setAnalysis(null)}finally{setBusy(false)}
  }

  async function loadDemo(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/v1/log-intelligence");if(!response.ok)throw new Error("Unable to load demo log");const text=await response.text();setCsvText(text);setFileName("subpar-demo-mhd.csv");setPlatform("MHD");setEngine("B58TU");
      const analyzed=await fetch("/api/v1/log-intelligence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csvText:text,platform:"MHD",engine:"B58TU",fileName:"subpar-demo-mhd.csv"})});const body=await analyzed.json();if(!analyzed.ok)throw new Error(body.error||"Unable to analyze demo log");setAnalysis(body.analysis);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  async function pick(event){
    const file=event.target.files?.[0];if(!file)return;setAnalysis(null);setError("");setFileName(file.name);
    if(file.size>2_500_000){setError("CSV is larger than the 2.5 MB preview-analysis limit");return}
    const text=await file.text();setCsvText(text);await analyze(text,file.name);
  }

  const mapped=useMemo(()=>analysis?Object.entries(analysis.channelMap||{}):[],[analysis]);
  const confidenceClass=analysis?.confidence>=90?styles.good:analysis?.confidence>=70?styles.warn:styles.bad;

  return <section className={styles.workspace}>
    <aside className={styles.uploader}>
      <div className={styles.sectionHead}><div><span>INGEST A LOG</span><h2>Parser setup</h2></div><FileSpreadsheet size={18}/></div>
      <label><span>PLATFORM</span><select value={platform} onChange={e=>{setPlatform(e.target.value);setAnalysis(null)}}><option>MHD</option><option>BM3</option><option>EcuTek</option></select></label>
      <label><span>ENGINE FAMILY</span><select value={engine} onChange={e=>{setEngine(e.target.value);setAnalysis(null)}}>{["B58TU","B58","S58","S55","N55"].map(value=><option key={value}>{value}</option>)}</select></label>
      <label className={styles.drop}><Upload size={24}/><b>{fileName||"Choose CSV log"}</b><small>CSV only · preview parser · max 2.5 MB</small><input type="file" accept=".csv,text/csv" onChange={pick}/></label>
      <button className={styles.demo} onClick={loadDemo} disabled={busy}><Activity size={14}/>{busy?"Loading…":"Run synthetic MHD example"}</button>
      {csvText&&<button className={styles.reanalyze} onClick={()=>analyze()} disabled={busy}><RefreshCw size={13}/>Re-analyze with selected profile</button>}
      {error&&<div className={styles.error}><XCircle size={14}/>{error}</div>}
      <div className={styles.guard}><ShieldCheck size={14}/><p>The lab reads the CSV in memory and returns normalized metrics. It does not save the raw log or mark a calibration approved.</p></div>
    </aside>

    <div className={styles.results}>
      {!analysis?<div className={styles.empty}><Gauge size={30}/><b>No log analyzed yet</b><p>Drop in an MHD CSV or run the synthetic sample to see channel mapping, confidence, summary metrics and review flags.</p></div>:<>
        <section className={styles.summary}>
          <div><span>ANALYSIS RESULT</span><h2>{analysis.fileName}</h2><p>{analysis.platform} · {analysis.engine} · {analysis.rowCount.toLocaleString()} rows · {analysis.parserVersion}</p></div>
          <div className={`${styles.confidence} ${confidenceClass}`}><span>PARSER CONFIDENCE</span><b>{analysis.confidence}%</b><small>{analysis.missingRequired.length?`${analysis.missingRequired.length} required channels missing`:"required channels mapped"}</small></div>
        </section>

        <section className={styles.metricGrid}>{metrics.map(([key,label,unit])=><article key={key}><span>{label}</span><b>{analysis.metrics?.[key]??"—"}{analysis.metrics?.[key]!==null&&analysis.metrics?.[key]!==undefined&&unit?<em>{unit}</em>:null}</b></article>)}</section>

        <section className={styles.grid2}>
          <article className={styles.panel}><div className={styles.sectionHead}><div><span>CHANNEL NORMALIZATION</span><h2>{mapped.length} mapped channels</h2></div><CheckCircle2 size={18}/></div><div className={styles.mapped}>{mapped.map(([canonical,source])=><div key={canonical}><b>{canonical}</b><span>{source}</span></div>)}</div>{analysis.unmappedHeaders?.length>0&&<details className={styles.unmapped}><summary>{analysis.unmappedHeaders.length} source columns not mapped</summary><p>{analysis.unmappedHeaders.join(" · ")}</p></details>}</article>

          <article className={styles.panel}><div className={styles.sectionHead}><div><span>REVIEW FLAGS</span><h2>{analysis.flags.length?`${analysis.flags.length} item${analysis.flags.length===1?"":"s"} to inspect`:"No heuristic flags"}</h2></div>{analysis.flags.length?<AlertTriangle size={18}/>:<CheckCircle2 size={18}/>}</div><div className={styles.flags}>{analysis.flags.map(flag=><div key={flag.code} className={styles[flag.severity]||""}><i>{flag.severity==="review"?"!":"i"}</i><div><b>{flag.title}</b><p>{flag.detail}</p></div></div>)}{!analysis.flags.length&&<div className={styles.clean}><CheckCircle2 size={16}/><span>No configured heuristic crossed its review threshold.</span></div>}</div></article>
        </section>

        <section className={styles.panel}><div className={styles.sectionHead}><div><span>INTERPRETATION BOUNDARY</span><h2>{analysis.summary.headline}</h2></div><ShieldCheck size={18}/></div><p className={styles.boundary}>{analysis.summary.note}</p><div className={styles.thresholds}>{Object.entries(analysis.thresholds||{}).map(([key,value])=><span key={key}><b>{key}</b>{String(value)}</span>)}</div>{analysis.profileNotes&&<p className={styles.profileNote}>{analysis.profileNotes}</p>}</section>
      </>}
    </div>
  </section>;
}

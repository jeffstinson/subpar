"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown,
  ExternalLink, FileText, Gauge, GitCompare, MessageSquare, RotateCcw, Save, Send,
  SlidersHorizontal, Sparkles, UploadCloud, XCircle
} from "lucide-react";
import styles from "./review.module.css";

const pulls = [
  {id:"pull-01",name:"rev4_pull_01.csv",time:"18m ago",gear:"3rd",rpm:"2,650–6,650",duration:"6.4s",status:"Review",boost:"24.3",lambda:"0.81",hpfp:"2,570",iat:"118",timing:"-1.5",throttle:"100"},
  {id:"pull-02",name:"rev4_pull_02.csv",time:"18m ago",gear:"3rd",rpm:"2,710–6,720",duration:"6.2s",status:"Review",boost:"24.1",lambda:"0.80",hpfp:"2,610",iat:"116",timing:"-0.8",throttle:"100"},
  {id:"rev3",name:"rev3_pull_02.csv",time:"Sep 11",gear:"3rd",rpm:"2,690–6,610",duration:"6.6s",status:"Previous",boost:"23.8",lambda:"0.82",hpfp:"2,490",iat:"121",timing:"-2.3",throttle:"96"}
];

const requiredChannels = [
  ["RPM",true],["Boost target",true],["Boost actual",true],["Throttle angle",true],["Lambda target",true],["Lambda actual",true],
  ["Ignition timing",true],["Timing corrections",true],["HPFP rail pressure",true],["LPFP pressure",true],["IAT",true],["WGDC",true],["Fuel trims",true],["Ethanol content",true]
];

const flags = [
  {tone:"watch",title:"Cylinder 4 correction",detail:"-1.5° around 5,700 RPM on Pull 1. Pull 2 improves to -0.8°.",rpm:"5,700 RPM"},
  {tone:"good",title:"Fuel pressure healthy",detail:"HPFP remains above 2,570 psi through peak load on both pulls.",rpm:"Full pull"},
  {tone:"good",title:"No throttle closure",detail:"Throttle stays at 100% through the loaded portion of both Rev 4 pulls.",rpm:"3,100–6,650 RPM"},
  {tone:"good",title:"Boost tracking improved",detail:"Peak error tightened vs Rev 3 and settles cleanly after spool.",rpm:"3,300–5,900 RPM"}
];

const compareRows = [
  ["Peak boost","23.8 psi","24.3 psi","+0.5 psi"],
  ["Boost error peak","1.1 psi","0.5 psi","Improved"],
  ["Worst timing corr.","-2.3°","-1.5°","Improved"],
  ["HPFP minimum","2,490 psi","2,570 psi","+80 psi"],
  ["IAT peak","121°F","118°F","-3°F"],
  ["Throttle minimum","96%","100%","No closure"]
];

export default function LogReviewPage({params}) {
  const id = params?.id || "SP-1842";
  const [activePull,setActivePull] = useState("pull-01");
  const [showCompare,setShowCompare] = useState(true);
  const [note,setNote] = useState("Clean pull overall. No throttle closure. Small cylinder 4 correction near 5,700 RPM. Fuel pressure remains healthy. Pull 2 is cleaner than Pull 1.");
  const [decision,setDecision] = useState("review");
  const [toast,setToast] = useState("");
  const [channelsOpen,setChannelsOpen] = useState(false);

  const pull = useMemo(()=>pulls.find(p=>p.id===activePull) || pulls[0],[activePull]);
  const channelCount = requiredChannels.filter(c=>c[1]).length;

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function chooseDecision(next){setDecision(next);flash(next==="revision"?"Decision set: create next revision":next==="relog"?"Decision set: request another log":"Decision saved")}

  return <main className={styles.page}>
    {toast&&<div className={styles.toast}>{toast}</div>}

    <header className={styles.topbar}>
      <div className={styles.topLeft}>
        <Link href={`/project/${id}`} className={styles.back}><ArrowLeft size={14}/>Project</Link>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>DATALOG REVIEW • {id}</span>
          <h1>Alex Rivera • Rev 4</h1>
          <p>2021 BMW M340i • B58TU • MHD • E40 • 2 new pulls</p>
        </div>
      </div>
      <div className={styles.topActions}>
        <button onClick={()=>flash("Review note saved")}><Save size={14}/>Save</button>
        <button onClick={()=>chooseDecision("relog")}><RotateCcw size={14}/>Request re-log</button>
        <button className={styles.primary} onClick={()=>chooseDecision("revision")}><ArrowRight size={14}/>Create next revision</button>
      </div>
    </header>

    <section className={styles.reviewStatus}>
      <div><Activity size={17}/><span><b>2 new MHD logs</b><small>Uploaded 18 minutes ago • customer is waiting on Doug</small></span></div>
      <div className={styles.statusPills}><span className={styles.good}>Channels complete</span><span>Rev 4</span><span>E40</span><span>3rd gear</span></div>
    </section>

    <div className={styles.layout}>
      <aside className={styles.leftRail}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>LOG SET</span><h3>Pulls</h3></div><button onClick={()=>flash("Upload picker staged")}><UploadCloud size={14}/></button></div>
          <div className={styles.pullList}>
            {pulls.map(p=><button key={p.id} className={activePull===p.id?styles.pullActive:""} onClick={()=>setActivePull(p.id)}>
              <div><b>{p.name}</b><span>{p.gear} • {p.rpm}</span></div><em>{p.time}</em>
            </button>)}
          </div>
        </section>

        <section className={styles.card}>
          <button className={styles.channelHead} onClick={()=>setChannelsOpen(v=>!v)}><div><span className={styles.eyebrow}>CHANNEL VALIDATION</span><h3>{channelCount}/{requiredChannels.length} required channels</h3></div><ChevronDown size={15} className={channelsOpen?styles.rotate:""}/></button>
          {channelsOpen&&<div className={styles.channelList}>{requiredChannels.map(([name,ok])=><div key={name}><span>{ok?<Check size={12}/>:<XCircle size={12}/>}</span><b>{name}</b><em>{ok?"Present":"Missing"}</em></div>)}</div>}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>SOURCE</span><h3>Log details</h3></div></div>
          <div className={styles.metaList}>
            <div><span>Platform</span><b>MHD</b></div><div><span>Revision</span><b>Rev 4</b></div><div><span>Fuel</span><b>E40</b></div><div><span>Gear</span><b>{pull.gear}</b></div><div><span>RPM range</span><b>{pull.rpm}</b></div><div><span>Duration</span><b>{pull.duration}</b></div>
          </div>
          <button className={styles.datazap} onClick={()=>flash("Datazap link would open here")}>Open Datazap <ExternalLink size={12}/></button>
        </section>
      </aside>

      <section className={styles.center}>
        <section className={`${styles.card} ${styles.chartCard}`}>
          <div className={styles.cardHead}>
            <div><span className={styles.eyebrow}>PULL VISUALIZATION</span><h3>{pull.name}</h3></div>
            <div className={styles.chartControls}><button className={styles.activeControl}>Boost</button><button>Fuel</button><button>Timing</button><button>Throttle</button></div>
          </div>
          <div className={styles.chartArea}>
            <div className={styles.yLabels}><span>26</span><span>20</span><span>14</span><span>8</span><span>2</span></div>
            <div className={styles.gridLines}>{[0,1,2,3,4].map(i=><i key={i}/>)}</div>
            <svg viewBox="0 0 800 260" preserveAspectRatio="none" aria-label="Synthetic log chart">
              <polyline points="0,238 55,231 110,209 160,160 220,92 280,61 340,51 410,48 480,47 550,48 620,49 690,51 750,53 800,54" fill="none" stroke="rgba(105,194,132,.95)" strokeWidth="4"/>
              <polyline points="0,238 55,233 110,217 160,173 220,105 280,64 340,46 410,45 480,48 550,50 620,49 690,52 750,55 800,56" fill="none" stroke="rgba(110,183,239,.9)" strokeWidth="3"/>
              <line x1="570" y1="20" x2="570" y2="235" stroke="rgba(231,178,66,.6)" strokeDasharray="6 6"/>
            </svg>
            <div className={styles.chartLegend}><span><i className={styles.greenLine}/>Boost target</span><span><i className={styles.blueLine}/>Boost actual</span><span><i className={styles.amberLine}/>Flag at 5,700 RPM</span></div>
            <div className={styles.xLabels}><span>2.7k</span><span>3.5k</span><span>4.3k</span><span>5.1k</span><span>5.9k</span><span>6.7k RPM</span></div>
          </div>
        </section>

        <section className={styles.metricsGrid}>
          {[["Boost actual",`${pull.boost} psi`,"24.0 target","good",Gauge],["Lambda",pull.lambda,"0.80–0.82","good",Activity],["HPFP min",`${pull.hpfp} psi`,"> 2,400 psi","good",Gauge],["IAT peak",`${pull.iat}°F`,"Ambient + 28°F","neutral",SlidersHorizontal],["Worst correction",`${pull.timing}°`,"Cylinder 4","watch",AlertTriangle],["Throttle",`${pull.throttle}%`,`No closure`,"good",CheckCircle2]].map(([a,b,c,tone,Icon])=><article className={styles.metric} key={a}><div><span>{a}</span><Icon size={15}/></div><b>{b}</b><small className={styles[tone]}>{c}</small></article>)}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>FINDINGS</span><h3>Review flags</h3></div><span className={styles.summaryBadge}>1 watch • 3 good</span></div>
          <div className={styles.flagList}>{flags.map(f=><div className={`${styles.flag} ${styles[f.tone]}`} key={f.title}><div className={styles.flagIcon}>{f.tone==="watch"?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}</div><div><b>{f.title}</b><p>{f.detail}</p></div><span>{f.rpm}</span></div>)}</div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>TUNER REVIEW</span><h3>Doug's notes & decision</h3></div></div>
          <div className={styles.reviewBody}>
            <textarea value={note} onChange={e=>setNote(e.target.value)}/>
            <div className={styles.decisionGrid}>
              <button className={decision==="revision"?styles.decisionActive:""} onClick={()=>chooseDecision("revision")}><ArrowRight size={16}/><span><b>Create next revision</b><small>Use this review to start Rev 5</small></span></button>
              <button className={decision==="relog"?styles.decisionActive:""} onClick={()=>chooseDecision("relog")}><RotateCcw size={16}/><span><b>Request another log</b><small>Send customer revised pull instructions</small></span></button>
              <button className={decision==="complete"?styles.decisionActive:""} onClick={()=>chooseDecision("complete")}><CheckCircle2 size={16}/><span><b>Mark calibration complete</b><small>Move project into final delivery</small></span></button>
            </div>
          </div>
        </section>
      </section>

      <aside className={styles.rightRail}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>AI / RULE SUMMARY</span><h3>Quick read</h3></div><Sparkles size={15}/></div>
          <div className={styles.quickRead}><p>Both Rev 4 pulls are consistent. Boost tracking is tighter than Rev 3, throttle remains open, and fuel pressure improves slightly. Pull 1 shows a mild cylinder 4 correction near 5,700 RPM that is reduced on Pull 2.</p><div><span>Confidence</span><b>High</b></div><small>Summary is assistive only. Doug makes the tuning decision.</small></div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>REVISION COMPARE</span><h3>Rev 3 → Rev 4</h3></div><button onClick={()=>setShowCompare(v=>!v)}><GitCompare size={14}/></button></div>
          {showCompare&&<div className={styles.compareTable}><div className={styles.compareHead}><span>Metric</span><span>Rev 3</span><span>Rev 4</span><span>Change</span></div>{compareRows.map(r=><div key={r[0]}>{r.map((x,i)=><span key={i}>{x}</span>)}</div>)}</div>}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>CUSTOMER CONTEXT</span><h3>Alex's latest message</h3></div><MessageSquare size={15}/></div>
          <div className={styles.customerMessage}><p>“Just uploaded two new logs. Car feels much smoother on this revision.”</p><span>18 minutes ago</span><button onClick={()=>flash("Customer reply composer staged")}>Reply to Alex <Send size={12}/></button></div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>DECISION HANDOFF</span><h3>What happens next</h3></div></div>
          <div className={styles.handoff}>
            <div className={decision==="revision"?styles.handoffActive:""}><span>1</span><div><b>Create Rev 5 draft</b><small>Carry this review note forward</small></div></div>
            <div className={decision==="revision"?styles.handoffActive:""}><span>2</span><div><b>Publish to customer</b><small>File + customer-visible change summary</small></div></div>
            <div><span>3</span><div><b>Request next pull</b><small>B58TU MHD parameter pack attached</small></div></div>
            <div><span>4</span><div><b>Route new log back here</b><small>Queue automatically reopens</small></div></div>
          </div>
          <Link href={`/workflow/${id}`} className={styles.workflowLink}>Open full handoff simulator <ArrowRight size={12}/></Link>
        </section>
      </aside>
    </div>

    <footer className={styles.footer}>Synthetic demo log data for workflow and UI feedback only. No real customer/tuning data is ingested.</footer>
  </main>
}

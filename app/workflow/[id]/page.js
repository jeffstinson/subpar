"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Download,
  FileText, Gauge, Mail, MessageSquare, RefreshCw, RotateCcw, Send, ShieldCheck,
  Upload, UserRound, Wrench
} from "lucide-react";
import styles from "./workflow.module.css";

const stages = [
  {
    id:"review",
    label:"Log review",
    owner:"Doug",
    internalStatus:"Needs Doug",
    internalAction:"Review 2 Rev 4 logs",
    customerStatus:"Waiting on Subpar Tuning",
    customerTitle:"Doug is reviewing your logs",
    customerCopy:"Your Rev 4 logs are attached. Nothing else is needed from you right now.",
    progress:72
  },
  {
    id:"draft",
    label:"Rev 5 draft",
    owner:"Doug",
    internalStatus:"Revision in Progress",
    internalAction:"Finish Rev 5 calibration",
    customerStatus:"Waiting on Subpar Tuning",
    customerTitle:"Your next revision is being prepared",
    customerCopy:"Doug finished reviewing your logs and is preparing the next calibration.",
    progress:78
  },
  {
    id:"published",
    label:"Rev 5 delivered",
    owner:"Alex",
    internalStatus:"Waiting on Customer",
    internalAction:"Wait for Rev 5 install confirmation",
    customerStatus:"Action needed",
    customerTitle:"Revision 5 is ready",
    customerCopy:"Download the new file, flash Rev 5 in MHD, then confirm the install before logging.",
    progress:84
  },
  {
    id:"installed",
    label:"Install confirmed",
    owner:"Alex",
    internalStatus:"Waiting on Customer",
    internalAction:"Await requested Rev 5 logs",
    customerStatus:"Action needed",
    customerTitle:"Rev 5 installed — send two logs",
    customerCopy:"Run the requested 3rd-gear pulls using the B58TU parameter pack and upload both CSV files.",
    progress:88
  },
  {
    id:"logs",
    label:"Logs uploaded",
    owner:"Doug",
    internalStatus:"Needs Doug",
    internalAction:"Review 2 new Rev 5 logs",
    customerStatus:"Waiting on Subpar Tuning",
    customerTitle:"Your Rev 5 logs are in review",
    customerCopy:"Both files made it into Doug’s review queue. You’re caught up for now.",
    progress:93
  },
  {
    id:"complete",
    label:"Tune complete",
    owner:"Complete",
    internalStatus:"Completed",
    internalAction:"Archive project / future support",
    customerStatus:"Complete",
    customerTitle:"Your custom tune is complete",
    customerCopy:"The final revision is archived with your vehicle history and available in your portal.",
    progress:100
  }
];

const baseEvents = [
  {who:"Alex", icon:Upload, text:"Uploaded 2 Rev 4 MHD logs", meta:"18 minutes ago"},
  {who:"Automation", icon:Mail, text:"Matched both files to SP-1842 / Rev 4", meta:"18 minutes ago"},
  {who:"Queue", icon:Activity, text:"Moved project to Doug’s datalog review queue", meta:"18 minutes ago"}
];

export default function WorkflowPage({params}){
  const id=params?.id || "SP-1842";
  const [index,setIndex]=useState(0);
  const [events,setEvents]=useState(baseEvents);
  const [toast,setToast]=useState("");
  const stage=stages[index];

  const nextLabel=useMemo(()=>{
    if(stage.id==="review") return "Mark logs reviewed";
    if(stage.id==="draft") return "Publish Rev 5";
    if(stage.id==="published") return "Confirm install as Alex";
    if(stage.id==="installed") return "Upload 2 logs as Alex";
    if(stage.id==="logs") return "Complete final review";
    return "Tune complete";
  },[stage]);

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function transition(){
    if(index>=stages.length-1){flash("Workflow is already complete");return;}
    const next=stages[index+1];
    const transitionEvents={
      draft:[
        {who:"Doug",icon:CheckCircle2,text:"Marked Rev 4 logs reviewed",meta:"Just now"},
        {who:"Subpar OS",icon:Wrench,text:"Created Rev 5 draft from Rev 4",meta:"Just now"}
      ],
      published:[
        {who:"Doug",icon:Send,text:"Published alex_m340i_rev5_e40.bin",meta:"Just now"},
        {who:"Automation",icon:Mail,text:"Sent Rev 5 delivery email + portal task",meta:"Just now"}
      ],
      installed:[
        {who:"Alex",icon:Check,text:"Confirmed Rev 5 installed successfully",meta:"Just now"},
        {who:"Automation",icon:Gauge,text:"Requested two B58TU / E40 logging pulls",meta:"Just now"}
      ],
      logs:[
        {who:"Alex",icon:Upload,text:"Uploaded rev5_pull_01.csv and rev5_pull_02.csv",meta:"Just now"},
        {who:"Queue",icon:Activity,text:"Returned project to Doug’s review queue",meta:"Just now"}
      ],
      complete:[
        {who:"Doug",icon:CheckCircle2,text:"Approved Rev 5 as final calibration",meta:"Just now"},
        {who:"Subpar OS",icon:ShieldCheck,text:"Archived final file, logs and vehicle history",meta:"Just now"}
      ]
    };
    setEvents(e=>[...(transitionEvents[next.id]||[]),...e]);
    setIndex(i=>i+1);
    flash(`${next.label} simulated`);
  }

  function jump(i){setIndex(i);flash(`Previewing ${stages[i].label}`)}
  function reset(){setIndex(0);setEvents(baseEvents);flash("Workflow reset")}

  return <main className={styles.page}>
    {toast&&<div className={styles.toast}>{toast}</div>}

    <header className={styles.topbar}>
      <div>
        <Link href={`/project/${id}`} className={styles.back}><ArrowLeft size={14}/> Alex’s tuner project</Link>
        <span className={styles.eyebrow}>SUBPAR OS • END-TO-END WORKFLOW DEMO</span>
        <h1>One tune. Two views. One shared state.</h1>
        <p>Use this to show how Doug’s internal action automatically becomes the right customer-facing next step — and how customer actions route the project back to Doug.</p>
      </div>
      <div className={styles.topActions}>
        <button onClick={reset} className={styles.secondary}><RotateCcw size={14}/>Reset</button>
        <Link href={`/portal/${id}`} className={styles.secondary}>Full customer portal <ArrowRight size={13}/></Link>
      </div>
    </header>

    <section className={styles.stageRail}>
      {stages.map((s,i)=><button key={s.id} onClick={()=>jump(i)} className={`${styles.stage} ${i<index?styles.stageDone:""} ${i===index?styles.stageActive:""}`}>
        <i>{i<index?<Check size={12}/>:i+1}</i>
        <span><b>{s.label}</b><small>{s.owner==="Doug"?"Doug action":s.owner==="Alex"?"Customer action":"Finished"}</small></span>
      </button>)}
    </section>

    <section className={styles.handoffBanner}>
      <div className={styles.ownerIcon}>{stage.owner==="Doug"?"DT":stage.owner==="Alex"?"AR":"✓"}</div>
      <div><span>CURRENT OWNER</span><h2>{stage.owner==="Doug"?"Doug has the ball":stage.owner==="Alex"?"Alex has the ball":"Workflow complete"}</h2><p>{stage.owner==="Doug"?"Doug’s timer is running. The customer portal should reassure Alex that nothing is needed.":stage.owner==="Alex"?"Doug’s timer pauses. The customer sees one explicit action and Subpar OS waits for completion.":"No open tuning action. Files and history stay available for future support."}</p></div>
      <button onClick={transition} disabled={index===stages.length-1} className={styles.primary}>{nextLabel}<ArrowRight size={14}/></button>
    </section>

    <div className={styles.dualView}>
      <section className={`${styles.workspace} ${styles.tuner}`}>
        <div className={styles.workspaceHead}>
          <div><span className={styles.viewTag}>DOUG’S VIEW</span><h2>Tuning Dashboard</h2><p>Internal project state and what needs his attention.</p></div>
          <span className={`${styles.statusPill} ${stage.owner==="Doug"?styles.redPill:styles.amberPill}`}>{stage.internalStatus}</span>
        </div>

        <div className={styles.projectIdentity}>
          <div className={styles.avatar}>AR</div>
          <div><h3>Alex Rivera</h3><p>2021 BMW M340i • B58TU • MHD • E40</p></div>
          <div className={styles.rev}>REV {index<2?"4":"5"}</div>
        </div>

        <div className={styles.nextAction}>
          <span>NEXT INTERNAL ACTION</span>
          <h3>{stage.internalAction}</h3>
          <p>Queue ownership: <b>{stage.owner}</b> • Project {id}</p>
        </div>

        <div className={styles.internalGrid}>
          <div><span>Customer portal</span><b>{stage.customerStatus}</b></div>
          <div><span>Doug timer</span><b>{stage.owner==="Doug"?"Running":"Paused"}</b></div>
          <div><span>Current revision</span><b>{index<2?"Rev 4":"Rev 5"}</b></div>
          <div><span>Files waiting</span><b>{stage.id==="review"||stage.id==="logs"?"2 logs":"0"}</b></div>
        </div>

        <section className={styles.visibilityCard}>
          <div><ShieldCheck size={16}/><span><b>Customer visibility</b><small>High-level status, delivered file and requested action are visible.</small></span></div>
          <ul>
            <li><Check size={12}/> Change summary</li>
            <li><Check size={12}/> Customer tasks</li>
            <li><Check size={12}/> Delivered tune file</li>
            <li className={styles.hiddenItem}>× Internal notes / raw tuning metrics hidden</li>
          </ul>
        </section>

        <div className={styles.tunerButtons}>
          <Link href={`/project/${id}`} className={styles.secondary}>Open full project</Link>
          <button onClick={()=>flash("Customer-facing update staged")}>Publish customer update</button>
        </div>
      </section>

      <section className={`${styles.workspace} ${styles.customer}`}>
        <div className={styles.customerHeader}>
          <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR TUNING</b><span>Customer Portal</span></div></div>
          <div className={styles.alexMini}><UserRound size={14}/> Alex Rivera</div>
        </div>

        <div className={styles.customerHero}>
          <span className={styles.viewTag}>ALEX’S VIEW</span>
          <h2>{stage.customerTitle}</h2>
          <p>{stage.customerCopy}</p>
          <div className={styles.customerStatus}><Clock3 size={15}/><span>{stage.customerStatus}</span></div>
        </div>

        <div className={styles.progressBlock}><div><span>Tune progress</span><b>{stage.progress}%</b></div><div className={styles.progress}><i style={{width:`${stage.progress}%`}}/></div></div>

        {stage.id==="review"&&<div className={styles.customerTaskGood}><CheckCircle2 size={18}/><div><b>You’re all caught up</b><span>Doug has your Rev 4 logs. No action is required.</span></div></div>}

        {stage.id==="draft"&&<div className={styles.customerTaskGood}><Wrench size={18}/><div><b>Revision in progress</b><span>Doug is preparing the next file from your latest log review.</span></div></div>}

        {stage.id==="published"&&<div className={styles.customerTask}>
          <div className={styles.taskNumber}>1</div><div><span>YOUR NEXT STEP</span><h3>Install Revision 5</h3><p>Download the E40 file, flash it in MHD, then confirm the install.</p></div>
          <button onClick={transition}><Download size={14}/>Download + confirm</button>
        </div>}

        {stage.id==="installed"&&<div className={styles.customerTask}>
          <div className={styles.taskNumber}>2</div><div><span>YOUR NEXT STEP</span><h3>Upload two Rev 5 logs</h3><p>Use B58TU MHD parameter pack v3.2 and attach both 3rd-gear CSV files.</p></div>
          <button onClick={transition}><Upload size={14}/>Upload logs</button>
        </div>}

        {stage.id==="logs"&&<div className={styles.customerTaskGood}><CheckCircle2 size={18}/><div><b>Logs received</b><span>Your two Rev 5 files are back in Doug’s review queue.</span></div></div>}

        {stage.id==="complete"&&<div className={styles.completeCard}><ShieldCheck size={22}/><div><b>Final calibration archived</b><span>Rev 5, source files and tune history remain available in your vehicle profile.</span></div></div>}

        <div className={styles.customerFiles}>
          <div><FileText size={15}/><span><b>{index<2?"alex_m340i_rev4_e40.bin":"alex_m340i_rev5_e40.bin"}</b><small>{index<2?"Current tune • Rev 4":"Latest tune • Rev 5"}</small></span><ChevronArrow/></div>
          <div><Gauge size={15}/><span><b>B58TU_MHD_Params_v3.2.pdf</b><small>Logging parameter pack</small></span><ChevronArrow/></div>
        </div>

        <div className={styles.customerButtons}>
          <Link href={`/portal/${id}`} className={styles.secondary}>Open full portal</Link>
          <button onClick={()=>flash("Message thread opened") }><MessageSquare size={13}/>Message Doug</button>
        </div>
      </section>
    </div>

    <section className={styles.eventsPanel}>
      <div className={styles.eventsHead}><div><span className={styles.eyebrow}>SHARED PROJECT EVENT LOG</span><h2>Every handoff becomes one timeline.</h2><p>Automations and customer actions create durable events instead of living only in email.</p></div><RefreshCw size={18}/></div>
      <div className={styles.events}>{events.map((e,i)=>{const Icon=e.icon;return <div key={`${e.text}-${i}`}><div className={styles.eventIcon}><Icon size={14}/></div><div><b>{e.text}</b><span>{e.who} • {e.meta}</span></div></div>})}</div>
    </section>

    <section className={styles.rulesPanel}>
      <div><span className={styles.eyebrow}>HANDOFF RULES</span><h2>The behavior we’re building around.</h2></div>
      <div className={styles.rulesGrid}>
        <article><b>1. One owner at a time</b><p>Either Doug or the customer has the next action. The dashboard should make that impossible to misunderstand.</p></article>
        <article><b>2. Automations bridge the gap</b><p>Revision delivery can create the portal task, send instructions, pause Doug’s timer and wait for customer completion.</p></article>
        <article><b>3. Customer actions route work back</b><p>Install confirmation or log uploads automatically update the project and put it back into the correct internal queue.</p></article>
        <article><b>4. Internal data stays internal</b><p>Doug can keep tuning notes, raw log analysis and internal warnings without exposing them to the customer portal.</p></article>
      </div>
    </section>
  </main>
}

function ChevronArrow(){return <ArrowRight size={13}/>}

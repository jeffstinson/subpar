"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Car, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, FileText, Gauge, Mail, RefreshCw, Send, ShieldCheck,
  ShoppingBag, UserRound, Wrench
} from "lucide-react";
import styles from "./intake.module.css";

const initialItems = [
  {id:"contact",label:"Customer contact",detail:"Email + order identity matched from Wix",state:"done"},
  {id:"vehicle",label:"Vehicle details",detail:"2016 BMW M4 • F82 • S55 • DCT",state:"done"},
  {id:"platform",label:"Tuning platform",detail:"bootmod3 selected at purchase",state:"done"},
  {id:"hardware",label:"Hardware list",detail:"Pure Stage 2+, upgraded charge pipes, catless downpipes",state:"done"},
  {id:"fuel",label:"Fuel + goal",detail:"93 octane • street / roll-racing calibration",state:"done"},
  {id:"bm3",label:"BM3 account email",detail:"Needed to match tune-request workflow",state:"waiting"},
  {id:"rom",label:"ROM / software details",detail:"Customer still needs to submit software/ROM information",state:"waiting"},
  {id:"baseline",label:"Baseline datalog",detail:"Requested after compatibility approval",state:"blocked"}
];

const checks = [
  ["Vehicle / engine","F82 M4 • S55","Supported","good"],
  ["Tune product","S55 Custom Tune","Correct product","good"],
  ["Platform","bootmod3","Supported workflow","good"],
  ["Transmission","DCT","Supported","good"],
  ["Hardware","Pure Stage 2+","Review complete","good"],
  ["Fuel","93 octane","Valid base fuel","good"],
  ["ROM / software","Pending","Need customer info","warn"],
  ["BM3 account","Pending","Need account email","warn"]
];

export default function IntakePage({params}){
  const id=params?.id||"SP-1846";
  const [items,setItems]=useState(initialItems);
  const [stage,setStage]=useState("Customer intake pending");
  const [toast,setToast]=useState("");
  const [compatRun,setCompatRun]=useState(false);
  const [projectCreated,setProjectCreated]=useState(false);
  const complete=items.filter(i=>i.state==="done").length;
  const missing=items.filter(i=>i.state==="waiting").length;
  const ready=missing===0&&compatRun;

  const progress=useMemo(()=>{
    if(projectCreated) return 100;
    if(ready) return 88;
    if(compatRun) return 72;
    if(stage.includes("received")) return 58;
    return 42;
  },[projectCreated,ready,compatRun,stage]);

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function sendIntake(){setStage("Intake sent • waiting on customer");flash("Platform-specific intake staged")}
  function simulateReply(){
    setItems(list=>list.map(i=>i.id==="bm3"?{...i,state:"done",detail:"c.mendez.tuning@hotmail.com • received just now"}:i.id==="rom"?{...i,state:"done",detail:"ROM details received • compatibility ready"}:i));
    setStage("Customer intake received");
    flash("Customer response attached to order");
  }
  function runCompatibility(){setCompatRun(true);setStage("Compatibility approved • ready for project");flash("Compatibility review completed")}
  function createProject(){if(!ready)return;setProjectCreated(true);setStage("Tune project created • enters queue");flash("Demo project SP-1846 created")}

  return <main className={styles.page}>
    {toast&&<div className={styles.toast}>{toast}</div>}

    <header className={styles.topbar}>
      <div>
        <Link href="/" className={styles.back}><ArrowLeft size={13}/> Back to dashboard</Link>
        <span className={styles.eyebrow}>NEW ORDER INTAKE • {id}</span>
        <h1>Carlos Mendez — 2016 BMW M4</h1>
        <p>S55 • bootmod3 • 93 octane • New custom tune order</p>
      </div>
      <div className={styles.actions}>
        <button onClick={sendIntake}><Mail size={14}/>Send intake</button>
        <button onClick={simulateReply}><RefreshCw size={14}/>Simulate customer reply</button>
        <button className={styles.primary} disabled={!ready} onClick={createProject}><ArrowRight size={14}/>{projectCreated?"Project created":"Create tune project"}</button>
      </div>
    </header>

    <section className={styles.pipeline}>
      {["Order received","Intake sent","Customer response","Compatibility","Tune project"].map((label,i)=>{
        const done=projectCreated?i<=4:ready?i<=3:compatRun?i<=3:stage.includes("received")?i<=2:stage.includes("sent")?i<=1:i===0;
        const active=!done&&(i===1||i===2||i===3||i===4);
        return <div key={label} className={`${styles.pipeStep} ${done?styles.done:""} ${active?styles.active:""}`}><i>{done?<Check size={12}/>:i+1}</i><span>{label}</span></div>
      })}
    </section>

    <section className={styles.summaryGrid}>
      <article className={`${styles.card} ${styles.orderCard}`}>
        <div className={styles.cardHead}><div><span className={styles.eyebrow}>WIX ORDER</span><h2>S55 Custom Tune</h2></div><span className={styles.paid}>Paid</span></div>
        <div className={styles.facts}>
          <div><ShoppingBag size={15}/><span>Order</span><b>{id}</b></div>
          <div><CircleDollarSign size={15}/><span>Amount</span><b>$750.00</b></div>
          <div><Clock3 size={15}/><span>Purchased</span><b>Just now</b></div>
          <div><Gauge size={15}/><span>Platform</span><b>bootmod3</b></div>
        </div>
      </article>
      <article className={`${styles.card} ${styles.statusCard}`}>
        <span className={styles.eyebrow}>CURRENT STATE</span>
        <h2>{stage}</h2>
        <p>{projectCreated?"The intake is complete and this order would now appear in Doug’s active tune queue.":ready?"Everything required to create the tune project is complete.":missing?`${missing} customer item${missing===1?"":"s"} still required before the tune can enter Doug’s queue.`:"Run compatibility review to finish intake."}</p>
        <div className={styles.progress}><i style={{width:`${progress}%`}}/></div><div className={styles.progressMeta}><span>Intake progress</span><b>{progress}%</b></div>
      </article>
    </section>

    <div className={styles.layout}>
      <div className={styles.mainCol}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Customer & Vehicle Intake</h3><p>Everything Subpar needs before Doug starts calibration work.</p></div><span>{complete}/{items.length} complete</span></div>
          <div className={styles.checklist}>{items.map(item=><div className={styles.checkRow} key={item.id}>
            <i className={item.state==="done"?styles.ok:item.state==="blocked"?styles.blocked:styles.wait}>{item.state==="done"?<Check size={13}/>:item.state==="blocked"?"—":"!"}</i>
            <div><b>{item.label}</b><p>{item.detail}</p></div>
            <em>{item.state==="done"?"Complete":item.state==="blocked"?"Later":"Needed"}</em>
          </div>)}</div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Compatibility Review</h3><p>Quick gate before a paid order becomes an active tune project.</p></div><button onClick={runCompatibility} disabled={missing>0}><ShieldCheck size={14}/>{compatRun?"Approved":"Run review"}</button></div>
          <div className={styles.compatGrid}>{checks.map(([a,b,c,tone])=>{
            const pending=(a==="ROM / software"||a==="BM3 account")&&missing>0;
            return <div key={a} className={pending?styles.warnCard:styles.goodCard}><span>{a}</span><b>{pending?"Pending":b}</b><em>{pending?c:compatRun?"Passed":c}</em></div>
          })}</div>
          {compatRun&&<div className={styles.approved}><BadgeCheck size={18}/><div><b>Compatibility approved</b><p>F82 M4 / S55 / BM3 / Pure Stage 2+ / 93 octane is ready to enter Doug’s tune workflow.</p></div></div>}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Customer Intake Preview</h3><p>What Carlos would receive after the Wix purchase.</p></div><button onClick={sendIntake}><Send size={13}/>Resend</button></div>
          <div className={styles.emailPreview}>
            <div className={styles.emailTop}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>Subpar Tuning</b><span>Your S55 custom tune intake</span></div></div>
            <h3>Thanks Carlos — let’s get your M4 ready.</h3>
            <p>We matched your order to a 2016 BMW M4 using bootmod3. Complete the remaining vehicle/software details below and your project will automatically move into Doug’s tune queue once compatibility is approved.</p>
            <div className={styles.customerTasks}><div><CheckCircle2 size={15}/><span>Vehicle + hardware received</span></div><div className={missing?styles.need:""}><FileText size={15}/><span>BM3 account email + ROM/software details</span></div><div><Wrench size={15}/><span>Baseline logging instructions unlock after approval</span></div></div>
            <button onClick={simulateReply}>Complete remaining intake <ChevronRight size={13}/></button>
          </div>
        </section>
      </div>

      <aside className={styles.sideCol}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Customer</h3><p>Matched from Wix</p></div></div>
          <div className={styles.identity}><div>CM</div><section><b>Carlos Mendez</b><span>c.mendez.tuning@hotmail.com</span></section></div>
          <div className={styles.sideList}><div><span>Prior orders</span><b>None</b></div><div><span>Customer type</span><b>New customer</b></div><div><span>Order source</span><b>Wix • Paid</b></div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Vehicle</h3><p>Proposed garage record</p></div></div>
          <div className={styles.vehicle}><div>F82</div><section><b>2016 BMW M4</b><span>S55 • DCT • bootmod3</span></section></div>
          <div className={styles.sideList}><div><span>Turbo</span><b>Pure Stage 2+</b></div><div><span>Downpipes</span><b>Catless</b></div><div><span>Fuel</span><b>93 octane</b></div><div><span>Goal</span><b>Street / roll racing</b></div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Automation Plan</h3><p>Rules that fire from this order</p></div></div>
          <div className={styles.automationList}>
            <div><i>1</i><section><b>Wix order matched</b><span>Create customer + intake shell</span></section></div>
            <div><i>2</i><section><b>BM3 intake sent</b><span>Platform-specific fields only</span></section></div>
            <div><i>3</i><section><b>Compatibility gate</b><span>Hold queue until required data passes</span></section></div>
            <div><i>4</i><section><b>Project + baseline request</b><span>Creates tune project and sends next steps</span></section></div>
          </div>
          <Link href="/automations" className={styles.fullLink}>Open Automation Studio <ArrowRight size={13}/></Link>
        </section>

        <section className={`${styles.card} ${styles.noteCard}`}><ShieldCheck size={18}/><div><b>Synthetic demo order</b><p>No live Wix/customer data is being ingested yet.</p></div></section>
      </aside>
    </div>
  </main>
}

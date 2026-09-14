"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, CircleDot, Download, FileText,
  Gauge, Mail, MessageSquare, ShieldCheck, Upload, UserRound, Wrench
} from "lucide-react";
import styles from "./portal.module.css";

const steps = [
  {label:"Setup",detail:"Vehicle + tune details",state:"done"},
  {label:"Baseline",detail:"Stock file + first log",state:"done"},
  {label:"Calibration",detail:"Rev 1–4 delivered",state:"done"},
  {label:"Log review",detail:"Doug is reviewing Rev 4",state:"active"},
  {label:"Finalize",detail:"Final revision + wrap-up",state:"next"}
];

const initialMessages = [
  {from:"Alex",time:"8:42 PM",body:"Just uploaded two new logs. Car feels much smoother on this revision."},
  {from:"Doug",time:"8:48 PM",body:"Perfect. I have them attached to your tune now. I’ll review the pull and get back to you with the next step."}
];

const files = [
  {name:"alex_m340i_rev4_e40.bin",meta:"Current map • Rev 4 • Delivered yesterday",type:"Tune file",action:"Download"},
  {name:"B58TU_MHD_Params_v3.2.pdf",meta:"Logging parameter pack • Subpar Tuning",type:"Instructions",action:"Open"},
  {name:"stock_backup.bin",meta:"Original MHD stock file • Archived Sep 9",type:"Source file",action:"Download"}
];

export default function CustomerPortalPage({params}){
  const id = params?.id || "SP-1842";
  const [messages,setMessages] = useState(initialMessages);
  const [message,setMessage] = useState("");
  const [toast,setToast] = useState("");
  const [extraLog,setExtraLog] = useState(false);
  const [tab,setTab] = useState("Overview");

  const waitingOn = useMemo(()=>extraLog?"Doug":"Doug",[extraLog]);

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function sendMessage(){
    if(!message.trim()) return;
    setMessages(m=>[...m,{from:"Alex",time:"Just now",body:message.trim()}]);
    setMessage("");
    flash("Demo message added to the project thread");
  }
  function uploadLog(){
    setExtraLog(true);
    flash("Demo log attached to Rev 4");
  }

  return <main className={styles.page}>
    {toast&&<div className={styles.toast}>{toast}</div>}

    <div className={styles.previewBar}>
      <div><ShieldCheck size={14}/><span>Customer-facing preview for Doug</span></div>
      <Link href={`/project/${id}`}>Open tuner view <ArrowRight size={13}/></Link>
    </div>

    <header className={styles.header}>
      <div className={styles.brand}>
        <img src="/subpar-logo.png" alt="Subpar Tuning"/>
        <div><b>SUBPAR TUNING</b><span>Customer Portal</span></div>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.customerMini}><div>AR</div><span>Alex Rivera</span></div>
      </div>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>ACTIVE CUSTOM TUNE • {id}</span>
        <h1>Hey Alex, your M340i is in log review.</h1>
        <p>Doug has your two Rev 4 MHD logs. There’s nothing else you need to send right now — your project is waiting on Subpar Tuning.</p>
        <div className={styles.heroActions}>
          <button className={styles.primary} onClick={uploadLog}><Upload size={15}/>{extraLog?"Another log added":"Upload another log"}</button>
          <button className={styles.secondary} onClick={()=>setTab("Messages")}><MessageSquare size={15}/>Message Doug</button>
        </div>
      </div>

      <aside className={styles.statusCard}>
        <div className={styles.statusTop}><span>CURRENT STATUS</span><em>Waiting on {waitingOn}</em></div>
        <div className={styles.statusIcon}><CircleDot size={22}/></div>
        <h2>Doug is reviewing your logs</h2>
        <p>Rev 4 • E40 • MHD<br/>Last update 18 minutes ago</p>
        <div className={styles.progress}><i/></div>
        <div className={styles.progressMeta}><span>Project progress</span><b>72%</b></div>
      </aside>
    </section>

    <section className={styles.steps}>
      {steps.map((step,i)=><div className={`${styles.step} ${styles[step.state]}`} key={step.label}>
        <div className={styles.stepDot}>{step.state==="done"?<Check size={13}/>:i+1}</div>
        <div><b>{step.label}</b><span>{step.detail}</span></div>
      </div>)}
    </section>

    <nav className={styles.tabs}>
      {["Overview","Tune Files","Messages","Vehicle"].map(t=><button key={t} onClick={()=>setTab(t)} className={tab===t?styles.activeTab:""}>{t}</button>)}
    </nav>

    {tab==="Overview"&&<div className={styles.grid}>
      <div className={styles.mainCol}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>YOUR NEXT STEP</span><h3>Nothing needed from you right now</h3></div><span className={styles.goodBadge}>All caught up</span></div>
          <div className={styles.taskList}>
            <div className={styles.taskDone}><span><Check size={13}/></span><div><b>Vehicle intake</b><small>Hardware, fuel and goals received</small></div><em>Complete</em></div>
            <div className={styles.taskDone}><span><Check size={13}/></span><div><b>MHD stock file</b><small>stock_backup.bin received Sep 9</small></div><em>Complete</em></div>
            <div className={styles.taskDone}><span><Check size={13}/></span><div><b>Logging parameter pack</b><small>B58TU MHD Pack v3.2 sent</small></div><em>Complete</em></div>
            <div className={styles.taskActive}><span><Gauge size={13}/></span><div><b>Rev 4 log review</b><small>{extraLog?"3 logs are attached and waiting on Doug":"2 logs are attached and waiting on Doug"}</small></div><em>In review</em></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>CURRENT CALIBRATION</span><h3>Revision 4 • E40</h3></div><span className={styles.revBadge}>REV 4</span></div>
          <div className={styles.currentTune}>
            <div className={styles.fileIcon}><FileText size={20}/></div>
            <div><b>alex_m340i_rev4_e40.bin</b><span>Delivered yesterday • MHD custom tune</span></div>
            <button onClick={()=>flash("Demo download only")}>Download <Download size={13}/></button>
          </div>
          <div className={styles.tuneNote}>
            <Wrench size={16}/><div><b>What changed in Rev 4</b><p>Smoother torque request and small high-RPM timing cleanup. Doug requested another set of 3rd-gear pulls to verify the changes.</p></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>RECENT ACTIVITY</span><h3>Your tune timeline</h3></div></div>
          <div className={styles.timeline}>
            <div><i/><section><b>{extraLog?"Additional MHD log uploaded":"2 MHD logs uploaded"}</b><p>Rev 4 pulls received and attached to your tune.</p><span>{extraLog?"Just now":"18m ago"}</span></section></div>
            <div><i/><section><b>Rev 4 delivered</b><p>New E40 calibration and logging instructions sent.</p><span>Yesterday</span></section></div>
            <div><i/><section><b>Rev 3 reviewed</b><p>Doug completed review and moved the tune forward.</p><span>Sep 11</span></section></div>
            <div><i/><section><b>Parameter pack sent</b><p>B58TU MHD logging setup was delivered automatically.</p><span>Sep 9</span></section></div>
          </div>
        </section>
      </div>

      <aside className={styles.sideCol}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>YOUR CAR</span><h3>2021 BMW M340i</h3></div></div>
          <div className={styles.vehicleHero}><div className={styles.vehicleIcon}>G20</div><div><b>B58TU • ZF8</b><span>E40 Flex • MHD</span></div></div>
          <div className={styles.vehicleFacts}>
            <div><span>Turbo</span><b>Stock</b></div><div><span>HPFP</span><b>Dorch Stage 2</b></div><div><span>Downpipe</span><b>High-flow</b></div><div><span>VIN</span><b>…1284</b></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>QUICK ACCESS</span><h3>Project files</h3></div></div>
          <div className={styles.compactFiles}>{files.slice(0,2).map(f=><button key={f.name} onClick={()=>flash(`${f.action}: ${f.name}`)}><FileText size={15}/><span><b>{f.name}</b><small>{f.type}</small></span><ChevronRight size={14}/></button>)}</div>
          <button className={styles.fullLink} onClick={()=>setTab("Tune Files")}>View all files <ArrowRight size={13}/></button>
        </section>

        <section className={`${styles.card} ${styles.helpCard}`}>
          <Mail size={18}/><div><span className={styles.eyebrow}>NEED SOMETHING?</span><h3>Message Doug from here</h3><p>Your message stays attached to this exact vehicle and tune project.</p></div><button onClick={()=>setTab("Messages")}>Open messages</button>
        </section>
      </aside>
    </div>}

    {tab==="Tune Files"&&<section className={styles.singleView}>
      <div className={styles.cardHead}><div><span className={styles.eyebrow}>FILES & DELIVERIES</span><h2>Your tune files</h2><p>Everything Subpar has delivered for this project, plus your archived source file.</p></div></div>
      <div className={styles.filesGrid}>{files.map(f=><article key={f.name}><div className={styles.fileIcon}><FileText size={21}/></div><div><span>{f.type}</span><h3>{f.name}</h3><p>{f.meta}</p></div><button onClick={()=>flash(`${f.action}: ${f.name}`)}>{f.action} <ArrowRight size={12}/></button></article>)}</div>
      <div className={styles.uploadPanel}><Upload size={22}/><div><h3>Upload a new datalog</h3><p>Attach an MHD CSV to your current revision. It will appear directly in Doug’s review queue.</p></div><button className={styles.primary} onClick={uploadLog}>Choose log file</button></div>
    </section>}

    {tab==="Messages"&&<section className={styles.messageView}>
      <div className={styles.messageHeader}><div><div className={styles.avatar}>DT</div><div><h2>Doug • Subpar Tuning</h2><p>Messages are tied to your M340i tune project.</p></div></div><span>Usually replies in the tune queue</span></div>
      <div className={styles.messages}>{messages.map((m,i)=><div className={`${styles.bubble} ${m.from==="Alex"?styles.mine:""}`} key={i}><div><b>{m.from}</b><span>{m.time}</span></div><p>{m.body}</p></div>)}</div>
      <div className={styles.messageComposer}><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Message Doug about this tune…"/><button className={styles.primary} onClick={sendMessage}>Send message <ArrowRight size={13}/></button></div>
    </section>}

    {tab==="Vehicle"&&<section className={styles.singleView}>
      <div className={styles.cardHead}><div><span className={styles.eyebrow}>VEHICLE PROFILE</span><h2>2021 BMW M340i</h2><p>This information follows the car across future tune orders and revisions.</p></div></div>
      <div className={styles.vehiclePageGrid}>
        <section className={styles.vehiclePanel}><div className={styles.vehicleIconLarge}>G20</div><div><h3>BMW M340i xDrive</h3><p>B58TU • ZF8 • MHD</p></div></section>
        <section className={styles.specGrid}>{[["Engine","B58TU"],["ECU","MG1CS003"],["Fuel","E40 Flex"],["Turbo","Stock"],["HPFP","Dorch Stage 2"],["Downpipe","High-flow"],["Transmission","ZF8"],["VIN","WBA5U7C0…1284"]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</section>
      </div>
    </section>}

    <footer className={styles.footer}>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR TUNING</b><span>Custom Calibration • Remote Tuning</span></div></div>
      <span>Customer portal concept • Synthetic demo data</span>
    </footer>

    <div className={styles.mobileNav}>
      <button onClick={()=>setTab("Overview")} className={tab==="Overview"?styles.mobileActive:""}><Gauge size={17}/><span>Overview</span></button>
      <button onClick={()=>setTab("Tune Files")} className={tab==="Tune Files"?styles.mobileActive:""}><FileText size={17}/><span>Files</span></button>
      <button onClick={()=>setTab("Messages")} className={tab==="Messages"?styles.mobileActive:""}><MessageSquare size={17}/><span>Messages</span></button>
      <button onClick={()=>setTab("Vehicle")} className={tab==="Vehicle"?styles.mobileActive:""}><UserRound size={17}/><span>Vehicle</span></button>
    </div>
  </main>
}

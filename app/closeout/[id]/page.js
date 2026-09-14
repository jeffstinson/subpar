"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Download,
  FileCheck2, FileText, Flag, Gauge, History, Mail, MessageSquare, PackageCheck,
  RefreshCw, RotateCcw, ShieldCheck, Sparkles, UserCheck, Wrench
} from "lucide-react";
import styles from "./closeout.module.css";

const qaItems = [
  {id:"logs",label:"Final logs reviewed",detail:"Rev 5 pulls are consistent and clean.",done:true},
  {id:"boost",label:"Boost / throttle behavior approved",detail:"No throttle closure; boost tracks target cleanly.",done:true},
  {id:"fuel",label:"Fuel system approved",detail:"Lambda and HPFP remain inside Doug's limits.",done:true},
  {id:"timing",label:"Timing review approved",detail:"No repeatable correction requiring another revision.",done:true},
  {id:"file",label:"Final calibration file attached",detail:"alex_m340i_final_e40.bin",done:true},
  {id:"summary",label:"Customer summary reviewed",detail:"Final changes and aftercare copy ready to send.",done:false}
];

const history = [
  ["Rev 5","Final candidate","E40","2 logs","Today"],
  ["Rev 4","Log review","E40","2 logs","Sep 13"],
  ["Rev 3","Reviewed","E40","2 logs","Sep 11"],
  ["Rev 2","Reviewed","E40","1 log","Sep 8"],
  ["Rev 1","Baseline","93","1 log","Sep 5"]
];

export default function CloseoutPage({params}) {
  const id = params?.id || "SP-1842";
  const [checks,setChecks] = useState(qaItems);
  const [complete,setComplete] = useState(false);
  const [toast,setToast] = useState("");
  const [customerSummary,setCustomerSummary] = useState("Your E40 calibration is complete. Rev 5 kept the strong response from Rev 4 while cleaning up the small high-RPM timing correction. Final logs show stable boost tracking, healthy fuel pressure, and no throttle closure.");
  const [aftercare,setAftercare] = useState("If you change fuel, turbo, HPFP, downpipe, injectors, or other major hardware, message Subpar before continuing to use this calibration. Keep the final map and stock file saved in your portal.");
  const [followup,setFollowup] = useState(true);

  const done = checks.filter(x=>x.done).length;
  const ready = done === checks.length;

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function toggle(id){setChecks(items=>items.map(x=>x.id===id?{...x,done:!x.done}:x))}
  function markSummaryReady(){setChecks(items=>items.map(x=>x.id==="summary"?{...x,done:true}:x));flash("Customer summary approved")}
  function finish(){if(!ready){flash("Finish the closeout checklist first");return}setComplete(true);flash("Project marked complete and archived")}

  return <main className={styles.page}>
    {toast&&<div className={styles.toast}>{toast}</div>}

    <header className={styles.topbar}>
      <div className={styles.topLeft}>
        <Link href={`/project/${id}`} className={styles.back}><ArrowLeft size={14}/>Project</Link>
        <div>
          <span className={styles.eyebrow}>FINAL DELIVERY & CLOSEOUT • {id}</span>
          <h1>Alex Rivera • M340i</h1>
          <p>Rev 5 • E40 • MHD • final candidate</p>
        </div>
      </div>
      <div className={styles.topActions}>
        <Link href={`/portal/${id}`} className={styles.secondary}>Preview customer portal</Link>
        <button className={styles.secondary} onClick={()=>flash("Final package preview opened")}><PackageCheck size={14}/>Preview package</button>
        <button className={styles.primary} onClick={finish}><CheckCircle2 size={14}/>{complete?"Completed":"Mark tune complete"}</button>
      </div>
    </header>

    <section className={`${styles.statusHero} ${complete?styles.completedHero:""}`}>
      <div className={styles.statusIcon}>{complete?<Archive size={24}/>:<Flag size={24}/>}</div>
      <div className={styles.statusCopy}>
        <span className={styles.eyebrow}>{complete?"PROJECT COMPLETE":"READY FOR CLOSEOUT"}</span>
        <h2>{complete?"Calibration archived to Alex's vehicle history":"Final review before Alex gets the completed tune"}</h2>
        <p>{complete?"The final map, source file, logs, revision history, notes and customer communication remain attached to this M340i permanently.":"Doug has a clean final candidate. Closeout packages the approved file, customer summary and aftercare into one final delivery."}</p>
      </div>
      <div className={styles.statusStats}>
        <div><span>QA</span><b>{done}/{checks.length}</b></div>
        <div><span>Revisions</span><b>5</b></div>
        <div><span>Logs</span><b>8</b></div>
        <div><span>Owner</span><b>{complete?"Archived":"Doug"}</b></div>
      </div>
    </section>

    <div className={styles.layout}>
      <div className={styles.mainCol}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>FINAL QA</span><h3>Closeout checklist</h3><p>Nothing gets marked complete until the technical and customer-facing pieces are ready.</p></div><span className={ready?styles.readyBadge:styles.pendingBadge}>{ready?"Ready":"Needs review"}</span></div>
          <div className={styles.checkList}>{checks.map(item=><button key={item.id} onClick={()=>toggle(item.id)} className={item.done?styles.checked:""}><span className={styles.checkIcon}>{item.done?<Check size={13}/>:null}</span><div><b>{item.label}</b><small>{item.detail}</small></div><em>{item.done?"Approved":"Pending"}</em></button>)}</div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>FINAL CALIBRATION</span><h3>Rev 5 final package</h3></div><span className={styles.revBadge}>FINAL</span></div>
          <div className={styles.finalFile}>
            <div className={styles.fileIcon}><FileCheck2 size={21}/></div>
            <div><b>alex_m340i_final_e40.bin</b><span>MHD • E40 • generated from Rev 5 • final candidate</span></div>
            <button onClick={()=>flash("Demo final-file download")}><Download size={13}/>Download</button>
          </div>
          <div className={styles.metricGrid}>
            {[["Boost tracking","24.0 target / 24.1 actual","Approved"],["Throttle","100% through pull","Approved"],["HPFP minimum","2,610 psi","Approved"],["Worst correction","-0.5° transient","Approved"],["Lambda","0.80–0.81","Approved"],["IAT peak","116°F","Normal"]].map(([a,b,c])=><div key={a}><span>{a}</span><b>{b}</b><em>{c}</em></div>)}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>CUSTOMER DELIVERY</span><h3>What Alex sees when the tune is completed</h3><p>Internal tuning notes stay private. Only approved customer-facing information is delivered.</p></div></div>
          <div className={styles.editorBlock}>
            <label><span>Completion summary</span><textarea value={customerSummary} onChange={e=>setCustomerSummary(e.target.value)}/></label>
            <label><span>Aftercare / hardware-change note</span><textarea value={aftercare} onChange={e=>setAftercare(e.target.value)}/></label>
          </div>
          <div className={styles.deliveryPreview}>
            <div className={styles.previewHead}><div><img src="/subpar-logo.png" alt="Subpar Tuning"/><span><b>Your custom tune is complete</b><small>2021 BMW M340i • E40 • Final Rev 5</small></span></div><span className={styles.completeBadge}>Complete</span></div>
            <p>{customerSummary}</p>
            <div className={styles.previewFile}><FileText size={16}/><span><b>alex_m340i_final_e40.bin</b><small>Final calibration</small></span><Download size={14}/></div>
            <div className={styles.aftercare}><ShieldCheck size={16}/><p>{aftercare}</p></div>
          </div>
          <div className={styles.deliveryActions}><button className={styles.secondary} onClick={()=>flash("Customer preview refreshed")}>Refresh preview</button><button className={styles.primary} onClick={markSummaryReady}><UserCheck size={14}/>Approve customer summary</button></div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>REVISION HISTORY</span><h3>Permanent calibration record</h3><p>The finished job stays searchable by customer, VIN, platform, fuel and hardware.</p></div><History size={17}/></div>
          <div className={styles.historyTable}><div className={styles.historyHead}><span>Revision</span><span>Status</span><span>Fuel</span><span>Logs</span><span>Date</span></div>{history.map(row=><div key={row[0]}>{row.map((x,i)=><span key={i}>{x}</span>)}</div>)}</div>
        </section>
      </div>

      <aside className={styles.sideCol}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>DELIVERY PACKAGE</span><h3>Included automatically</h3></div></div>
          <div className={styles.packageList}>
            <div><CheckCircle2 size={14}/><span><b>Final Rev 5 map</b><small>Customer download</small></span></div>
            <div><CheckCircle2 size={14}/><span><b>Stock file archive</b><small>Kept with vehicle</small></span></div>
            <div><CheckCircle2 size={14}/><span><b>B58TU logging pack</b><small>Reference copy</small></span></div>
            <div><CheckCircle2 size={14}/><span><b>Completion summary</b><small>Portal + Gmail</small></span></div>
            <div><CheckCircle2 size={14}/><span><b>Aftercare instructions</b><small>Hardware/fuel changes</small></span></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>FINAL AUTOMATIONS</span><h3>On completion</h3></div></div>
          <div className={styles.automationList}>
            <div><span>1</span><div><b>Publish final package</b><small>Portal receives approved files + summary</small></div></div>
            <div><span>2</span><div><b>Send completion email</b><small>Doug's Gmail with portal link</small></div></div>
            <div><span>3</span><div><b>Archive active queue item</b><small>Remove from Needs Doug</small></div></div>
            <div><span>4</span><div><b>Save vehicle baseline</b><small>Hardware + fuel + final revision snapshot</small></div></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>FOLLOW-UP</span><h3>Aftercare reminder</h3></div></div>
          <div className={styles.followupBody}>
            <button className={`${styles.toggle} ${followup?styles.toggleOn:""}`} onClick={()=>setFollowup(v=>!v)}><i/><span>{followup?"Enabled":"Disabled"}</span></button>
            <p>Send Alex a lightweight follow-up after completion asking how the car feels and reminding him to contact Subpar before hardware/fuel changes.</p>
            <div className={styles.followupMeta}><Clock3 size={13}/><span>Suggested: 7 days after completion</span></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>FUTURE WORK</span><h3>Reopen without losing history</h3></div></div>
          <div className={styles.reopenBox}><Wrench size={18}/><p>If Alex changes turbo, fuel system, exhaust, ethanol target, or other major hardware later, Subpar can reopen this vehicle as a new tune project while preserving the complete Rev 1–5 history.</p><button className={styles.secondary} onClick={()=>flash("Future retune project staged")}><RotateCcw size={13}/>Start future retune</button></div>
        </section>

        <section className={`${styles.card} ${styles.archiveCard}`}>
          <Archive size={19}/><div><span className={styles.eyebrow}>VEHICLE HISTORY</span><h3>Nothing disappears at closeout.</h3><p>Order, VIN, hardware, tune files, logs, revisions, notes and messages remain linked to Alex's M340i for future support.</p></div><Link href={`/portal/${id}`}>See customer archive <ArrowRight size={13}/></Link>
        </section>
      </aside>
    </div>
  </main>
}

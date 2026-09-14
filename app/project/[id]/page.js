"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./project.module.css";

const initialRequirements = [
  {id:"intake",title:"Vehicle intake",detail:"Hardware, fuel, transmission and goals received.",state:"done",action:"View"},
  {id:"stock",title:"MHD stock file",detail:"Uploaded Sep 12 • stock_backup.bin",state:"done",action:"Download"},
  {id:"pack",title:"Subpar B58TU MHD parameter pack",detail:"v3.2 sent automatically after stock file arrived.",state:"done",action:"View pack"},
  {id:"baseline",title:"Baseline log",detail:"Received and reviewed before Rev 1.",state:"done",action:"Review"},
  {id:"rev4",title:"Current Rev 4 log review",detail:"2 new pulls waiting on Doug.",state:"waiting",action:"Review now"}
];

const timeline = [
  {type:"Logs",title:"2 MHD logs uploaded",body:"3rd gear pulls attached to Rev 4. HPFP and throttle channels present.",time:"18m ago"},
  {type:"Messages",title:"Customer message received",body:"“Car feels much smoother on this revision.”",time:"22m ago"},
  {type:"Revisions",title:"Rev 4 delivered",body:"rev4_e40_m340i.bin sent with next-log instructions.",time:"Yesterday"},
  {type:"Automation",title:"Automation: requested new log",body:"Triggered after Rev 4 delivery using B58TU + MHD + E40 workflow.",time:"Yesterday"},
  {type:"Revisions",title:"Rev 3 reviewed",body:"Boost and fuel pressure looked clean. Small timing cleanup requested.",time:"Sep 11"},
  {type:"Automation",title:"Parameter pack sent automatically",body:"B58TU MHD Pack v3.2 attached after stock file requirement cleared.",time:"Sep 9"},
  {type:"Automation",title:"MHD stock file received",body:"stock_backup.bin matched to VIN and archived permanently.",time:"Sep 9"}
];

const revisions = [
  {rev:"Rev 4",fuel:"E40",status:"Logs waiting",delivered:"Sep 13",file:"alex_m340i_rev4_e40.bin",logs:2,note:"Smoother torque request and small high-RPM timing cleanup."},
  {rev:"Rev 3",fuel:"E40",status:"Reviewed",delivered:"Sep 11",file:"alex_m340i_rev3_e40.bin",logs:2,note:"Fuel pressure clean; adjusted timing and spool region."},
  {rev:"Rev 2",fuel:"E40",status:"Reviewed",delivered:"Sep 8",file:"alex_m340i_rev2_e40.bin",logs:1,note:"Added ethanol calibration and reduced initial boost error."},
  {rev:"Rev 1",fuel:"93",status:"Baseline",delivered:"Sep 5",file:"alex_m340i_rev1_93.bin",logs:1,note:"Initial calibration after stock-file validation."}
];

export default function ProjectPage({params}){
  const id=params?.id || "SP-1842";
  const [requirements,setRequirements]=useState(initialRequirements);
  const [tab,setTab]=useState("All");
  const [projectState,setProjectState]=useState("Log Uploaded → Needs Review");
  const [toast,setToast]=useState("");
  const [note,setNote]=useState("");
  const [notes,setNotes]=useState([{text:"Customer says Rev 4 feels noticeably smoother than Rev 3.",time:"8:50 PM"}]);
  const [showRevision,setShowRevision]=useState(false);
  const [showLogReview,setShowLogReview]=useState(false);

  const filteredTimeline = useMemo(()=>tab==="All"?timeline:timeline.filter(x=>x.type===tab),[tab]);
  const completed = requirements.filter(x=>x.state==="done").length;

  function flash(message){setToast(message);window.setTimeout(()=>setToast(""),2200)}
  function markReviewed(){
    setRequirements(r=>r.map(x=>x.id==="rev4"?{...x,state:"done",detail:"2 Rev 4 pulls reviewed by Doug."}:x));
    setProjectState("Log Reviewed → Revision Decision");
    setShowLogReview(false);
    flash("Rev 4 logs marked reviewed");
  }
  function addNote(){if(!note.trim())return;setNotes(n=>[{text:note.trim(),time:"Just now"},...n]);setNote("");flash("Internal note added")}

  return <main className={styles.page}>
    {toast&&<div className={styles.toast}>{toast}</div>}
    <div className={styles.top}>
      <div>
        <Link className={styles.back} href="/">← Back to dashboard</Link>
        <div className={styles.eyebrow}>ACTIVE TUNE PROJECT • {id}</div>
        <h1 className={styles.title}>Alex Rivera — 2021 BMW M340i</h1>
        <div className={styles.sub}>B58TU • MHD • E40 • Rev 4 • Last activity 18 minutes ago</div>
      </div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={()=>flash("Customer message composer opened")}>Message customer</button>
        <button className={styles.btn} onClick={()=>setShowRevision(true)}>Create revision</button>
        <button className={`${styles.btn} ${styles.primary}`} onClick={()=>setShowLogReview(true)}>Review logs</button>
      </div>
    </div>

    <section className={styles.workflowBar}>
      {["Order","Intake","Stock File","Baseline","Revisions","Log Review","Complete"].map((s,i)=><div key={s} className={`${styles.workflowStep} ${i<5?styles.workflowDone:i===5?styles.workflowActive:""}`}><i>{i<5?"✓":i+1}</i><span>{s}</span></div>)}
    </section>

    <section className={styles.summary}>
      <div className={`${styles.card} ${styles.hero}`}>
        <div className={styles.heroTop}>
          <div className={styles.customer}><div className={styles.avatar}>AR</div><div><h2>Alex Rivera</h2><p>alex.rivera@gmail.com • Customer since 2025 • 2 vehicles</p></div></div>
          <div className={styles.badges}><span className={styles.badge}>MHD</span><span className={`${styles.badge} ${styles.badgeBlue}`}>B58TU</span><span className={`${styles.badge} ${styles.badgeAmber}`}>E40</span><span className={`${styles.badge} ${styles.badgePurple}`}>Rev 4</span></div>
        </div>
        <div className={styles.facts}>
          {[['Order','SP-1842'],['VIN','WBA5U7C0…1284'],['ECU / ROM','MG1CS003'],['Fuel','E40 Flex'],['Turbo','Stock'],['HPFP','Dorch Stage 2'],['Downpipe','High-flow'],['Transmission','ZF8']].map(([a,b])=><div className={styles.fact} key={a}><span>{a}</span><b>{b}</b></div>)}
        </div>
      </div>
      <aside className={`${styles.card} ${styles.next}`}>
        <span>NEXT ACTION</span><h3>{projectState.startsWith("Log Reviewed")?"Decide Rev 5 changes":"Review 2 new MHD logs"}</h3>
        <p>{projectState.startsWith("Log Reviewed")?"Log review is complete. Add tuner notes, create Rev 5, or request another pull.":"Customer uploaded two fresh 3rd-gear pulls on Rev 4. Stock file and parameter pack are already complete."}</p>
        <button className={`${styles.btn} ${styles.primary}`} onClick={()=>projectState.startsWith("Log Reviewed")?setShowRevision(true):setShowLogReview(true)}>{projectState.startsWith("Log Reviewed")?"Create Rev 5":"Open log review"}</button>
        <div className={styles.progress}><i style={{width:projectState.startsWith("Log Reviewed")?"82%":"72%"}}/></div><div className={styles.progressMeta}><span>Project progress</span><b>{projectState.startsWith("Log Reviewed")?"82%":"72%"}</b></div>
      </aside>
    </section>

    <div className={styles.layout}>
      <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Requirements & Intake</h3><p>Everything required before Doug can safely continue tuning.</p></div><span className={styles.badge}>{completed} / {requirements.length} complete</span></div>
          <div className={styles.body}><div className={styles.requirements}>{requirements.map(r=><div className={styles.req} key={r.id}><span className={`${styles.dot} ${r.state!=="done"?styles.dotWait:""}`}>{r.state==="done"?"✓":"!"}</span><div><b>{r.title}</b><small>{r.detail}</small></div><button onClick={()=>r.id==="rev4"?setShowLogReview(true):flash(`${r.action}: ${r.title}`)}>{r.action}</button></div>)}</div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Revision History</h3><p>Every map version stays tied to the logs and notes that produced it.</p></div><button className={styles.btn} onClick={()=>setShowRevision(true)}>+ Create Rev</button></div>
          <div className={styles.body}><div className={styles.revisionList}>{revisions.map(r=><div className={styles.revisionRow} key={r.rev}><div className={styles.revBadge}>{r.rev}</div><div className={styles.revMain}><div><b>{r.file}</b><span>{r.delivered} • {r.fuel} • {r.logs} log{r.logs===1?"":"s"}</span></div><p>{r.note}</p></div><em>{r.status}</em></div>)}</div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Project Timeline</h3><p>Permanent history for this vehicle and tune.</p></div><span className={`${styles.badge} ${styles.badgeBlue}`}>18 events</span></div>
          <div className={styles.body}><div className={styles.tabs}>{["All","Revisions","Logs","Messages","Automation"].map(t=><button key={t} className={`${styles.tab} ${tab===t?styles.active:""}`} onClick={()=>setTab(t)}>{t}</button>)}</div><div className={styles.timeline}>{filteredTimeline.map((e,i)=><div className={styles.event} key={`${e.title}-${i}`}><i className={styles.eventDot}/><div><b>{e.title}</b><p>{e.body}</p></div><time>{e.time}</time></div>)}</div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Latest Log Snapshot</h3><p>Rev 4 • 3rd gear • E40 • MHD CSV</p></div><button className={styles.btn} onClick={()=>setShowLogReview(true)}>Full review</button></div>
          <div className={styles.body}><div className={styles.logs}>{[["Boost Target","24.0 psi",82],["Boost Actual","24.3 psi",84],["Lambda","0.81",78],["Timing Corr.","-1.5°",34],["HPFP Min","2,570 psi",88],["IAT Peak","118°F",62]].map(([a,b,w])=><div className={styles.metric} key={a}><span>{a}</span><b>{b}</b><div className={styles.bar}><i style={{width:`${w}%`}}/></div></div>)}</div><div className={styles.note} style={{marginTop:12}}>Clean pull overall. No throttle closure. Small cylinder 4 correction around 5,700 RPM. Fuel pressure stays healthy through the hit.</div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Tuner Notes</h3><p>Internal only. Keep revision reasoning with the project.</p></div><span className={styles.badge}>{notes.length} notes</span></div>
          <div className={styles.body}><div className={styles.noteComposer}><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add internal note for next revision, hardware concern, customer feedback..."/><button className={`${styles.btn} ${styles.primary}`} onClick={addNote}>Add note</button></div><div className={styles.internalNotes}>{notes.map((n,i)=><div key={i}><b>Doug</b><span>{n.time}</span><p>{n.text}</p></div>)}</div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Customer Communication</h3><p>Gmail thread stays attached to the project.</p></div><span className={styles.badge}>Synced</span></div>
          <div className={styles.body}><div className={styles.message}><b>Alex Rivera</b><span>8:42 PM</span><p>Just uploaded two new logs. Car feels much smoother on this revision.</p></div><div className={styles.message}><b>Doug</b><span>8:48 PM</span><p>Perfect. I have them attached to your tune now. I’ll review the pull and get back to you with the next step.</p></div><div className={styles.composer}><input placeholder="Reply through Doug’s Gmail…"/><button onClick={()=>flash("Demo reply staged — no message sent")}>Send</button></div></div>
        </section>
      </div>

      <aside className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Quick Actions</h3><p>Common tuner actions for this project.</p></div></div>
          <div className={styles.body}><div className={styles.quickGrid}><button onClick={()=>flash("Stock-file request staged")}>Request stock file<span>MHD prerequisite</span></button><button onClick={()=>flash("Parameter pack staged")}>Send parameter pack<span>B58TU v3.2</span></button><button onClick={()=>flash("New-log request staged")}>Request new log<span>Rev 4 instructions</span></button><button onClick={()=>setProjectState("Waiting on Customer")}>Set waiting<span>Pause Doug timer</span></button></div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Automations</h3><p>Rules active for this exact vehicle.</p></div><Link href="/automations" className={styles.textLink}>Open Studio →</Link></div>
          <div className={styles.body}><div className={styles.automation}>{[["Request MHD stock file","Completed",["MHD","Stock file missing","Email + portal task"]],["Send B58TU parameter pack","Completed",["Stock file received","B58TU","Pack v3.2"]],["Request next log after revision","Active",["Revision delivered","Send instructions","Await log"]]].map(([title,status,flow])=><div className={styles.rule} key={title}><div className={styles.ruleTop}><b>{title}</b><small>{status}</small></div><div className={styles.flow}>{flow.map((x,i)=><span key={x} className={styles.flowWrap}><span className={styles.chip}>{x}</span>{i<flow.length-1&&<span className={styles.arrow}>→</span>}</span>)}</div></div>)}</div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Files</h3><p>Project-owned source and revision files.</p></div><button className={styles.btn} onClick={()=>flash("File picker would open here")}>+ Add</button></div>
          <div className={styles.body}><div className={styles.files}>{[["stock_backup.bin","MHD stock file • Sep 9","Source"],["B58TU_MHD_Params_v3.2.pdf","Subpar parameter pack","Pack"],["alex_m340i_rev4_e40.bin","Delivered yesterday","Rev 4"],["rev4_pull_01.csv","MHD log • 18m ago","Log"],["rev4_pull_02.csv","MHD log • 18m ago","Log"]].map(([a,b,c])=><div className={styles.file} key={a}><div><b>{a}</b><span>{b}</span></div><em>{c}</em></div>)}</div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Project Details</h3><p>Fast context without hunting.</p></div></div>
          <div className={styles.body}><div className={styles.sideList}>{[["Tune product","B58/B58TU Custom Tune"],["Purchased via","Wix • Paid"],["Assigned tuner","Doug Talmadge"],["Current state",projectState]].map(([a,b])=><div className={styles.sideItem} key={a}><span>{a}</span><b>{b}</b></div>)}<div className={`${styles.sideItem} ${styles.callout}`}><span>Customer waiting</span><b>{projectState==="Waiting on Customer"?"Paused":"18 minutes"}</b></div></div><div className={styles.footerNote}>Synthetic demo data for workflow/design feedback only.</div></div>
        </section>
      </aside>
    </div>

    {showLogReview&&<div className={styles.modalBackdrop} onClick={()=>setShowLogReview(false)}><section className={styles.modal} onClick={e=>e.stopPropagation()}><div className={styles.modalHead}><div><span>REV 4 LOG REVIEW</span><h2>Alex Rivera • 2 new pulls</h2></div><button onClick={()=>setShowLogReview(false)}>×</button></div><div className={styles.modalBody}><div className={styles.reviewChecks}>{[["Boost tracking","24.3 / 24.0 psi","Good"],["Throttle closure","None","Good"],["HPFP minimum","2,570 psi","Good"],["Lambda","0.81","Good"],["Timing correction","Cyl 4: -1.5°","Watch"],["IAT peak","118°F","Normal"]].map(([a,b,c])=><div key={a}><span>{a}</span><b>{b}</b><em className={c==="Watch"?styles.watch:""}>{c}</em></div>)}</div><label className={styles.reviewNote}><span>Doug’s review note</span><textarea defaultValue="Clean pull overall. No throttle closure. Small cylinder 4 correction near 5,700 RPM. Fuel pressure remains healthy."/></label><div className={styles.modalActions}><button className={styles.btn} onClick={()=>flash("Follow-up log request staged")}>Request another log</button><button className={`${styles.btn} ${styles.primary}`} onClick={markReviewed}>Mark reviewed</button></div></div></section></div>}

    {showRevision&&<div className={styles.modalBackdrop} onClick={()=>setShowRevision(false)}><section className={styles.modal} onClick={e=>e.stopPropagation()}><div className={styles.modalHead}><div><span>CREATE REVISION</span><h2>Start Rev 5</h2></div><button onClick={()=>setShowRevision(false)}>×</button></div><div className={styles.modalBody}><div className={styles.formGrid}><label><span>Base revision</span><select defaultValue="Rev 4"><option>Rev 4</option><option>Rev 3</option></select></label><label><span>Fuel</span><select defaultValue="E40"><option>E40</option><option>93</option><option>E50</option></select></label><label className={styles.full}><span>Revision goal / changes</span><textarea defaultValue="Address small cyl 4 correction near 5,700 RPM. Preserve current boost response and fuel-pressure behavior."/></label><label className={styles.full}><span>Map file</span><input placeholder="Drop or choose .bin / .map file"/></label></div><div className={styles.modalActions}><button className={styles.btn} onClick={()=>setShowRevision(false)}>Cancel</button><button className={`${styles.btn} ${styles.primary}`} onClick={()=>{setProjectState("Rev 5 Draft");setShowRevision(false);flash("Rev 5 draft created")}}>Create Rev 5 draft</button></div></div></section></div>}
  </main>
}
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, FileText, Gauge,
  Mail, MessageSquare, PackageCheck, Save, Send, ShieldCheck, UploadCloud,
  UserRound, Wrench, Zap
} from "lucide-react";
import styles from "./revision.module.css";

const reviewFindings = [
  ["Boost tracking","24.3 / 24.0 psi","Good"],
  ["Throttle closure","None","Good"],
  ["HPFP minimum","2,570 psi","Good"],
  ["Worst timing correction","Cyl 4: -1.5°","Watch"],
  ["IAT peak","118°F","Normal"]
];

const defaultChanges = [
  {id:"timing",label:"Clean up cylinder 4 timing near 5,700 RPM",on:true},
  {id:"boost",label:"Preserve current boost response / tracking",on:true},
  {id:"fuel",label:"Keep current E40 fueling strategy",on:true},
  {id:"torque",label:"No additional low-RPM torque increase",on:true}
];

export default function RevisionWorkspace({params}){
  const id = params?.id || "SP-1842";
  const [status,setStatus] = useState("Draft");
  const [fileReady,setFileReady] = useState(false);
  const [changes,setChanges] = useState(defaultChanges);
  const [internalNote,setInternalNote] = useState("Address small cylinder 4 correction near 5,700 RPM. Keep the Rev 4 boost response and healthy fuel-pressure behavior.");
  const [customerSummary,setCustomerSummary] = useState("Small high-RPM timing cleanup while keeping the smoother torque delivery and boost response from Rev 4.");
  const [requestLog,setRequestLog] = useState(true);
  const [attachPack,setAttachPack] = useState(true);
  const [email,setEmail] = useState(true);
  const [portal,setPortal] = useState(true);
  const [toast,setToast] = useState("");
  const [showPreview,setShowPreview] = useState(false);

  const checked = useMemo(()=>changes.filter(x=>x.on).length,[changes]);
  const ready = fileReady && customerSummary.trim() && checked > 0;

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function toggleChange(id){setChanges(list=>list.map(x=>x.id===id?{...x,on:!x.on}:x))}
  function publish(){
    if(!ready){flash("Add the Rev 5 map file before publishing");return;}
    setStatus("Published");
    flash("Rev 5 published in demo workflow");
  }

  return <main className={styles.page}>
    {toast&&<div className={styles.toast}>{toast}</div>}

    <header className={styles.topbar}>
      <div className={styles.topLeft}>
        <Link href={`/log-review/${id}`} className={styles.back}><ArrowLeft size={14}/>Log review</Link>
        <div><span className={styles.eyebrow}>REVISION WORKSPACE • {id}</span><h1>Build & deliver Rev 5</h1><p>Alex Rivera • 2021 BMW M340i • B58TU • MHD • E40</p></div>
      </div>
      <div className={styles.actions}>
        <button onClick={()=>flash("Draft saved")}><Save size={14}/>Save draft</button>
        <button onClick={()=>setShowPreview(true)}><UserRound size={14}/>Customer preview</button>
        <button className={styles.primary} onClick={publish}><Send size={14}/>{status==="Published"?"Published":"Publish Rev 5"}</button>
      </div>
    </header>

    <section className={styles.statusStrip}>
      <div><Wrench size={17}/><span><b>Rev 5 • {status}</b><small>Based on Rev 4 log review • 2 pulls reviewed</small></span></div>
      <div className={styles.pills}><span>MHD</span><span>B58TU</span><span>E40</span><span className={ready?styles.good:styles.warn}>{ready?"Ready to publish":"Needs map file"}</span></div>
    </section>

    <div className={styles.layout}>
      <section className={styles.mainCol}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>SOURCE REVIEW</span><h2>What Rev 5 is responding to</h2></div><Link href={`/log-review/${id}`}>Open full log review <ArrowRight size={12}/></Link></div>
          <div className={styles.reviewGrid}>{reviewFindings.map(([a,b,c])=><div key={a}><span>{a}</span><b>{b}</b><em className={c==="Watch"?styles.watch:styles.goodText}>{c}</em></div>)}</div>
          <div className={styles.reviewNote}><Gauge size={16}/><div><b>Doug's Rev 4 review</b><p>Both pulls are consistent. No throttle closure and fuel pressure stays healthy. Pull 1 shows a small cylinder 4 correction around 5,700 RPM that improves on Pull 2.</p></div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>REVISION PLAN</span><h2>Changes for Rev 5</h2><p>Keep the internal tuning intent attached to this file forever.</p></div><span className={styles.count}>{checked} selected</span></div>
          <div className={styles.changeList}>{changes.map(c=><button key={c.id} onClick={()=>toggleChange(c.id)} className={c.on?styles.changeOn:""}><span>{c.on?<Check size={13}/>:null}</span><b>{c.label}</b></button>)}</div>
          <label className={styles.field}><span>Internal tuner note</span><textarea value={internalNote} onChange={e=>setInternalNote(e.target.value)}/><small>Internal only — never shown to the customer.</small></label>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>MAP FILE</span><h2>Revision file</h2></div><span className={fileReady?styles.readyBadge:styles.draftBadge}>{fileReady?"Attached":"Required"}</span></div>
          {!fileReady?<button className={styles.dropzone} onClick={()=>{setFileReady(true);flash("Demo map file attached")}}><UploadCloud size={26}/><b>Attach Rev 5 map file</b><span>Drop or choose the file Doug will deliver</span><small>Demo action — no real file is uploaded.</small></button>:<div className={styles.fileReady}><div className={styles.fileIcon}><FileText size={20}/></div><div><b>alex_m340i_rev5_e40.bin</b><span>MHD custom tune • Rev 5 • E40</span></div><em>Ready</em><button onClick={()=>setFileReady(false)}>Replace</button></div>}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>CUSTOMER-FACING DELIVERY</span><h2>What Alex will see</h2><p>Separate customer language from Doug's internal revision notes.</p></div></div>
          <label className={styles.field}><span>What's changed</span><textarea value={customerSummary} onChange={e=>setCustomerSummary(e.target.value)}/></label>
          <div className={styles.deliveryOptions}>
            <button className={requestLog?styles.optionOn:""} onClick={()=>setRequestLog(v=>!v)}><span>{requestLog?<Check size={12}/>:null}</span><div><b>Request another log after install</b><small>Moves project to Waiting on Customer</small></div></button>
            <button className={attachPack?styles.optionOn:""} onClick={()=>setAttachPack(v=>!v)}><span>{attachPack?<Check size={12}/>:null}</span><div><b>Attach B58TU MHD logging pack v3.2</b><small>Customer gets the exact channels/instructions</small></div></button>
          </div>
        </section>
      </section>

      <aside className={styles.sideCol}>
        <section className={`${styles.card} ${styles.deliveryCard}`}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>DELIVERY CHECK</span><h2>Ready to send?</h2></div><PackageCheck size={18}/></div>
          <div className={styles.checks}>
            <div className={checked>0?styles.ok:""}><span>{checked>0?<Check size={12}/>:"1"}</span><div><b>Revision plan</b><small>{checked} changes selected</small></div></div>
            <div className={fileReady?styles.ok:""}><span>{fileReady?<Check size={12}/>:"2"}</span><div><b>Map file</b><small>{fileReady?"Rev 5 file attached":"Still required"}</small></div></div>
            <div className={customerSummary.trim()?styles.ok:""}><span>{customerSummary.trim()?<Check size={12}/>:"3"}</span><div><b>Customer summary</b><small>{customerSummary.trim()?"Ready":"Add customer-visible notes"}</small></div></div>
            <div className={styles.ok}><span><Check size={12}/></span><div><b>Next-step instructions</b><small>{requestLog?"Request next log":"No log requested"}</small></div></div>
          </div>
          <button className={`${styles.publish} ${ready?styles.publishReady:""}`} onClick={publish}>{status==="Published"?<><CheckCircle2 size={15}/>Rev 5 published</>:<><Send size={15}/>Publish Rev 5</>}</button>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>SEND THROUGH</span><h2>Delivery channels</h2></div></div>
          <div className={styles.channelOptions}>
            <button className={portal?styles.channelOn:""} onClick={()=>setPortal(v=>!v)}><ShieldCheck size={16}/><span><b>Customer portal</b><small>Make Rev 5 available immediately</small></span><em>{portal?"On":"Off"}</em></button>
            <button className={email?styles.channelOn:""} onClick={()=>setEmail(v=>!v)}><Mail size={16}/><span><b>Gmail notification</b><small>Send Doug-approved delivery message</small></span><em>{email?"On":"Off"}</em></button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>AUTOMATION HANDOFF</span><h2>After publish</h2></div><Zap size={17}/></div>
          <div className={styles.handoff}>
            <div><span>1</span><div><b>Rev 5 becomes current</b><small>Previous revisions remain immutable</small></div></div>
            <div><span>2</span><div><b>Customer gets file + summary</b><small>{portal&&email?"Portal + Gmail":portal?"Portal only":email?"Gmail only":"No delivery channel selected"}</small></div></div>
            <div><span>3</span><div><b>{requestLog?"Request next MHD pull":"Wait for customer feedback"}</b><small>{attachPack?"Parameter pack attached automatically":"No pack attached"}</small></div></div>
            <div><span>4</span><div><b>New log routes back to Doug</b><small>Datalog Reviews + same project history</small></div></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.eyebrow}>RELATED</span><h2>Project shortcuts</h2></div></div>
          <div className={styles.shortcuts}>
            <Link href={`/project/${id}`}>Tuner project <ChevronRight size={13}/></Link>
            <Link href={`/portal/${id}`}>Customer portal <ChevronRight size={13}/></Link>
            <Link href={`/workflow/${id}`}>End-to-end workflow <ChevronRight size={13}/></Link>
          </div>
        </section>
      </aside>
    </div>

    {showPreview&&<div className={styles.modalBack} onClick={()=>setShowPreview(false)}><section className={styles.modal} onClick={e=>e.stopPropagation()}>
      <div className={styles.modalHead}><div><span className={styles.eyebrow}>CUSTOMER PREVIEW</span><h2>Alex's Rev 5 delivery</h2></div><button onClick={()=>setShowPreview(false)}>×</button></div>
      <div className={styles.customerPreview}>
        <div className={styles.previewBrand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR TUNING</b><span>Your new revision is ready</span></div></div>
        <div className={styles.previewHero}><span>REVISION 5 • E40</span><h3>New calibration ready for your M340i</h3><p>{customerSummary}</p></div>
        <div className={styles.previewFile}><FileText size={18}/><div><b>{fileReady?"alex_m340i_rev5_e40.bin":"Rev 5 map file"}</b><span>{fileReady?"Ready to download":"File will appear here when Doug attaches it"}</span></div><button>Download</button></div>
        {requestLog&&<div className={styles.previewNext}><MessageSquare size={16}/><div><b>Next step: send Doug another log</b><p>Flash Rev 5, follow the B58TU MHD logging instructions, then upload a clean 3rd-gear pull.</p></div></div>}
      </div>
    </section></div>}
  </main>
}

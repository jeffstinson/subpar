"use client";

import { useEffect,useRef,useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Check,CheckCircle2,Download,FileText,Gauge,Loader2,LockKeyhole,MessageSquare,ShieldCheck,UploadCloud,Wrench } from "lucide-react";
import styles from "./delivery-portal.module.css";

const statusLabel=value=>String(value||"").replaceAll("_"," ");

export default function DeliveryPortalClient({projectNumber}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");
  const input=useRef(null);

  async function load(){
    setLoading(true);
    try{const response=await fetch(`/api/v1/portal/deliveries/${encodeURIComponent(projectNumber)}?preview=alex`,{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to load revision delivery");setData(body.data)}catch(error){setNotice(error.message)}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[projectNumber]);

  async function acknowledge(installed){
    if(!data?.delivery?.id)return;setBusy(installed?"install":"ack");setNotice("");
    try{const response=await fetch(`/api/v1/portal/deliveries/${encodeURIComponent(projectNumber)}?preview=alex`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"acknowledge",deliveryId:data.delivery.id,installed})});const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to save acknowledgement");setNotice(body.data?.dryRun?`Preview: ${installed?"install confirmation would open the next step":"delivery receipt would be acknowledged"}.`:installed?"Install confirmed. Your next step is open below.":"Revision receipt confirmed.");await load()}catch(error){setNotice(error.message)}finally{setBusy("")}
  }

  async function download(){
    if(!data?.file?.id)return;setBusy("download");setNotice("");
    try{const response=await fetch("/api/v1/storage/ticket",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"download",project:projectNumber,fileId:data.file.id,principal:"alex"})});const body=await response.json();if(!response.ok)throw new Error(body.error||"Secure download failed");if(body.ticket?.signedUrl)window.open(body.ticket.signedUrl,"_blank","noopener,noreferrer");setNotice(body.ticket?.dryRun?"Preview: Subpar OS would issue a short-lived private download URL for this exact revision.":"Secure download opened. The URL expires automatically.")}catch(error){setNotice(error.message)}finally{setBusy("")}
  }

  async function uploadLog(file){
    if(!file)return;setBusy("upload");setNotice("Preparing your log upload…");
    try{
      const prepare=await fetch(`/api/v1/portal/logs/${encodeURIComponent(projectNumber)}?preview=alex`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:file.name})});
      const prep=await prepare.json();if(!prepare.ok)throw new Error(prep.error||"Unable to prepare log upload");
      const logId=prep.data.logId;
      const ticketResponse=await fetch("/api/v1/storage/ticket",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload",project:projectNumber,kind:"datalog",fileName:file.name,logId,revisionNumber:data?.revision?.revisionNumber,principal:"alex"})});
      const ticketBody=await ticketResponse.json();if(!ticketResponse.ok)throw new Error(ticketBody.error||"Secure upload ticket failed");const ticket=ticketBody.ticket;
      if(ticket.signedUrl){
        setNotice("Uploading your log privately…");
        const url=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY;if(!url||!key)throw new Error("Portal storage configuration is missing");
        const supabase=createClient(url,key,{auth:{persistSession:true}});const {error}=await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type||"text/csv",upsert:false});if(error)throw new Error(`Private log upload failed: ${error.message}`);
      }
      const finalize=await fetch("/api/v1/storage/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project:projectNumber,finalizeToken:ticket.finalizeToken,principal:"alex",mimeType:file.type||"text/csv",sizeBytes:file.size,visibility:"internal"})});
      const done=await finalize.json();if(!finalize.ok)throw new Error(done.error||"Log finalization failed");
      setNotice(done.dryRun?"Preview complete: your CSV passed the private log-upload flow. In production it will parse and return to Doug's review queue.":done.analysisError?`Log stored successfully. Parser needs Doug's attention: ${done.analysisError}`:"Log uploaded, normalized and routed back to Doug's Review Cockpit.");
    }catch(error){setNotice(error.message)}finally{setBusy("");if(input.current)input.current.value=""}
  }

  if(loading)return <section className={styles.loading}><Loader2 size={24}/><b>Loading your revision…</b></section>;
  if(!data?.delivery||!data?.revision)return <section className={styles.empty}><ShieldCheck size={25}/><b>No new revision is waiting for you.</b><p>Your current tune status remains available in the main portal.</p></section>;

  const installed=Boolean(data.delivery.installedAt);
  const acknowledged=Boolean(data.delivery.acknowledgedAt);
  const wantsLog=data.delivery.nextStep==="request_log";
  const vehicle=[data.project?.vehicle?.year,data.project?.vehicle?.make,data.project?.vehicle?.model].filter(Boolean).join(" ");

  return <section className={styles.shell}>
    <section className={styles.hero}>
      <span>REVISION {data.revision.revisionNumber} · {data.project?.fuelTarget||"CUSTOM TUNE"}</span>
      <h1>Your new calibration is ready.</h1>
      <p>{data.revision.customerSummary||"Doug has prepared and approved your next Subpar Tuning revision."}</p>
      <div className={styles.meta}><span>{vehicle}</span><span>{data.project?.vehicle?.engine}</span><span>{data.project?.platform}</span><span>{statusLabel(data.delivery.status)}</span></div>
    </section>

    <div className={styles.grid}>
      <section className={styles.main}>
        <article className={`${styles.card} ${styles.fileCard}`}>
          <div className={styles.cardHead}><div><span>PRIVATE TUNE FILE</span><h2>Rev {data.revision.revisionNumber}</h2></div><LockKeyhole size={18}/></div>
          {data.file?<div className={styles.file}><div className={styles.fileIcon}><FileText size={21}/></div><div><b>{data.file.name}</b><span>Approved revision · private signed download</span><small>{data.file.sizeBytes?`${Math.round(Number(data.file.sizeBytes)/1024)} KB · `:""}Access expires automatically</small></div><button disabled={Boolean(busy)} onClick={download}><Download size={15}/>{busy==="download"?"Opening…":"Download"}</button></div>:<div className={styles.noFile}>The revision is delivered, but its customer file is not currently available. Contact Subpar Tuning.</div>}
          <aside><ShieldCheck size={14}/><span>This file is tied to your project and is never exposed through a permanent public URL.</span></aside>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}><div><span>INSTALL HANDOFF</span><h2>Keep Doug in the loop</h2></div><Wrench size={18}/></div>
          <div className={styles.steps}><div className={acknowledged?styles.done:""}><i>{acknowledged?<Check size={12}/>:1}</i><div><b>Confirm you received Rev {data.revision.revisionNumber}</b><p>Let the project know the revision reached you.</p></div>{!acknowledged&&<button disabled={Boolean(busy)} onClick={()=>acknowledge(false)}>{busy==="ack"?"Saving…":"I received it"}</button>}</div><div className={installed?styles.done:""}><i>{installed?<Check size={12}/>:2}</i><div><b>Confirm after you install it</b><p>This opens the correct next step for your tune.</p></div>{!installed&&<button disabled={Boolean(busy)} onClick={()=>acknowledge(true)}>{busy==="install"?"Saving…":"Rev is installed"}</button>}</div></div>
        </article>

        {installed&&wantsLog&&<article className={`${styles.card} ${styles.logCard}`}>
          <div className={styles.cardHead}><div><span>NEXT LOG</span><h2>Send Doug the next pull</h2><p>Your upload stays private, gets normalized by Subpar OS, then returns to Doug's review queue.</p></div><Gauge size={18}/></div>
          <label className={styles.drop}><UploadCloud size={25}/><b>{busy==="upload"?"Uploading / parsing…":"Upload your MHD CSV"}</b><span>Use the logging instructions Doug supplied for this project.</span><small>CSV · private storage · parser confidence checked before review</small><input ref={input} type="file" accept=".csv,text/csv" hidden disabled={Boolean(busy)} onChange={e=>uploadLog(e.target.files?.[0])}/></label>
        </article>}

        {installed&&data.delivery.nextStep==="feedback_only"&&<article className={styles.card}><div className={styles.cardHead}><div><span>NEXT STEP</span><h2>Send Doug feedback</h2></div><MessageSquare size={18}/></div><p className={styles.copy}>Drive the revision normally, then use the main portal/message thread to tell Doug how the car feels and anything you want reviewed.</p></article>}

        {installed&&data.delivery.nextStep==="complete"&&<article className={styles.card}><div className={styles.cardHead}><div><span>FINAL HANDOFF</span><h2>Installation confirmed</h2></div><CheckCircle2 size={18}/></div><p className={styles.copy}>Subpar OS has returned the project to Doug for final closeout. Your revision and project history remain in the portal.</p></article>}
      </section>

      <aside className={styles.side}>
        <article className={styles.card}><div className={styles.cardHead}><div><span>PROGRESS</span><h2>Revision handoff</h2></div></div><div className={styles.timeline}><div className={styles.done}><i><Check size={11}/></i><span>Doug approved Rev {data.revision.revisionNumber}</span></div><div className={styles.done}><i><Check size={11}/></i><span>Secure revision delivered</span></div><div className={acknowledged?styles.done:""}><i>{acknowledged?<Check size={11}/>:3}</i><span>Customer receipt confirmed</span></div><div className={installed?styles.done:""}><i>{installed?<Check size={11}/>:4}</i><span>Installation confirmed</span></div><div className={installed?styles.active:""}><i>5</i><span>{wantsLog?"Next log / Doug review":data.delivery.nextStep==="feedback_only"?"Customer feedback":"Final closeout"}</span></div></div></article>
        <article className={styles.card}><div className={styles.cardHead}><div><span>DELIVERY DETAILS</span><h2>Current revision</h2></div></div><div className={styles.details}><span><b>Project</b>{data.project?.projectNumber}</span><span><b>Revision</b>Rev {data.revision.revisionNumber}</span><span><b>Fuel</b>{data.project?.fuelTarget||"—"}</span><span><b>Platform</b>{data.project?.platform||"—"}</span><span><b>Delivered</b>{data.delivery.deliveredAt?new Date(data.delivery.deliveredAt).toLocaleString():"—"}</span></div></article>
      </aside>
    </div>
    {notice&&<div className={styles.notice}>{notice}</div>}
  </section>;
}

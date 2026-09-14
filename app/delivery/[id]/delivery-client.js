"use client";

import { useMemo,useRef,useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AlertTriangle,Check,CheckCircle2,FileKey2,FileText,LockKeyhole,Mail,PackageCheck,RefreshCw,Save,Send,ShieldCheck,UploadCloud } from "lucide-react";
import styles from "./delivery.module.css";

const statusLabel=value=>String(value||"draft").replaceAll("_"," ");
const revNumber=revision=>revision?.revisionNumber??revision?.revision_number??revision?.number??0;
const getName=file=>file?.originalName||file?.original_name||file?.name||"Tune file";

export default function DeliveryClient({initialWorkspace,readiness}){
  const [workspace,setWorkspace]=useState(initialWorkspace);
  const [summary,setSummary]=useState(initialWorkspace.delivery?.customerSummary||initialWorkspace.revision?.customerSummary||initialWorkspace.revision?.customer_summary||"");
  const [notes,setNotes]=useState(initialWorkspace.delivery?.internalQaNotes||initialWorkspace.revision?.internalNotes||initialWorkspace.revision?.internal_notes||"");
  const [nextStep,setNextStep]=useState(initialWorkspace.delivery?.nextStep||"request_log");
  const [stageEmail,setStageEmail]=useState(true);
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");
  const input=useRef(null);
  const project=workspace.project;
  const revision=workspace.revision;
  const delivery=workspace.delivery;
  const file=workspace.primaryFile;
  const gates=workspace.gates?.gates||[];
  const rev=revNumber(revision);
  const canQa=Boolean(revision&&file);
  const approved=delivery?.status==="approved";
  const delivered=new Set(["delivered","acknowledged","relog_requested","closed"]).has(delivery?.status);
  const gatePass=workspace.gates?.pass===true;
  const customer=project?.customer?.name||project?.customer?.email||"Customer";
  const vehicle=[project?.vehicle?.year,project?.vehicle?.make,project?.vehicle?.model].filter(Boolean).join(" ");

  async function refresh(){
    if(!project?.projectNumber)return;
    const response=await fetch(`/api/v1/revision-delivery/${encodeURIComponent(project.projectNumber)}?revision=${rev}`,{cache:"no-store"});
    const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to refresh delivery workspace");
    setWorkspace(body.workspace);
    setSummary(body.workspace.delivery?.customerSummary||body.workspace.revision?.customerSummary||body.workspace.revision?.customer_summary||"");
    setNotes(body.workspace.delivery?.internalQaNotes||body.workspace.revision?.internalNotes||body.workspace.revision?.internal_notes||"");
    setNextStep(body.workspace.delivery?.nextStep||"request_log");
  }

  async function action(name,extra={}){
    if(!project?.projectNumber)return;setBusy(name);setNotice("");
    try{
      const response=await fetch(`/api/v1/revision-delivery/${encodeURIComponent(project.projectNumber)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:name,revisionNumber:rev,customerSummary:summary,internalNotes:notes,nextStep,stageEmail,...extra})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||`${name} failed`);
      const messages={save:"Draft saved.",qa:body.data?.gates?.pass?"Delivery QA passed.":"QA completed — one or more gates still need attention.",approve:"Revision approved. The customer still cannot see the file until delivery.",deliver:body.data?.emailError?`Portal delivery completed. Gmail draft was not staged: ${body.data.emailError}`:"Revision delivered to the portal and Gmail notification staged for approval."};
      setNotice(body.data?.dryRun?`Preview: ${messages[name]}`:messages[name]);
      await refresh();
    }catch(error){setNotice(error.message)}finally{setBusy("")}
  }

  async function uploadTuneFile(fileInput){
    if(!fileInput||!revision)return;setBusy("upload");setNotice("Requesting private upload ticket…");
    try{
      const ticketResponse=await fetch("/api/v1/storage/ticket",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload",project:project.projectNumber,kind:"tune_revision",fileName:fileInput.name,revisionNumber:rev,principal:"doug"})});
      const ticketBody=await ticketResponse.json();if(!ticketResponse.ok)throw new Error(ticketBody.error||"Upload ticket failed");
      const ticket=ticketBody.ticket;
      if(ticket.signedUrl){
        setNotice("Uploading directly into private tune storage…");
        const url=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY;
        if(!url||!key)throw new Error("Public Supabase storage configuration is missing");
        const supabase=createClient(url,key,{auth:{persistSession:true}});
        const {error}=await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path,ticket.token,fileInput,{contentType:fileInput.type||"application/octet-stream",upsert:false});
        if(error)throw new Error(`Private tune upload failed: ${error.message}`);
      }
      const finalizeResponse=await fetch("/api/v1/storage/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project:project.projectNumber,finalizeToken:ticket.finalizeToken,principal:"doug",mimeType:fileInput.type,sizeBytes:fileInput.size,visibility:"internal"})});
      const done=await finalizeResponse.json();if(!finalizeResponse.ok)throw new Error(done.error||"Tune file finalization failed");
      setNotice(done.dryRun?`Preview: ${fileInput.name} passed the private upload/finalization flow.`:`${fileInput.name} registered privately to Rev ${rev}.`);
      await refresh();
    }catch(error){setNotice(error.message)}finally{setBusy("");if(input.current)input.current.value=""}
  }

  const progress=useMemo(()=>{
    const stages=["draft","qa_ready","approved","delivered","acknowledged"];
    const value=delivery?.status||"draft";let index=stages.indexOf(value);if(value==="relog_requested"||value==="closed")index=4;if(index<0)index=0;return {stages,index};
  },[delivery?.status]);

  if(!revision)return <section className={styles.empty}><AlertTriangle size={24}/><b>No revision is ready for delivery.</b><p>Create the next revision from the datalog Review Cockpit first.</p></section>;

  return <section className={styles.workspace}>
    <div className={styles.progress}>{progress.stages.map((stage,index)=><div className={index<=progress.index?styles.progressOn:""} key={stage}><i>{index<progress.index?<Check size={11}/>:index+1}</i><span>{statusLabel(stage)}</span></div>)}</div>

    <div className={styles.layout}>
      <section className={styles.main}>
        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span>REVISION CONTEXT</span><h2>{customer} · Rev {rev}</h2><p>{vehicle} · {project?.vehicle?.engine} · {project?.platform} · {revision?.fuelTarget||revision?.fuel_target||project?.fuelTarget||"Fuel target not set"}</p></div><FileText size={18}/></div>
          <div className={styles.contextGrid}><div><span>PROJECT</span><b>{project?.projectNumber}</b></div><div><span>REVISION</span><b>Rev {rev}</b></div><div><span>REV STATUS</span><b>{statusLabel(revision?.status)}</b></div><div><span>DELIVERY</span><b>{statusLabel(delivery?.status)}</b></div></div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span>PRIVATE ARTIFACT</span><h2>Tune file</h2><p>The file remains internal through upload, QA and approval.</p></div><LockKeyhole size={18}/></div>
          {file?<div className={styles.fileCard}><div className={styles.fileIcon}><FileKey2 size={20}/></div><div><b>{getName(file)}</b><span>{file.visibility||"internal"} · {file.immutable===false?"mutable":"immutable"} · {file.sizeBytes||file.size_bytes?`${Math.round(Number(file.sizeBytes||file.size_bytes)/1024)} KB`:"size pending"}</span>{delivery?.fileSha256&&<small>SHA-256 · {delivery.fileSha256.slice(0,18)}…</small>}</div><em>{file.visibility==="customer"?"CUSTOMER":"PRIVATE"}</em></div>:<label className={styles.drop}><UploadCloud size={24}/><b>Attach Rev {rev} tune file</b><span>Private storage · immutable registration · customer visibility stays OFF</span><input ref={input} type="file" hidden disabled={Boolean(busy)} onChange={e=>uploadTuneFile(e.target.files?.[0])}/></label>}
          {file&&!delivered&&<label className={styles.replace}><UploadCloud size={13}/>{busy==="upload"?"Uploading…":"Attach another revision artifact"}<input ref={input} type="file" hidden disabled={Boolean(busy)} onChange={e=>uploadTuneFile(e.target.files?.[0])}/></label>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span>DELIVERY CONTENT</span><h2>Internal vs customer language</h2></div><ShieldCheck size={18}/></div>
          <label className={styles.field}><span>INTERNAL QA / TUNER NOTE</span><textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} disabled={delivered} placeholder="What changed internally, what review finding this responds to, anything Doug wants retained forever…"/></label>
          <label className={styles.field}><span>CUSTOMER-VISIBLE SUMMARY</span><textarea rows={4} value={summary} onChange={e=>setSummary(e.target.value)} disabled={delivered} placeholder="Plain-language summary of what changed in this revision…"/></label>
          <div className={styles.nextSteps}>{[["request_log","Request another log","Customer installs this revision, then uploads the next approved log."],["feedback_only","Feedback only","Customer installs and reports how the car feels; no automatic log request."],["complete","Final revision","Customer confirms install, then project returns to Doug for closeout."]].map(([value,title,detail])=><button disabled={delivered} className={nextStep===value?styles.selected:""} onClick={()=>setNextStep(value)} key={value}><i>{nextStep===value?<Check size={11}/>:null}</i><div><b>{title}</b><span>{detail}</span></div></button>)}</div>
          {!delivered&&<button className={styles.save} disabled={Boolean(busy)} onClick={()=>action("save")}><Save size={14}/>{busy==="save"?"Saving…":"Save delivery draft"}</button>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span>DELIVERY QA</span><h2>{workspace.gates?.passed||0}/{workspace.gates?.total||0} gates passing</h2><p>QA is deterministic; Doug’s approval remains the human release gate.</p></div>{gatePass?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}</div>
          <div className={styles.gates}>{gates.map(gate=><div className={gate.pass?styles.gatePass:styles.gateFail} key={gate.key}><i>{gate.pass?<Check size={11}/>:"!"}</i><div><b>{gate.label}</b><span>{gate.detail}</span></div><em>{gate.pass?"PASS":"BLOCK"}</em></div>)}</div>
          {!delivered&&<div className={styles.qaActions}><button disabled={Boolean(busy)||!canQa} onClick={()=>action("qa")}><RefreshCw size={14}/>{busy==="qa"?"Running QA…":"Run delivery QA"}</button><button className={styles.approve} disabled={Boolean(busy)||!gatePass||delivery?.status!=="qa_ready"} onClick={()=>action("approve")}><ShieldCheck size={14}/>{busy==="approve"?"Approving…":"Approve revision"}</button></div>}
        </article>
      </section>

      <aside className={styles.side}>
        <article className={`${styles.panel} ${styles.release}`}>
          <div className={styles.panelHead}><div><span>RELEASE CONTROL</span><h2>Customer delivery</h2></div><PackageCheck size={18}/></div>
          <div className={styles.releaseState}><span>{statusLabel(delivery?.status)}</span><b>{approved?"Approved, still private":delivered?"Delivered":"Not releasable yet"}</b><p>{approved?"Doug has approved this artifact. Delivery is the separate action that exposes it to the customer.":delivered?"The exact approved artifact is now customer-visible.":"Run QA and approve the revision before delivery unlocks."}</p></div>
          <label className={styles.emailToggle}><input type="checkbox" checked={stageEmail} onChange={e=>setStageEmail(e.target.checked)} disabled={delivered}/><span><Mail size={14}/><div><b>Stage Gmail notification</b><small>Creates a draft only. Gmail provider send still needs its own tuner approval and send gate.</small></div></span></label>
          <button className={styles.deliver} disabled={Boolean(busy)||!approved||delivered} onClick={()=>action("deliver")}><Send size={15}/>{busy==="deliver"?"Delivering…":delivered?"Delivered":"Deliver approved revision"}</button>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span>GMAIL HANDOFF</span><h2>Notification queue</h2></div><Mail size={17}/></div>
          {workspace.outbound?<div className={styles.outbound}><span>{statusLabel(workspace.outbound.status)}</span><b>{workspace.outbound.subject}</b><small>{workspace.outbound.recipient}</small>{workspace.outbound.last_error&&<p>{workspace.outbound.last_error}</p>}</div>:<div className={styles.muted}>No Gmail delivery draft has been staged yet.</div>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span>CLOSED LOOP</span><h2>After delivery</h2></div></div>
          <div className={styles.loop}><div><i>1</i><span>Customer securely downloads Rev {rev}</span></div><div><i>2</i><span>Customer acknowledges receipt/install</span></div><div><i>3</i><span>{nextStep==="request_log"?"Next log request becomes active":nextStep==="feedback_only"?"Feedback request becomes active":"Project returns for final closeout"}</span></div><div><i>4</i><span>{nextStep==="request_log"?"New CSV returns to /reviews":"History stays attached to this revision"}</span></div></div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span>RUNTIME SAFETY</span><h2>Current gates</h2></div></div>
          <div className={styles.runtime}><span><b>Mutations</b>{readiness.mutationsEnabled?"Enabled":"Dry-run"}</span><span><b>Private files</b>Required</span><span><b>Gmail provider send</b>{readiness.gmailSendEnabled?"Enabled":"Locked"}</span><span><b>Portal handoff</b>Ready</span></div>
        </article>
      </aside>
    </div>
    {notice&&<div className={styles.notice}>{notice}</div>}
  </section>;
}

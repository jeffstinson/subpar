"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Download, Eye, File, FileKey2, LockKeyhole, UploadCloud } from "lucide-react";
import styles from "./files.module.css";

const labels={stock_file:"Stock file",tune_revision:"Tune revision",datalog:"Datalog",parameter_pack:"Parameter pack",customer_file:"Customer file"};

export default function FileManager({project}){
  const [filter,setFilter]=useState("all");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const [kind,setKind]=useState("datalog");
  const input=useRef(null);
  const files=useMemo(()=>filter==="all"?(project.files||[]):project.files?.filter(file=>file.kind===filter)||[],[filter,project.files]);

  async function download(file){
    setBusy(true);setStatus("");
    try{
      const res=await fetch("/api/v1/storage/ticket",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"download",project:project.projectNumber,fileId:file.id,principal:"doug"})});
      const body=await res.json(); if(!res.ok)throw new Error(body.error||"Download ticket failed");
      if(body.ticket?.signedUrl) window.open(body.ticket.signedUrl,"_blank","noopener,noreferrer");
      setStatus(body.ticket?.dryRun?`Preview: ${file.name||file.originalName} would receive a short-lived private download URL.`:"Secure download opened.");
    }catch(error){setStatus(error.message)}finally{setBusy(false)}
  }

  async function upload(file){
    if(!file)return;
    setBusy(true);setStatus("Requesting secure upload ticket…");
    try{
      const currentRevision=Number(project.currentRevision??project.currentRevisionNumber??0)||undefined;
      const ticketRes=await fetch("/api/v1/storage/ticket",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload",project:project.projectNumber,kind,fileName:file.name,principal:"doug",revisionNumber:kind==="tune_revision"?currentRevision:undefined})});
      const ticketBody=await ticketRes.json(); if(!ticketRes.ok)throw new Error(ticketBody.error||"Upload ticket failed");
      const ticket=ticketBody.ticket;
      if(ticket.signedUrl){
        setStatus("Uploading directly to private storage…");
        const url=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL;
        const key=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY;
        if(!url||!key)throw new Error("Public Supabase storage configuration is missing");
        const supabase=createClient(url,key,{auth:{persistSession:true}});
        const {error}=await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type||"application/octet-stream",upsert:false});
        if(error)throw new Error(`Private storage upload failed: ${error.message}`);
      }
      const finalize=await fetch("/api/v1/storage/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project:project.projectNumber,finalizeToken:ticket.finalizeToken,principal:"doug",mimeType:file.type,sizeBytes:file.size,visibility:kind==="parameter_pack"?"customer":"internal"})});
      const done=await finalize.json(); if(!finalize.ok)throw new Error(done.error||"File finalization failed");
      const releaseNote=kind==="tune_revision"?" Tune revisions remain internal until the Revision Delivery workspace passes QA, approval and release.":"";
      setStatus(done.dryRun?`Preview complete: ${file.name} passed ticket → upload → immutable registration flow.${releaseNote}`:`${file.name} registered to ${project.projectNumber}.${releaseNote} Refresh to view it.`);
    }catch(error){setStatus(error.message)}finally{setBusy(false);if(input.current)input.current.value=""}
  }

  return <section className={styles.workspace}>
    <div className={styles.toolbar}><div className={styles.filters}>{["all","stock_file","tune_revision","datalog","parameter_pack","customer_file"].map(value=><button className={filter===value?styles.active:""} onClick={()=>setFilter(value)} key={value}>{value==="all"?"All files":labels[value]}</button>)}</div><div className={styles.upload}><select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><label className={styles.uploadButton}><UploadCloud size={14}/>{busy?"Working…":"Secure upload"}<input ref={input} disabled={busy} type="file" hidden onChange={e=>upload(e.target.files?.[0])}/></label></div></div>
    {status&&<div className={styles.status}><CheckCircle2 size={15}/>{status}</div>}
    <div className={styles.grid}>{files.map(file=><article className={styles.card} key={file.id}><div className={styles.fileIcon}><File size={20}/></div><div className={styles.fileBody}><span>{labels[file.kind]||file.kind}</span><h3>{file.name||file.originalName}</h3><p>{file.visibility==="customer"?"Customer-visible":"Internal only"} · {file.status||"stored"}</p><div className={styles.meta}><span><LockKeyhole size={12}/>Private</span><span><FileKey2 size={12}/>{file.immutable===false?"Mutable":"Immutable history"}</span></div></div><button disabled={busy} onClick={()=>download(file)} title="Create secure download"><Download size={15}/></button></article>)}</div>
    {!files.length&&<div className={styles.empty}><Eye size={24}/><b>No files in this view</b><p>Upload a file above or choose another category.</p></div>}
    <aside className={styles.note}><LockKeyhole size={17}/><div><b>No public tune-file URLs.</b><p>Every download is authorized against the project and gets a short-lived signed URL. Tune revisions always register internal first and can only become customer-visible through the QA-approved Revision Delivery flow.</p></div></aside>
  </section>;
}

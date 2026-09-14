"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Mail, Send, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import styles from "./outbound.module.css";

function id(){return typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():`req_${Date.now()}_${Math.random().toString(16).slice(2)}`}
function previewBody(item){
  if(item.action_type==="send_intake_invite")return `Secure vehicle intake invitation · link generated only when this approved action is actually sent.`;
  return item.payload?.body||item.body||"";
}

export default function OutboundClient({project,initialQueue=[],sendEnabled=false}){
  const [subject,setSubject]=useState(`Subpar Tuning · ${project.projectNumber} update`);
  const [body,setBody]=useState("Hey Alex, I reviewed everything on my side. I’ll send over the next step here once the revision is ready.");
  const [queue,setQueue]=useState(initialQueue);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState("");
  const recipient=project.customer?.email||"";

  async function call(payload){
    const res=await fetch("/api/v1/integrations/gmail/outbound",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,principal:"doug"})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Outbound action failed");
    return data.data;
  }

  async function createDraft(){
    setBusy("draft");setStatus("");
    try{
      const data=await call({action:"draft",project:project.projectNumber,to:recipient,subject,body,requestId:id()});
      if(data.dryRun){
        setQueue(current=>[{...data,id:data.id||id(),created_at:new Date().toISOString(),recipient,to:recipient,action_type:"send_message",payload:{body},created_by:"Doug Talmadge"},...current]);
        setStatus("Preview draft staged locally. No customer email was stored or sent.");
      }else{
        setQueue(current=>[data,...current.filter(item=>item.id!==data.id)]);
        setStatus("Draft added to the approval queue.");
      }
    }catch(error){setStatus(error.message)}finally{setBusy("")}
  }

  async function action(item,type){
    setBusy(item.id);setStatus("");
    try{
      if(item.dryRun){setStatus(`Preview mode: ${type} would require the real Supabase + Gmail gates.`);return}
      const data=await call({action:type,id:item.id});
      setQueue(current=>current.map(row=>row.id===item.id?data:row));
      setStatus(type==="approve"?"Draft approved for provider send.":type==="send"?(data.warning||"Gmail send completed and provider ID was recorded."):"Draft canceled.");
    }catch(error){setStatus(error.message)}finally{setBusy("")}
  }

  const counts=useMemo(()=>({draft:queue.filter(x=>x.status==="draft").length,approved:queue.filter(x=>x.status==="approved").length,sent:queue.filter(x=>x.status==="sent").length}),[queue]);

  return <div className={styles.layout}>
    <section className={styles.composer}>
      <div className={styles.head}><div><span>NEW CUSTOMER MESSAGE</span><h2>Compose through Doug’s Gmail</h2></div><Mail size={19}/></div>
      <label><span>TO</span><input value={recipient} disabled/></label>
      <label><span>SUBJECT</span><input value={subject} onChange={e=>setSubject(e.target.value)}/></label>
      <label><span>MESSAGE</span><textarea rows={9} value={body} onChange={e=>setBody(e.target.value)}/></label>
      <button onClick={createDraft} disabled={Boolean(busy)||!body.trim()}><ShieldCheck size={14}/>{busy==="draft"?"Staging…":"Queue for approval"}</button>
      <p><ShieldCheck size={13}/>Creating a draft never sends the message to Google. Provider send is a separate approved action.</p>
    </section>

    <section className={styles.queue}>
      <div className={styles.head}><div><span>OUTBOUND QUEUE</span><h2>Approval before provider send</h2></div><div className={styles.counters}><b>{counts.draft} draft</b><b>{counts.approved} approved</b><b>{counts.sent} sent</b></div></div>
      <div className={styles.gate}><span className={sendEnabled?styles.on:styles.off}>{sendEnabled?<CheckCircle2 size={13}/>:<TriangleAlert size={13}/>} Gmail provider send {sendEnabled?"enabled":"disabled"}</span><small>Even when enabled, only an approved queue item can call Gmail.</small></div>
      {status&&<div className={styles.status}>{status}</div>}
      <div className={styles.items}>{queue.map(item=><article key={item.id}>
        <div className={styles.itemTop}><span className={`${styles.state} ${styles[item.status]||""}`}>{item.status}</span><time>{item.created_at?new Date(item.created_at).toLocaleString():"Preview"}</time></div>
        <h3>{item.action_type==="send_intake_invite"?"Vehicle Intake · ":""}{item.subject}</h3><p>{previewBody(item)}</p>
        <div className={styles.meta}><span>{item.action_type==="send_intake_invite"?"INTAKE INVITE":"PROJECT MESSAGE"}</span><span>To {item.recipient||item.to}</span><span>{item.created_by||"Subpar OS"}</span>{item.provider_message_id&&<span>Gmail ID {item.provider_message_id}</span>}</div>
        <div className={styles.actions}>
          {item.status==="draft"&&<button onClick={()=>action(item,"approve")} disabled={Boolean(busy)}><CheckCircle2 size={13}/>Approve</button>}
          {item.status==="approved"&&<button className={styles.send} onClick={()=>action(item,"send")} disabled={Boolean(busy)||!sendEnabled}><Send size={13}/>Send via Gmail</button>}
          {!new Set(["sent","canceled"]).has(item.status)&&<button onClick={()=>action(item,"cancel")} disabled={Boolean(busy)}><Trash2 size={13}/>Cancel</button>}
          {item.status==="sent"&&<span className={styles.sent}><CheckCircle2 size={13}/>Delivered to Gmail provider</span>}
          {item.status==="failed"&&<span className={styles.failed}><TriangleAlert size={13}/>{item.last_error||"Send failed"}</span>}
        </div>
      </article>)}</div>
      {!queue.length&&<div className={styles.empty}><Clock3 size={22}/><b>No outbound messages queued</b><p>Project messages and customer intake invitations appear here before they are allowed anywhere near the Gmail send API.</p></div>}
    </section>
  </div>;
}

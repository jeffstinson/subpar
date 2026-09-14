"use client";

import { useMemo,useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock3, Mail, Search, Send, ShieldCheck, UserRound, Wrench } from "lucide-react";
import styles from "./messages.module.css";

function requestId(){return typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():`msg_${Date.now()}_${Math.random().toString(16).slice(2)}`}

function when(value){if(!value)return "—";try{return new Date(value).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}catch{return value}}

export default function CommunicationsClient({workspace,sendEnabled=false}){
  const [query,setQuery]=useState("");
  const [selectedId,setSelectedId]=useState(workspace.threads?.[0]?.id||null);
  const [drafts,setDrafts]=useState({});
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const threads=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return workspace.threads||[];
    return (workspace.threads||[]).filter(thread=>[thread.customer?.name,thread.customer?.email,thread.subject,thread.projectNumber,thread.vehicle?.model,thread.vehicle?.engine,thread.status].filter(Boolean).join(" ").toLowerCase().includes(q));
  },[query,workspace.threads]);
  const active=(workspace.threads||[]).find(thread=>thread.id===selectedId)||threads[0]||null;
  const draft=active?drafts[active.id]??"":"";

  async function queueReply(){
    if(!active||!draft.trim()||!active.projectNumber)return;
    setBusy(true);setStatus("");
    try{
      const response=await fetch("/api/v1/integrations/gmail/outbound",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"draft",project:active.projectNumber,to:active.customer?.email,subject:active.subject||`Subpar Tuning · ${active.projectNumber}`,body:draft,threadId:active.externalThreadId||null,requestId:requestId(),principal:"doug"})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"Unable to queue reply");
      setStatus(body.data?.dryRun?"Preview draft created. Nothing was stored or sent.":"Reply added to the approval queue.");
      setDrafts(current=>({...current,[active.id]:""}));
    }catch(error){setStatus(error.message)}finally{setBusy(false)}
  }

  return <section className={styles.workspace}>
    <aside className={styles.inbox}>
      <div className={styles.inboxHead}><div><span>INBOX</span><h2>Customer threads</h2></div><b>{threads.length}</b></div>
      <label className={styles.search}><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, car, project…"/></label>
      <div className={styles.threadList}>{threads.map(thread=>{
        const last=thread.messages?.at(-1);
        return <button key={thread.id} className={active?.id===thread.id?styles.activeThread:""} onClick={()=>{setSelectedId(thread.id);setStatus("")}}>
          <div className={styles.avatar}>{thread.customer?.name?.split(" ").map(part=>part[0]).slice(0,2).join("")||"?"}</div>
          <div className={styles.threadBody}><div><b>{thread.customer?.name||thread.customer?.email||"Unknown customer"}</b><time>{thread.updatedLabel||when(thread.updatedAt)}</time></div><strong>{thread.subject||"Customer conversation"}</strong><p>{last?.body||"No messages yet"}</p><div className={styles.threadMeta}>{thread.projectNumber&&<span>{thread.projectNumber}</span>}{thread.vehicle?.chassis&&<span>{thread.vehicle.chassis}</span>}{thread.unread>0&&<em>{thread.unread} new</em>}</div></div>
        </button>
      })}</div>
      {!threads.length&&<div className={styles.noThreads}>No matching customer threads.</div>}
    </aside>

    <section className={styles.conversation}>
      {!active?<div className={styles.empty}><Mail size={25}/><b>Select a customer thread</b></div>:<>
        <header className={styles.conversationHead}><div><span>{active.channel?.toUpperCase()||"MESSAGE"}</span><h2>{active.subject}</h2><p>{active.customer?.name} · {active.customer?.email}</p></div>{active.projectNumber&&<Link href={`/project/${active.projectNumber}`}>Open project <ChevronRight size={13}/></Link>}</header>
        <div className={styles.messages}>{(active.messages||[]).map(message=><article key={message.id} className={message.direction==="outbound"?styles.outbound:styles.inbound}>
          <div className={styles.messageTop}><span>{message.direction==="outbound"?"Doug / Subpar Tuning":active.customer?.name||message.sender}</span><time>{when(message.createdAt)}</time></div>
          <p>{message.body}</p>
        </article>)}</div>
        <div className={styles.replyBox}>
          <div className={styles.replyLabel}><span>REPLY THROUGH DOUG’S GMAIL</span><small><ShieldCheck size={12}/>Queues for approval first</small></div>
          <textarea rows={5} value={draft} onChange={e=>setDrafts(current=>({...current,[active.id]:e.target.value}))} placeholder={`Reply to ${active.customer?.name?.split(" ")[0]||"customer"}…`}/>
          <div className={styles.replyActions}><span className={sendEnabled?styles.sendReady:styles.sendLocked}>{sendEnabled?<CheckCircle2 size={12}/>:<Clock3 size={12}/>} Provider send {sendEnabled?"enabled":"locked"}</span><button disabled={busy||!draft.trim()||!active.projectNumber} onClick={queueReply}><ShieldCheck size={13}/>{busy?"Queuing…":"Queue reply"}</button></div>
          {status&&<div className={styles.status}>{status}</div>}
        </div>
      </>}
    </section>

    <aside className={styles.context}>
      {!active?<div className={styles.empty}><UserRound size={23}/></div>:<>
        <section><div className={styles.contextHead}><div className={styles.bigAvatar}>{active.customer?.name?.split(" ").map(part=>part[0]).slice(0,2).join("")||"?"}</div><div><span>CUSTOMER</span><h3>{active.customer?.name}</h3><p>{active.customer?.email}</p></div></div></section>
        <section><span>ACTIVE TUNE CONTEXT</span><dl><div><dt>Project</dt><dd>{active.projectNumber||"Unmatched"}</dd></div><div><dt>Status</dt><dd>{active.status||"—"}</dd></div><div><dt>Waiting on</dt><dd>{active.waitingOn||"—"}</dd></div>{active.currentRevision!==undefined&&<div><dt>Revision</dt><dd>Rev {active.currentRevision||0}</dd></div>}{active.platform&&<div><dt>Platform</dt><dd>{active.platform}</dd></div>}{active.fuel&&<div><dt>Fuel</dt><dd>{active.fuel}</dd></div>}</dl></section>
        {active.vehicle&&<section><span>VEHICLE</span><h3>{[active.vehicle.year,active.vehicle.make,active.vehicle.model].filter(Boolean).join(" ")}</h3><p>{[active.vehicle.chassis,active.vehicle.engine].filter(Boolean).join(" · ")}</p></section>}
        <section className={styles.nextAction}><Wrench size={15}/><div><span>NEXT ACTION</span><b>{active.nextAction||((String(active.waitingOn).toLowerCase()==="doug"||String(active.waitingOn).toLowerCase()==="tuner")?"Reply / review customer update":"Waiting on customer")}</b></div></section>
        <section className={styles.contextLinks}>{active.projectNumber&&<><Link href={`/project/${active.projectNumber}`}>Tuner project <ChevronRight size={12}/></Link><Link href={`/portal/${active.projectNumber}`}>Customer view <ChevronRight size={12}/></Link></>}<Link href="/outbound">Approval queue <ChevronRight size={12}/></Link></section>
      </>}
    </aside>
  </section>;
}

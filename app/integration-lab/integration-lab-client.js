"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Mail, Play, RefreshCw, ShoppingBag } from "lucide-react";
import styles from "./integration-lab.module.css";

function Result({title,result}){
  if(!result)return null;
  const plan=result.plan||result.draft||result;
  return <section className={styles.result}>
    <div className={styles.resultHead}><div><span>DRY-RUN RESULT</span><h3>{title}</h3></div><CheckCircle2 size={18}/></div>
    {plan.idempotencyKey&&<div className={styles.idempotency}><span>Idempotency key</span><code>{plan.idempotencyKey}</code></div>}
    {plan.matches&&<div className={styles.matchGrid}>
      <div><span>Customer match</span><b>{plan.matches.customer?.name||"No existing match"}</b><small>{plan.matches.customer?.email||"Would create/match during apply"}</small></div>
      <div><span>Project match</span><b>{plan.matches.selectedProject||plan.matches.existingProjects?.[0]?.projectNumber||"Intake required"}</b><small>{plan.matches.projects?.length||plan.matches.existingProjects?.length||0} candidate project(s)</small></div>
    </div>}
    {plan.normalized&&<div className={styles.matchGrid}>
      <div><span>Order</span><b>{plan.normalized.externalOrderId||"Missing"}</b><small>{plan.normalized.order.productNames?.join(" · ")||"No product name"}</small></div>
      <div><span>Platform</span><b>{plan.normalized.order.platform||"Collect during intake"}</b><small>{plan.normalized.order.paymentStatus} · {plan.normalized.order.amountCents?`$${(plan.normalized.order.amountCents/100).toFixed(2)}`:"Amount unavailable"}</small></div>
    </div>}
    {plan.thread&&<div className={styles.matchGrid}>
      <div><span>Gmail thread</span><b>{plan.thread.subject||"No subject"}</b><small>{plan.thread.messageCount} message(s) · latest {plan.thread.latestDirection}</small></div>
      <div><span>Latest sender</span><b>{plan.thread.latestFrom||"Unknown"}</b><small>{plan.thread.id}</small></div>
    </div>}
    {plan.actions&&<div className={styles.actionList}>{plan.actions.map((action,index)=><div key={`${action.type}-${index}`}><i>{index+1}</i><div><b>{action.type}</b><span>{action.target}</span></div><em>{action.mode}</em></div>)}</div>}
    {plan.action==="draft"&&<div className={styles.draft}><span>FROM</span><b>{plan.from}</b><span>TO</span><b>{plan.to}</b><span>SUBJECT</span><b>{plan.subject}</b><p>{plan.body}</p><small>{plan.reason}</small></div>}
    <div className={styles.raw}><details><summary>Inspect normalized payload</summary><pre>{JSON.stringify(plan,null,2)}</pre></details></div>
  </section>;
}

export default function IntegrationLabClient(){
  const [busy,setBusy]=useState("");
  const [result,setResult]=useState(null);
  const [title,setTitle]=useState("");
  const [runs,setRuns]=useState({wix:0,gmail:0,draft:0});

  async function run(provider){
    setBusy(provider);setResult(null);
    try{
      const response=await fetch("/api/v1/integrations/simulate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider,principal:"doug"})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"Simulation failed");
      setRuns(value=>({...value,[provider]:value[provider]+1}));
      setTitle(provider==="wix"?"Wix paid-order intake":"Gmail inbound thread sync");
      setResult(body);
    }catch(error){setTitle("Simulation error");setResult({error:error.message})}finally{setBusy("")}
  }

  async function draft(){
    setBusy("draft");setResult(null);
    try{
      const response=await fetch("/api/v1/integrations/gmail/draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({principal:"doug",project:"SP-1842",subject:"Rev 4 log review · next step",body:"Alex — I reviewed the new Rev 4 pulls. Everything looks healthy overall. I’m preparing the next revision and will send the install/logging instructions with it."})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"Draft preview failed");
      setRuns(value=>({...value,draft:value.draft+1}));
      setTitle("Gmail outbound draft boundary");setResult(body);
    }catch(error){setTitle("Draft error");setResult({error:error.message})}finally{setBusy("")}
  }

  const replayNote=useMemo(()=>runs.wix>1?"Same synthetic Wix event replayed — the idempotency key should remain identical.":"Run Wix twice to prove deterministic replay identity.",[runs.wix]);

  return <div className={styles.lab}>
    <div className={styles.simGrid}>
      <article className={styles.simCard}><div className={styles.icon}><ShoppingBag size={20}/></div><span>WIX ORDER</span><h3>Paid order → intake plan</h3><p>Normalize a synthetic Wix order, match the customer, infer the tuning platform and show every action Subpar OS would stage.</p><button onClick={()=>run("wix")} disabled={Boolean(busy)}><Play size={14}/>{busy==="wix"?"Running…":"Run Wix simulation"}</button><small><RefreshCw size={11}/>{replayNote}</small></article>
      <article className={styles.simCard}><div className={styles.icon}><Mail size={20}/></div><span>GMAIL INBOUND</span><h3>Thread → project match</h3><p>Normalize a synthetic Gmail thread, match Alex by email, attach it to SP-1842 and decide whether Doug’s queue should be signaled.</p><button onClick={()=>run("gmail")} disabled={Boolean(busy)}><Play size={14}/>{busy==="gmail"?"Running…":"Run Gmail sync simulation"}</button><small>{runs.gmail?`${runs.gmail} simulation run(s) completed.`:"No message is persisted in preview mode."}</small></article>
      <article className={styles.simCard}><div className={styles.icon}><Copy size={20}/></div><span>GMAIL OUTBOUND</span><h3>Draft before send</h3><p>Build the exact customer email payload against Alex’s project while keeping Gmail sending hard-disabled.</p><button onClick={draft} disabled={Boolean(busy)}><Play size={14}/>{busy==="draft"?"Building…":"Preview outbound draft"}</button><small>{runs.draft?`${runs.draft} draft preview(s) built.`:"Outbound send remains behind a separate gate."}</small></article>
    </div>
    {result?.error?<div className={styles.error}>{result.error}</div>:<Result title={title} result={result}/>} 
  </div>;
}

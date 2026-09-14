"use client";

import Link from "next/link";
import { useMemo,useState } from "react";
import { Archive,ArrowRight,Check,CheckCircle2,Clock3,FileKey2,History,Mail,PackageCheck,RefreshCw,RotateCcw,Save,ShieldCheck,Wrench } from "lucide-react";
import styles from "./lifecycle.module.css";

const nice=value=>String(value||"—").replaceAll("_"," ");
const fileName=file=>file?.originalName||file?.original_name||file?.name||"Final tune";

export default function CloseoutClient({initialWorkspace,readiness}){
  const [workspace,setWorkspace]=useState(initialWorkspace);
  const [summary,setSummary]=useState(initialWorkspace.closeout?.customerSummary||initialWorkspace.finalRevision?.customerSummary||initialWorkspace.finalRevision?.customer_summary||"");
  const [aftercare,setAftercare]=useState(initialWorkspace.closeout?.aftercareNotes||"If you change fuel, turbo, fuel system, exhaust, injectors or other major hardware, contact Subpar before continuing to use this calibration. Your completed tune history stays attached to this vehicle.");
  const [followupDays,setFollowupDays]=useState(initialWorkspace.closeout?.followupDays??7);
  const [stageEmail,setStageEmail]=useState(true);
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");
  const [reopen,setReopen]=useState({reason:"hardware_change",changeSummary:"",hardwareChanges:"",fuelTarget:initialWorkspace.project?.fuelTarget||""});
  const project=workspace.project||{},cycle=workspace.cycle||{},closeout=workspace.closeout||null,finalRevision=workspace.finalRevision||null,finalFile=workspace.finalFile||null,followup=workspace.followup||null;
  const gates=workspace.gates?.gates||[],gatePass=workspace.gates?.pass===true;
  const closed=closeout?.status==="closed"||project.status==="completed";
  const approved=closeout?.status==="approved";
  const customer=project.customer?.name||project.customer?.email||"Customer";
  const vehicle=[project.vehicle?.year,project.vehicle?.make,project.vehicle?.model].filter(Boolean).join(" ");

  async function refresh(){
    const r=await fetch(`/api/v1/lifecycle/${encodeURIComponent(project.projectNumber)}`,{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to refresh lifecycle workspace");setWorkspace(b.workspace);setSummary(b.workspace.closeout?.customerSummary||b.workspace.finalRevision?.customerSummary||b.workspace.finalRevision?.customer_summary||summary);setAftercare(b.workspace.closeout?.aftercareNotes||aftercare);setFollowupDays(b.workspace.closeout?.followupDays??followupDays);
  }

  function applyDryRun(action,data){
    if(action==="save")setWorkspace(w=>({...w,closeout:{...(w.closeout||{}),...(data.closeout||{}),status:"draft",customerSummary:summary,aftercareNotes:aftercare,followupDays}}));
    if(action==="qa")setWorkspace(w=>({...w,gates:data.gates||w.gates,closeout:{...(w.closeout||{}),...(data.closeout||{}),status:data.gates?.pass?"qa_ready":"draft",customerSummary:summary,aftercareNotes:aftercare,followupDays}}));
    if(action==="approve")setWorkspace(w=>({...w,closeout:{...(w.closeout||{}),...(data.closeout||{}),status:"approved",customerSummary:summary,aftercareNotes:aftercare,followupDays}}));
    if(action==="close")setWorkspace(w=>({...w,project:{...w.project,status:"completed",stage:"complete",waitingOn:"none"},cycle:{...w.cycle,status:"completed",completedAt:new Date().toISOString()},closeout:{...(w.closeout||{}),...(data.closeout||{}),status:"closed",closedAt:new Date().toISOString()},followup:data.followup||{id:"demo_followup",status:"scheduled",dueAt:new Date(Date.now()+Number(followupDays||0)*86400000).toISOString()}}));
    if(action==="reopen")setWorkspace(w=>({...w,project:{...w.project,status:"retune_intake",stage:"compatibility_review",waitingOn:"tuner",closedAt:null,fuelTarget:reopen.fuelTarget||w.project.fuelTarget},cycle:{id:"demo_cycle_2",cycleNumber:data.cycleNumber||2,status:"active",reason:reopen.reason,changeSummary:reopen.changeSummary,fuelTarget:reopen.fuelTarget||w.project.fuelTarget,reopenedFromCycleId:w.cycle?.id},cycles:[{id:"demo_cycle_2",cycleNumber:2,status:"active",reason:reopen.reason,changeSummary:reopen.changeSummary,fuelTarget:reopen.fuelTarget||w.project.fuelTarget},...(w.cycles||[])]}));
  }

  async function action(name,extra={}){
    setBusy(name);setNotice("");
    try{const r=await fetch(`/api/v1/lifecycle/${encodeURIComponent(project.projectNumber)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:name,customerSummary:summary,aftercareNotes:aftercare,followupDays,stageEmail,...extra})});const b=await r.json();if(!r.ok)throw new Error(b.error||`${name} failed`);const d=b.data||{};const labels={save:"Closeout draft saved.",qa:d.gates?.pass?"Closeout QA passed.":"QA completed — blockers remain.",approve:"Closeout approved. Archive is now unlocked.",close:d.emailError?`Tune archived. Completion Gmail draft was not staged: ${d.emailError}`:"Tune archived. Completion Gmail draft staged for approval.",stage_followup:"Follow-up Gmail draft staged for tuner approval.",reopen:`Tune Cycle ${d.cycleNumber||2} started without altering the archived cycle.`};setNotice(d.dryRun?`Preview: ${labels[name]}`:labels[name]);if(d.dryRun)applyDryRun(name,d);else await refresh()}catch(e){setNotice(e.message)}finally{setBusy("")}
  }

  async function reopenCycle(){
    await action("reopen",{reason:reopen.reason,changeSummary:reopen.changeSummary,hardwareChanges:{notes:reopen.hardwareChanges},fuelTarget:reopen.fuelTarget});
  }

  const packageRows=useMemo(()=>{const manifest=workspace.packageManifest||closeout?.packageManifest||{};const rows=[];if(manifest.finalTune)rows.push(["Final calibration",manifest.finalTune.name,manifest.finalTune.customerVisible]);for(const x of manifest.parameterPacks||[])rows.push(["Logging / parameter pack",x.name,true]);for(const x of manifest.stockFiles||[])rows.push(["Stock-file archive",x.name,Boolean(x.customerVisible)]);rows.push(["Completion summary",summary?"Included":"Missing",Boolean(summary)]);rows.push(["Aftercare guidance",aftercare?"Included":"Missing",Boolean(aftercare)]);return rows},[workspace.packageManifest,closeout?.packageManifest,summary,aftercare]);

  return <section className={styles.shell}>
    <section className={`${styles.hero} ${closed?styles.heroClosed:""}`}><div><span>CYCLE {cycle.cycleNumber||1} · {closed?"ARCHIVED":"FINAL CLOSEOUT"}</span><h1>{customer} · {vehicle}</h1><p>{closed?"This calibration cycle is permanently archived to the vehicle history. Future changes start a new cycle instead of rewriting this one.":"Finish the customer package, verify the exact final artifact, and archive this tune cycle."}</p><div className={styles.badges}><b>{project.platform||"—"}</b><b>{project.fuelTarget||"—"}</b><b>Rev {finalRevision?.revisionNumber||finalRevision?.revision_number||project.currentRevisionNumber||"—"}</b><b>{nice(closeout?.status||"draft")}</b></div></div><aside><Archive size={25}/><b>{closed?"History preserved":"Ready for closeout"}</b><small>{workspace.history?.revisionCount||0} revisions · {workspace.history?.logCount||0} logs · {workspace.history?.fileCount||0} files</small></aside></section>

    <div className={styles.layout}><main className={styles.main}>
      <article className={styles.panel}><header><div><span>FINAL ARTIFACT</span><h2>Rev {finalRevision?.revisionNumber||finalRevision?.revision_number||"—"} package source</h2></div><FileKey2 size={18}/></header>{finalFile?<div className={styles.file}><FileKey2 size={20}/><div><b>{fileName(finalFile)}</b><span>{finalFile.visibility||"internal"} · {finalFile.immutable===false?"mutable":"immutable"}</span><small>{finalFile.sha256?`SHA-256 ${String(finalFile.sha256).slice(0,24)}…`:"Hash pending"}</small></div><em>{finalFile.visibility==="customer"?"DELIVERED":"PRIVATE"}</em></div>:<div className={styles.empty}>No delivered final tune file is attached yet.</div>}</article>

      <article className={styles.panel}><header><div><span>CUSTOMER CLOSEOUT</span><h2>Summary & aftercare</h2></div><ShieldCheck size={18}/></header><label className={styles.field}><span>COMPLETION SUMMARY</span><textarea rows={5} value={summary} disabled={closed||approved} onChange={e=>setSummary(e.target.value)} /></label><label className={styles.field}><span>HARDWARE / FUEL CHANGE GUIDANCE</span><textarea rows={4} value={aftercare} disabled={closed||approved} onChange={e=>setAftercare(e.target.value)} /></label><div className={styles.followupSelect}><label><span>FOLLOW-UP</span><select disabled={closed||approved} value={followupDays} onChange={e=>setFollowupDays(Number(e.target.value))}><option value={0}>No scheduled follow-up</option><option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></label><label className={styles.email}><input type="checkbox" checked={stageEmail} disabled={closed} onChange={e=>setStageEmail(e.target.checked)}/><span><Mail size={14}/>Stage completion Gmail draft</span></label></div>{!closed&&!approved&&<button className={styles.secondary} disabled={Boolean(busy)} onClick={()=>action("save")}><Save size={14}/>{busy==="save"?"Saving…":"Save closeout draft"}</button>}</article>

      <article className={styles.panel}><header><div><span>CLOSEOUT QA</span><h2>{workspace.gates?.passed||0}/{workspace.gates?.total||0} gates passing</h2></div>{gatePass?<CheckCircle2 size={19}/>:<ShieldCheck size={19}/>}</header><div className={styles.gates}>{gates.map(g=><div className={g.pass?styles.pass:styles.block} key={g.key}><i>{g.pass?<Check size={11}/>:"!"}</i><div><b>{g.label}</b><span>{g.detail}</span></div><em>{g.pass?"PASS":"BLOCK"}</em></div>)}</div>{!closed&&<div className={styles.actions}><button disabled={Boolean(busy)||approved} onClick={()=>action("qa")}><RefreshCw size={14}/>{busy==="qa"?"Running…":"Run closeout QA"}</button><button className={styles.approve} disabled={Boolean(busy)||!gatePass||closeout?.status!=="qa_ready"} onClick={()=>action("approve")}><ShieldCheck size={14}/>{busy==="approve"?"Approving…":"Approve closeout"}</button></div>}</article>

      <article className={styles.panel}><header><div><span>PERMANENT HISTORY</span><h2>Tune cycles</h2></div><History size={18}/></header><div className={styles.cycles}>{(workspace.cycles||[]).map(c=><div key={c.id} className={c.id===cycle.id?styles.currentCycle:""}><i>{c.cycleNumber}</i><div><b>Cycle {c.cycleNumber} · {c.cycleNumber===1?"Original tune":nice(c.reason)}</b><span>{c.changeSummary||`${c.fuelTarget||project.fuelTarget||"—"} · ${nice(c.status)}`}</span></div><em>{nice(c.status)}</em></div>)}</div></article>
    </main>

    <aside className={styles.side}>
      <article className={`${styles.panel} ${styles.release}`}><header><div><span>ARCHIVE CONTROL</span><h2>Complete Cycle {cycle.cycleNumber||1}</h2></div><PackageCheck size={18}/></header><p>Archive is a separate irreversible handoff. The final file, revision, cycle and project state advance together.</p><label className={styles.email}><input type="checkbox" checked={stageEmail} disabled={closed} onChange={e=>setStageEmail(e.target.checked)}/><span><Mail size={14}/>Stage customer completion email</span></label><button className={styles.closeButton} disabled={Boolean(busy)||!approved||closed} onClick={()=>action("close")}><Archive size={15}/>{busy==="close"?"Archiving…":closed?"Cycle archived":"Archive completed tune"}</button></article>

      <article className={styles.panel}><header><div><span>FINAL PACKAGE</span><h2>Archive manifest</h2></div><PackageCheck size={18}/></header><div className={styles.package}>{packageRows.map(([type,name,visible],i)=><div key={`${type}-${i}`}><i>{visible?<Check size={10}/>:"•"}</i><span><b>{type}</b><small>{name}</small></span><em>{visible?"Customer":"Archive"}</em></div>)}</div><Link className={styles.portalLink} href={`/portal/${project.projectNumber}/history`}>Customer tune history <ArrowRight size={13}/></Link></article>

      <article className={styles.panel}><header><div><span>FOLLOW-UP</span><h2>Aftercare queue</h2></div><Clock3 size={18}/></header>{followup?<div className={styles.followup}><b>{nice(followup.status)}</b><span>{followup.dueAt?`Due ${new Date(followup.dueAt).toLocaleString()}`:"Due date pending"}</span>{workspace.outbound&&<small>Gmail: {nice(workspace.outbound.status)}</small>}{followup.status==="scheduled"&&<button disabled={Boolean(busy)} onClick={()=>action("stage_followup",{followupId:followup.id,force:true})}><Mail size={13}/>{busy==="stage_followup"?"Staging…":"Stage follow-up draft now"}</button>}</div>:<p className={styles.muted}>{closed&&Number(followupDays)>0?"Follow-up is being scheduled.":Number(followupDays)>0?`A ${followupDays}-day follow-up will be scheduled at archive.`:"No automatic follow-up selected."}</p>}<small className={styles.safe}><ShieldCheck size={12}/>Automation stages a draft only. Gmail provider send still requires Doug/tuner approval.</small></article>

      {closed&&<article className={`${styles.panel} ${styles.reopen}`}><header><div><span>FUTURE RETUNE</span><h2>Start a new tune cycle</h2></div><RotateCcw size={18}/></header><p>Use this when hardware, fuel strategy, or the tuning scope changes. Cycle {cycle.cycleNumber||1} stays frozen.</p><label><span>REASON</span><select value={reopen.reason} onChange={e=>setReopen(x=>({...x,reason:e.target.value}))}><option value="hardware_change">Hardware change</option><option value="fuel_change">Fuel change</option><option value="retune">Retune / new goal</option><option value="support">Support / diagnostic retune</option></select></label><label><span>WHAT CHANGED</span><textarea rows={3} value={reopen.changeSummary} onChange={e=>setReopen(x=>({...x,changeSummary:e.target.value}))} placeholder="Hybrid turbo, new HPFP, moving from E40 to E50…"/></label><label><span>HARDWARE NOTES</span><textarea rows={3} value={reopen.hardwareChanges} onChange={e=>setReopen(x=>({...x,hardwareChanges:e.target.value}))} placeholder="Anything Doug should know before compatibility review…"/></label><label><span>NEW FUEL TARGET</span><input value={reopen.fuelTarget} onChange={e=>setReopen(x=>({...x,fuelTarget:e.target.value}))}/></label><button disabled={Boolean(busy)||!reopen.changeSummary.trim()} onClick={reopenCycle}><RotateCcw size={14}/>{busy==="reopen"?"Starting…":"Start next tune cycle"}</button></article>}

      <article className={styles.panel}><header><div><span>RUNTIME</span><h2>Lifecycle safety</h2></div><Wrench size={18}/></header><div className={styles.runtime}><span><b>Mutations</b>{readiness.mutationsEnabled?"Enabled":"Dry-run"}</span><span><b>Atomic archive</b>{readiness.atomicCloseout?"Ready":"Off"}</span><span><b>Hash recheck</b>{readiness.finalArtifactHashCheck?"Required":"Off"}</span><span><b>Retune cycles</b>{readiness.retuneWithoutHistoryLoss?"Ready":"Off"}</span></div></article>
    </aside></div>
    {notice&&<div className={styles.notice}>{notice}</div>}
  </section>;
}

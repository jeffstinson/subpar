import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Car, ChevronRight, FileKey2, Gauge, Mail, ShieldCheck, Wrench } from "lucide-react";
import { getProjectById } from "../../server/repository";
import { resolveVehicleIntelligenceServer } from "../../server/intelligence-store";
import styles from "./workspace.module.css";

function nice(value){return String(value||"—").replaceAll("_"," ")}
function vehicleName(vehicle){return vehicle?[vehicle.year,vehicle.make,vehicle.model].filter(Boolean).join(" "):"Vehicle"}

export default async function TuneWorkspace({params}){
  const {id}=await params;
  const project=await getProjectById(id);
  if(!project)notFound();
  const customer=project.customer||{};
  const vehicle=project.vehicle||{};
  const requirements=project.requirements||[];
  const revisions=project.revisions||[];
  const logs=project.logs||[];
  const files=project.files||[];
  const messages=project.messages||[];
  const events=project.events||[];
  const completed=requirements.filter(item=>item.status==="complete"||item.status==="done").length;
  let intelligence;
  try{intelligence=await resolveVehicleIntelligenceServer({make:vehicle.make,model:vehicle.model,chassis:vehicle.chassis,engine:vehicle.engine,platform:project.platform,fuel:project.fuelTarget})}
  catch{intelligence={state:"review_required",engine:vehicle.engine,platform:project.platform,loggingRecipe:null,parameterPack:null,warnings:["Vehicle intelligence lookup failed; keep manual review enabled."],source:"error"}}
  const storedProfile=project.metadata?.intelligenceProfileKey||project.metadata?.intelligence_profile_key||intelligence.profileKey||null;

  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>LIVE TUNE WORKSPACE</span></div></div><div className={styles.links}><Link href="/intelligence">Vehicle Intelligence <ChevronRight size={13}/></Link><Link href="/messages">Messages <ChevronRight size={13}/></Link><Link href={`/files/${project.projectNumber}`}>Files <ChevronRight size={13}/></Link></div></header>

    <section className={styles.hero}><div><span>{project.projectNumber} · {String(project.platform||"TUNE").toUpperCase()}</span><h1>{customer.name||customer.email||"Customer"} — {vehicleName(vehicle)}</h1><p>{[vehicle.chassis,vehicle.engine,project.fuelTarget,`Rev ${project.currentRevision||0}`].filter(Boolean).join(" · ")}</p><div className={styles.badges}><b>{nice(project.status)}</b><b>{nice(project.waitingOn)} ownership</b><b>{nice(project.priority)} priority</b><b>{nice(intelligence.state)}</b></div></div><aside><span>NEXT ACTION</span><h2>{project.nextAction||"Review project status"}</h2><p>All live actions stay attached to this project’s immutable history.</p></aside></section>

    <section className={styles.facts}>{[["Customer",customer.name||customer.email],["Email",customer.email],["Vehicle",vehicleName(vehicle)],["Chassis",vehicle.chassis],["Engine",vehicle.engine],["Platform",project.platform],["Fuel",project.fuelTarget],["Revision",`Rev ${project.currentRevision||0}`]].map(([label,value])=><article key={label}><span>{label}</span><b>{value||"—"}</b></article>)}</section>

    <div className={styles.layout}>
      <div className={styles.stack}>
        <section className={styles.panel}><header><div><span>REQUIREMENTS</span><h2>Project prerequisites</h2></div><b>{completed}/{requirements.length||0} complete</b></header><div className={styles.list}>{requirements.length?requirements.map(item=><div key={item.id}><i className={item.status==="complete"||item.status==="done"?styles.done:styles.pending}>{item.status==="complete"||item.status==="done"?"✓":"•"}</i><div><b>{item.label||item.title||item.requirementType}</b><small>{nice(item.status)}</small></div></div>):<div className={styles.empty}>No project requirements have been created yet.</div>}</div></section>

        <section className={styles.panel}><header><div><span>REVISION HISTORY</span><h2>Calibration versions</h2></div><Wrench size={18}/></header><div className={styles.revisions}>{revisions.length?revisions.slice().reverse().map(rev=><article key={rev.id}><div><b>Rev {rev.number||rev.revisionNumber}</b><span>{nice(rev.status)} · {rev.fuelTarget||project.fuelTarget||"—"}</span></div><p>{rev.customerSummary||"Revision history is preserved with the project."}</p></article>):<div className={styles.empty}>No revisions yet. This project is still in setup/intake.</div>}</div></section>

        <section className={styles.panel}><header><div><span>RECENT HISTORY</span><h2>Project timeline</h2></div><ShieldCheck size={18}/></header><div className={styles.timeline}>{events.length?events.slice(0,12).map(event=><div key={event.id}><i/><div><b>{event.title||nice(event.type||event.eventType)}</b><p>{event.payload?.summary||event.body||"Recorded in project history."}</p></div><time>{event.createdLabel||event.createdAt?String(event.createdLabel||new Date(event.createdAt).toLocaleString()):""}</time></div>):<div className={styles.empty}>Project history begins when intake is activated.</div>}</div></section>
      </div>

      <aside className={styles.stack}>
        <section className={styles.panel}><header><div><span>VEHICLE INTELLIGENCE</span><h2>{intelligence.engine||vehicle.engine||"Engine"} · {intelligence.platform||project.platform||"Platform"}</h2></div><Bot size={18}/></header><div className={styles.compact}><div><b>{nice(intelligence.state)}</b><span>{storedProfile?`Stored profile ${storedProfile}`:`Resolved from ${intelligence.source||"vehicle"} context`}</span></div><div><b>{intelligence.loggingRecipe?.title||"No logging recipe mapped"}</b><span>{intelligence.loggingRecipe?`${intelligence.loggingRecipe.channelGroups.length} channel groups`:"Manual logging setup required"}</span></div><div><b>{intelligence.parameterPack?.title||"No parameter pack mapped"}</b><span>{intelligence.parameterPack?.productionReady?"Doug-approved production pack":"Placeholder until Doug approves his production pack"}</span></div>{(intelligence.warnings||[]).slice(0,3).map(warning=><div key={warning}><b>Guardrail</b><span>{warning}</span></div>)}</div><div className={styles.actions}><Link href="/intelligence"><Bot size={14}/>Open Intelligence Center<ChevronRight size={12}/></Link></div></section>

        <section className={styles.panel}><header><div><span>QUICK ACCESS</span><h2>Keep work in context</h2></div><Gauge size={18}/></header><div className={styles.actions}><Link href="/messages"><Mail size={14}/>Customer communications<ChevronRight size={12}/></Link><Link href={`/files/${project.projectNumber}`}><FileKey2 size={14}/>Project files<ChevronRight size={12}/></Link>{project.projectNumber==="SP-1842"&&<Link href={`/log-review/${project.projectNumber}`}><Gauge size={14}/>Deep log review<ChevronRight size={12}/></Link>}</div></section>

        <section className={styles.panel}><header><div><span>LOGS</span><h2>Datalog activity</h2></div><Gauge size={18}/></header><div className={styles.compact}>{logs.length?logs.slice(0,6).map(log=><div key={log.id}><b>{log.fileName||"Datalog"}</b><span>{nice(log.status)} · {log.platform||project.platform}</span></div>):<div className={styles.empty}>No datalogs attached yet.</div>}</div></section>

        <section className={styles.panel}><header><div><span>FILES</span><h2>Project-owned assets</h2></div><FileKey2 size={18}/></header><div className={styles.compact}>{files.length?files.slice(0,7).map(file=><div key={file.id}><b>{file.name||file.originalName}</b><span>{nice(file.kind)} · {file.visibility||"internal"}</span></div>):<div className={styles.empty}>No files attached yet.</div>}</div></section>

        <section className={styles.panel}><header><div><span>MESSAGES</span><h2>Communication activity</h2></div><Mail size={18}/></header><div className={styles.compact}>{messages.length?messages.slice(-5).reverse().map(message=><div key={message.id}><b>{message.direction==="inbound"?(customer.name||"Customer"):"Subpar Tuning"}</b><span>{message.subject||message.body?.slice(0,50)||"Project message"}</span></div>):<div className={styles.empty}>No linked messages yet.</div>}</div></section>

        <section className={styles.vehicle}><Car size={20}/><div><span>VEHICLE GARAGE RECORD</span><b>{vehicleName(vehicle)}</b><p>{[vehicle.chassis,vehicle.engine,vehicle.transmission].filter(Boolean).join(" · ")}</p></div></section>
      </aside>
    </div>
  </main>;
}

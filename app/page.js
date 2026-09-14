"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, Archive, Bell, Bot, Calculator, Car, CheckCircle2, ChevronRight,
  CircleDollarSign, ClipboardCheck, Database, ExternalLink, FileText, Fuel,
  Gauge, Globe2, Inbox, LayoutDashboard, Link2, ListChecks, Mail, Menu,
  MessageSquare, Plus, RefreshCw, Search, Send, Settings, ShieldCheck,
  ShoppingBag, SlidersHorizontal, Sparkles, UploadCloud, UserRound, Users,
  Wrench, X
} from "lucide-react";
import {
  jobs, closedTunes, activities, messageThreads, integrations, automationRules,
  dashboardStats, deepPath, findJob
} from "./lib/demo-data";

const navGroups = [
  {label:"OPERATIONS",items:[
    ["dashboard","Dashboard",LayoutDashboard],["queue","Tune Queue",ListChecks],["orders","New Orders",ShoppingBag],
    ["logs","Datalog Reviews",Activity],["revisions","Tune Revisions",RefreshCw],["messages","Messages",MessageSquare]
  ]},
  {label:"CRM",items:[
    ["customers","Customers",Users],["garage","Vehicle Garage",Car],["portal","Customer Portal",ExternalLink],["closed","Closed Tunes",Archive]
  ]},
  {label:"TOOLS",items:[
    ["calculator","E85 Calculator",Calculator],["integrations","Integrations",Settings],["audit","System Audit",ShieldCheck]
  ]}
];

const counts = {queue:18,orders:3,logs:7,revisions:4,messages:6};

function Badge({children,tone="green"}){return <span className={`os-badge ${tone}`}>{children}</span>}
function Stat({item}){return <article className="os-stat"><span>{item.label}</span><strong className={`os-${item.tone}`}>{item.value}</strong><small>{item.sub}</small></article>}
function PanelHead({title,sub,children}){return <div className="os-panelHead"><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div>{children}</div>}

export default function Home(){
  const [active,setActive]=useState("dashboard");
  const [query,setQuery]=useState("");
  const [toast,setToast]=useState("");
  const [selectedJob,setSelectedJob]=useState(null);
  const [showNewTune,setShowNewTune]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [refreshing,setRefreshing]=useState(false);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const order=params.get("project");
    if(order){const job=findJob(order);if(job)setSelectedJob(job)}
  },[]);

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function refresh(){setRefreshing(true);window.setTimeout(()=>{setRefreshing(false);flash("Demo activity refreshed")},700)}
  function openJob(job,type="project"){
    if(!job)return;
    if(job.order==="SP-1842"||job.order==="SP-1846") window.location.href=deepPath(job.order,type);
    else setSelectedJob(job);
  }

  const searchResults=useMemo(()=>{
    if(query.trim().length<2)return [];
    const q=query.toLowerCase();
    return jobs.filter(j=>Object.values(j).join(" ").toLowerCase().includes(q)).slice(0,6);
  },[query]);

  const content={
    dashboard:<Dashboard openJob={openJob} refresh={refresh} refreshing={refreshing} setActive={setActive} setShowNewTune={setShowNewTune}/>,
    queue:<QueueView openJob={openJob}/>,
    orders:<OrdersView openJob={openJob}/>,
    logs:<LogsView openJob={openJob}/>,
    revisions:<RevisionsView openJob={openJob}/>,
    messages:<MessagesView flash={flash}/>,
    customers:<CustomersView openJob={openJob}/>,
    garage:<GarageView openJob={openJob}/>,
    portal:<PortalView openJob={openJob}/>,
    closed:<ClosedView flash={flash}/>,
    calculator:<CalculatorView/>,
    integrations:<IntegrationsView flash={flash}/>,
    audit:<AuditView/>
  }[active]||null;

  return <div className="os-shell">
    {toast&&<div className="os-toast">{toast}</div>}
    <Sidebar active={active} setActive={setActive}/>
    <main className="os-main">
      <header className="os-topbar">
        <div className="os-crumb"><b>SUBPAR OS</b><span>/</span><span>{labelFor(active).toUpperCase()}</span></div>
        <div className="os-topActions">
          <div className="os-search">
            <Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customers, cars, orders, logs..."/>
            {searchResults.length>0&&<div className="os-searchResults">{searchResults.map(j=><button className="os-searchResult" key={j.order} onClick={()=>{setQuery("");openJob(j)}}><span><b>{j.name}</b><span>{j.vehicle} • {j.order}</span></span><em>{j.status}</em></button>)}</div>}
          </div>
          <button className="os-iconBtn" onClick={refresh} title="Refresh demo activity"><RefreshCw size={14} className={refreshing?"spin":""}/></button>
          <button className="os-iconBtn" onClick={()=>setNotifications(v=>!v)} title="Notifications"><Bell size={14}/><i className="os-alertDot"/></button>
        </div>
      </header>
      {notifications&&<NotificationTray onClose={()=>setNotifications(false)} openJob={openJob}/>} 
      {content}
      <DemoRail/>
    </main>
    <div className="os-mobileNav">
      {[["dashboard","Home",LayoutDashboard],["queue","Queue",ListChecks],["logs","Logs",Activity],["messages","Messages",MessageSquare],["customers","Clients",Users]].map(([id,label,Icon])=><button className={active===id?"on":""} key={id} onClick={()=>setActive(id)}><Icon size={16}/><span>{label}</span></button>)}
    </div>
    {selectedJob&&<ProjectDrawer job={selectedJob} onClose={()=>setSelectedJob(null)} flash={flash}/>} 
    {showNewTune&&<NewTuneModal onClose={()=>setShowNewTune(false)} flash={flash}/>} 
  </div>
}

function labelFor(id){for(const g of navGroups){const f=g.items.find(x=>x[0]===id);if(f)return f[1]}return "Dashboard"}

function Sidebar({active,setActive}){
  return <aside className="os-sidebar">
    <div className="os-brand"><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>TUNING DASHBOARD</span></div></div>
    {navGroups.map(group=><div className="os-navGroup" key={group.label}><span className="os-navLabel">{group.label}</span><nav className="os-nav">{group.items.map(([id,label,Icon])=><button key={id} className={active===id?"os-active":""} onClick={()=>setActive(id)}><Icon size={14}/><span>{label}</span>{counts[id]&&<em>{counts[id]}</em>}</button>)}</nav></div>)}
    <div className="os-navGroup"><span className="os-navLabel">AUTOMATION</span><nav className="os-nav"><Link href="/automations"><Bot size={14}/><span>Automation Studio</span><em>4</em></Link><Link href="/mobile"><Menu size={14}/><span>Mobile Command</span></Link></nav></div>
    <div className="os-sideBottom"><div className="os-user"><div className="os-avatar">DT</div><div><b>Doug Talmadge</b><span>Subpar Tuning</span></div></div></div>
  </aside>
}

function PageHead({eyebrow,title,sub,children}){return <div className="os-head"><div><span className="os-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{sub}</p></div><div className="os-actions">{children}</div></div>}

function Dashboard({openJob,refresh,refreshing,setActive,setShowNewTune}){
  const needsDoug=jobs.filter(j=>j.waitingOn==="Doug").slice(0,6);
  return <div className="os-page">
    <PageHead eyebrow="SUBPAR TUNING • OPERATIONS" title="What needs Doug right now?" sub="Run active tunes, review logs, publish revisions, answer customers and keep every vehicle's history together.">
      <button className="os-btn" onClick={refresh}><RefreshCw size={13}/>{refreshing?"Refreshing...":"Sync activity"}</button>
      <button className="os-btn os-btn-primary" onClick={()=>setShowNewTune(true)}><Plus size={13}/>New tune</button>
    </PageHead>
    <div className="os-stats">{dashboardStats.map(item=><Stat item={item} key={item.label}/>)}</div>
    <div className="os-grid">
      <div className="os-stack">
        <section className="os-panel"><PanelHead title="Needs Doug" sub="Highest-value actions first."><button className="os-btn" onClick={()=>setActive("queue")}>Open full queue <ChevronRight size={12}/></button></PanelHead><div className="os-attentionGrid">{needsDoug.map(j=><article className="os-attention" key={j.order} onClick={()=>openJob(j,j.status==="Log Uploaded"?"log":j.status.includes("Revision")?"revision":"project")}><div className="os-attentionTop"><Badge tone={j.priority==="High"?"red":j.priority==="Med"?"amber":"gray"}>{j.priority}</Badge><span className="os-sub">{j.last}</span></div><h4>{j.name} • {j.vehicle}</h4><p>{j.next}</p><footer><span>{j.platform} • {j.fuel} • {j.rev}</span><ChevronRight size={13}/></footer></article>)}</div></section>
        <QueueTable rows={jobs} openJob={openJob} compact/>
      </div>
      <aside className="os-stack">
        <section className="os-panel"><PanelHead title="Today's Activity" sub="Synthetic events modeled after Doug's stack."/><div className="os-activity">{activities.map(a=><ActivityItem key={a.text} item={a} openJob={openJob}/>)}</div></section>
        <section className="os-panel"><PanelHead title="Pipeline" sub="18 active tune projects."/><div className="os-pipeline">{[["New / Intake",3,17],["Calibration",6,33],["Logs waiting",7,39],["Ready to deliver",2,11]].map(([label,count,pct])=><div className="os-pipelineRow" key={label}><span>{label}</span><div className="os-track"><i style={{width:`${pct}%`}}/></div><b>{count}</b></div>)}</div></section>
        <section className="os-panel"><PanelHead title="System readiness" sub="Architecture preview before live data is enabled."/><div className="os-systemList">{integrations.slice(0,4).map(i=><div className="os-system" key={i.name}><i className={i.status==="Ready"?"":"planned"}/><div><b>{i.name}</b><span>{i.detail}</span></div><em>{i.status}</em></div>)}</div></section>
      </aside>
    </div>
  </div>
}

function ActivityItem({item,openJob}){const job=findJob(item.order);const Icon={log:UploadCloud,email:Mail,order:ShoppingBag,revision:RefreshCw,message:MessageSquare,intake:ClipboardCheck}[item.type]||Activity;return <button className="os-activityItem" style={{border:0,width:"100%",color:"inherit",textAlign:"left",cursor:"pointer"}} onClick={()=>job&&openJob(job,item.type==="log"?"log":"project")}><div className="os-activityIcon"><Icon size={13}/></div><div><b>{item.text}</b><span>{item.order}</span></div><span>{item.time}</span></button>}

function QueueTable({rows,openJob,compact=false}){
  const [filter,setFilter]=useState("All");
  const filtered=rows.filter(j=>filter==="All"||j.priority===filter||j.platform===filter||j.waitingOn===filter);
  const shown=compact?filtered.slice(0,6):filtered;
  return <section className="os-panel"><PanelHead title={compact?"Active tune queue":"Tune Queue"} sub="Every job is tied to the next action, customer and car."><div className="os-filterBar">{["All","High","MHD","BM3","EcuTek","Customer"].map(f=><button key={f} className={filter===f?"on":""} onClick={()=>setFilter(f)}>{f}</button>)}</div></PanelHead><div className="os-tableWrap"><table className="os-table"><thead><tr><th>Customer</th><th>Vehicle</th><th>Platform</th><th>Revision</th><th>Status / next</th><th>Owner</th><th>Updated</th><th></th></tr></thead><tbody>{shown.map(j=><tr key={j.order} onClick={()=>openJob(j,j.status==="Log Uploaded"?"log":j.status.includes("Revision")?"revision":"project")}><td><b>{j.name}</b><small>{j.order}</small></td><td><b>{j.vehicle}</b><small>{j.engine} • {j.fuel}</small></td><td><Badge tone={j.platform==="MHD"?"green":j.platform==="BM3"?"blue":"purple"}>{j.platform}</Badge></td><td>{j.rev}</td><td><Badge tone={j.tone}>{j.status}</Badge><small>{j.next}</small></td><td><Badge tone={j.waitingOn==="Doug"?"red":"amber"}>{j.waitingOn}</Badge></td><td>{j.last}</td><td><div className="os-cellActions"><button className="os-mini" onClick={e=>{e.stopPropagation();openJob(j)}}><ChevronRight size={13}/></button></div></td></tr>)}</tbody></table></div></section>
}

function QueueView({openJob}){return <div className="os-page"><PageHead eyebrow="OPERATIONS" title="Tune Queue" sub="One queue for every active tune, regardless of MHD, bootmod3 or EcuTek."/><div className="os-stats">{[{label:"Needs Doug",value:"9",sub:"Logs / revisions / delivery",tone:"green"},{label:"Waiting on Customer",value:"5",sub:"Info / pull / confirmation",tone:"amber"},{label:"Ready to Deliver",value:"2",sub:"Customer-ready",tone:"purple"},{label:"High Priority",value:"4",sub:"Review first",tone:"red"}].map(x=><Stat key={x.label} item={x}/>)}</div><QueueTable rows={jobs} openJob={openJob}/></div>}

function OrdersView({openJob}){
  const cols=[{title:"Needs Intake",statuses:["New Order"]},{title:"Intake Received",statuses:["Vehicle Info Received"]},{title:"Compatibility Review",statuses:["Compatibility Review"]}];
  return <div className="os-page"><PageHead eyebrow="ORDER → PROJECT" title="New Orders" sub="Paid orders become organized tune projects only after the right customer, vehicle and platform prerequisites are satisfied."/><div className="os-kanban">{cols.map(col=><section className="os-col" key={col.title}><div className="os-colHead"><b>{col.title}</b><Badge tone="amber">{jobs.filter(j=>col.statuses.includes(j.status)).length}</Badge></div>{jobs.filter(j=>col.statuses.includes(j.status)).map(j=><article className="os-card" key={j.order}><div className="os-cardTop"><div><span className="os-eyebrow">{j.order}</span><h3>{j.name}</h3></div><Badge tone={j.platform==="BM3"?"blue":"green"}>{j.platform}</Badge></div><p>{j.vehicle} • {j.engine} • {j.fuel}</p><div className="os-cardMeta"><div><span>Next</span><b>{j.next}</b></div><div><span>Updated</span><b>{j.last}</b></div></div><button className="os-btn" onClick={()=>openJob(j)}>Open intake <ChevronRight size={12}/></button></article>)}</section>)}</div></div>
}

function LogsView({openJob}){const logJobs=jobs.filter(j=>j.status==="Log Uploaded");return <div className="os-page"><PageHead eyebrow="LOG INTELLIGENCE" title="Datalog Reviews" sub="Logs stay attached to the exact revision, vehicle and customer instead of living in disconnected links and CSVs."/><div className="os-cards">{logJobs.map(j=><article className="os-card" key={j.order}><div className="os-cardTop"><div><span className="os-eyebrow">{j.order} • {j.rev}</span><h3>{j.name}</h3><p>{j.vehicle} • {j.engine} • {j.fuel}</p></div><Badge tone="green">2 logs</Badge></div><div className="os-cardMeta"><div><span>Platform</span><b>{j.platform}</b></div><div><span>Priority</span><b>{j.priority}</b></div><div><span>Next</span><b>{j.next}</b></div><div><span>Age</span><b>{j.last}</b></div></div><button className="os-btn os-btn-primary" onClick={()=>openJob(j,"log")}>Open log review <ChevronRight size={12}/></button></article>)}</div></div>}

function RevisionsView({openJob}){return <div className="os-page"><PageHead eyebrow="CALIBRATION WORKFLOW" title="Tune Revisions" sub="Every revision keeps its source logs, internal reasoning, customer summary and delivery state."/><div className="os-cards">{jobs.filter(j=>!["New Order","Vehicle Info Received"].includes(j.status)).slice(0,6).map(j=><article className="os-card" key={j.order}><div className="os-cardTop"><div><span className="os-eyebrow">{j.order}</span><h3>{j.name}</h3><p>{j.vehicle}</p></div><Badge tone={j.tone}>{j.rev}</Badge></div><div className="os-cardMeta"><div><span>Status</span><b>{j.status}</b></div><div><span>Fuel</span><b>{j.fuel}</b></div><div><span>Platform</span><b>{j.platform}</b></div><div><span>Next</span><b>{j.next}</b></div></div><button className="os-btn" onClick={()=>openJob(j,"revision")}>Open revision workspace <ChevronRight size={12}/></button></article>)}</div></div>}

function MessagesView({flash}){
  const [selected,setSelected]=useState(messageThreads[0]);
  const [text,setText]=useState("");
  const [sent,setSent]=useState([]);
  function send(){if(!text.trim())return;setSent(s=>[...s,text.trim()]);setText("");flash("Demo reply added to project conversation")}
  return <div className="os-page"><PageHead eyebrow="CUSTOMER COMMUNICATION" title="Messages" sub="Gmail stays familiar while Subpar OS ties each conversation to the correct customer, vehicle and tune project."/><section className="os-panel os-threadShell"><aside className="os-threadList">{messageThreads.map(t=><div className={`os-thread ${selected.order===t.order?"selected":""}`} key={t.order} onClick={()=>{setSelected(t);setSent([])}}><div className="os-threadTop"><b>{t.name}</b><time>{t.time}</time></div><span>{t.subject}</span><p>{t.preview}</p></div>)}</aside><div className="os-threadMain"><div className="os-threadHeader"><h3>{selected.name} • {selected.order}</h3><p>Conversation attached to tune project and vehicle history.</p></div><div className="os-conversation"><div className="os-bubble"><b>{selected.name}</b><p>{selected.preview}</p></div><div className="os-bubble mine"><b>Doug</b><p>Got it — I have this attached to your tune and will update you with the next step.</p></div>{sent.map((s,i)=><div className="os-bubble mine" key={i}><b>Doug • Just now</b><p>{s}</p></div>)}</div><div className="os-compose"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Reply through Doug's Gmail..." onKeyDown={e=>{if(e.key==="Enter")send()}}/><button onClick={send}><Send size={13}/></button></div></div></section></div>
}

function CustomersView({openJob}){return <div className="os-page"><PageHead eyebrow="CRM" title="Customers" sub="A permanent customer record across orders, vehicles, tune platforms, messages and future retunes."/><div className="os-customerGrid">{jobs.map(j=><article className="os-customer" key={j.order} onClick={()=>openJob(j)}><div className="os-customerHeader"><div className="os-avatar">{j.name.split(" ").map(x=>x[0]).join("")}</div><div><h3>{j.name}</h3><p>{j.email}</p></div></div><div className="os-customerFacts"><Badge tone="gray">{j.vehicles} vehicle{j.vehicles>1?"s":""}</Badge><Badge tone={j.platform==="MHD"?"green":j.platform==="BM3"?"blue":"purple"}>{j.platform}</Badge><Badge tone="gray">Since {j.customerSince}</Badge></div></article>)}</div></div>}

function GarageView({openJob}){return <div className="os-page"><PageHead eyebrow="VEHICLE HISTORY" title="Vehicle Garage" sub="Cars are first-class records. Hardware, fuel, platform and past tune history follow the vehicle."/><div className="os-garageGrid">{jobs.map(j=><article className="os-vehicle" key={j.order} onClick={()=>openJob(j)}><div className="os-vehicleTop"><div className="os-chassis">{j.chassis}</div><Badge tone={j.platform==="MHD"?"green":j.platform==="BM3"?"blue":"purple"}>{j.platform}</Badge></div><h3>{j.vehicle}</h3><p>{j.name} • {j.engine} • {j.fuel} • {j.rev}</p><div className="os-cardMeta"><div><span>Project</span><b>{j.order}</b></div><div><span>Status</span><b>{j.status}</b></div></div></article>)}</div></div>}

function PortalView({openJob}){return <div className="os-page"><PageHead eyebrow="CUSTOMER EXPERIENCE" title="Customer Portal" sub="Customers see a clean next-step view while Doug retains the internal notes, rules and raw tuning context."/><div className="os-cards">{jobs.slice(0,6).map(j=><article className="os-card" key={j.order}><div className="os-cardTop"><div><span className="os-eyebrow">{j.order}</span><h3>{j.name}</h3><p>{j.vehicle}</p></div><Badge tone={j.waitingOn==="Customer"?"amber":"green"}>Waiting on {j.waitingOn}</Badge></div><div className="os-cardMeta"><div><span>Current</span><b>{j.rev}</b></div><div><span>Status</span><b>{j.status}</b></div></div><button className="os-btn" onClick={()=>openJob(j,"portal")}>Preview customer view <ExternalLink size={12}/></button></article>)}</div></div>}

function ClosedView({flash}){return <div className="os-page"><PageHead eyebrow="ARCHIVE" title="Closed Tunes" sub="Completed projects leave the active queue but stay attached to the customer and vehicle forever."/><section className="os-panel"><PanelHead title="Recently completed" sub="Synthetic completion history."/><div className="os-archiveTable"><div className="os-archiveRow"><span>Customer</span><span>Vehicle</span><span>Platform</span><span>Final</span><span>Fuel</span><span>Closed</span></div>{closedTunes.map(t=><div className="os-archiveRow" key={t.order}><b>{t.name}<small style={{display:"block",color:"#626c64",marginTop:3}}>{t.order}</small></b><span>{t.vehicle}</span><span>{t.platform}</span><span>{t.finalRev}</span><span>{t.fuel}</span><button className="os-btn" onClick={()=>flash(`Archived project ${t.order} opened in demo`)}>{t.closed}</button></div>)}</div></section></div>}

function CalculatorView(){
  const [tank,setTank]=useState(15.6),[currentFuel,setCurrentFuel]=useState(6),[currentE,setCurrentE]=useState(10),[e85,setE85]=useState(80),[target,setTarget]=useState(40);
  const remaining=Math.max(0,tank-currentFuel);
  const desired=tank*(target/100);
  const existing=currentFuel*(currentE/100);
  const pumpE=.10;
  const x=Math.max(0,Math.min(remaining,(desired-existing-remaining*pumpE)/((e85/100)-pumpE)));
  const pump=Math.max(0,remaining-x);
  const finalE=tank?((existing+x*(e85/100)+pump*pumpE)/tank*100):0;
  return <div className="os-page"><PageHead eyebrow="FUEL TOOL" title="E85 Mix Calculator" sub="Vehicle-aware ethanol mixing that accounts for the fuel and ethanol already in the tank."/><div className="os-calc"><section className="os-panel os-form"><label><span>Tank capacity (gal)</span><input type="number" value={tank} onChange={e=>setTank(+e.target.value)}/></label><label><span>Fuel currently in tank (gal)</span><input type="number" value={currentFuel} onChange={e=>setCurrentFuel(+e.target.value)}/></label><label><span>Current ethanol %</span><input type="number" value={currentE} onChange={e=>setCurrentE(+e.target.value)}/></label><label><span>Actual E85 ethanol %</span><input type="number" value={e85} onChange={e=>setE85(+e.target.value)}/></label><label><span>Target ethanol %</span><input type="number" value={target} onChange={e=>setTarget(+e.target.value)}/></label></section><section className="os-panel os-calcResult"><span>ADD TO REACH TARGET</span><h2>E{target}</h2><p style={{fontSize:10,color:"#7b857d",lineHeight:1.55}}>Assuming pump gas is E10 and the tank is filled to {tank.toFixed(1)} gallons.</p><div className="os-calcMix"><div><span>Add E85</span><b>{x.toFixed(2)} gal</b></div><div><span>Add pump gas</span><b>{pump.toFixed(2)} gal</b></div></div><div className="os-note" style={{marginTop:10}}>Estimated final blend: E{finalE.toFixed(1)} • Space available: {remaining.toFixed(2)} gal</div></section></div></div>
}

function IntegrationsView({flash}){return <div className="os-page"><PageHead eyebrow="CONNECTED SYSTEMS" title="Integrations" sub="Subpar OS organizes Doug's existing stack rather than trying to replace every tuning platform."/><div className="os-cards">{integrations.map(i=><article className="os-card" key={i.name}><div className="os-cardTop"><div><span className="os-eyebrow">INTEGRATION</span><h3>{i.name}</h3></div><Badge tone={i.tone}>{i.status}</Badge></div><p>{i.detail}</p><div className="os-cardMeta"><div><span>Mode</span><b>{i.last}</b></div><div><span>Data</span><b>{i.status==="Ready"?"Synthetic only":"Not connected"}</b></div></div><button className="os-btn" onClick={()=>flash(`${i.name} configuration is intentionally demo-only until live-data approval`)}>Configure <ChevronRight size={12}/></button></article>)}</div><div className="os-note" style={{marginTop:12}}><ShieldCheck size={13} style={{verticalAlign:"middle",marginRight:6}}/>No real customer records, credentials or tune files are being ingested in this demo build.</div></div>}

function AuditView(){const items=[
  ["Unified navigation","Pass","Main dashboard now uses explicit app navigation instead of DOM mutation tricks."],
  ["Detail workflows","Pass","Intake, project, log review, revision, portal, workflow simulator and closeout all have dedicated routes."],
  ["Mobile usability","Pass","Dashboard collapses to bottom navigation; deep workflow screens already include responsive layouts."],
  ["Synthetic-data boundary","Pass","Dashboard and flows are clearly demo data; live ingestion remains disconnected."],
  ["Platform coverage","Pass","Demo data spans MHD, bootmod3 and EcuTek instead of only B58/MHD."],
  ["Customer vs tuner visibility","Pass","Portal separates customer-safe content from internal tuner notes and automation logic."],
  ["Shared data layer","Improved","Dashboard records now come from one demo-data module instead of duplicated constants."],
  ["Persistence","Pending","UI state is still browser/demo state. Supabase becomes the source of truth after live-data approval."],
  ["Authentication","Pending","Internal tuner auth and customer magic-link/login are not connected yet."],
  ["Live integrations","Pending","Wix/Gmail/MHD/BM3/EcuTek/Datazap remain staged until credentials and ingestion are approved."],
  ["File storage","Pending","Revision/log upload controls are demo interactions; storage needs isolated Subpar buckets."],
  ["Background jobs","Pending","Webhook retries, idempotency, sync locks and durable queues come with the production backend phase."]
];return <div className="os-page"><PageHead eyebrow="PRODUCT / TECHNICAL AUDIT" title="System Audit" sub="What is working in the product preview, what was cleaned up, and what still requires the production backend."/><div className="os-auditGrid">{items.map(([title,status,detail])=><article className="os-auditItem" key={title}><div className="os-auditTop"><h3>{title}</h3><Badge tone={status==="Pass"?"green":status==="Improved"?"blue":"amber"}>{status}</Badge></div><p>{detail}</p></article>)}</div><section className="os-panel" style={{marginTop:12}}><PanelHead title="Production gate" sub="The UI is now cohesive enough to validate with Doug before connecting real systems."/><div style={{padding:14,display:"grid",gap:8}}>{["Doug validates workflow and terminology","Correct NDA / data-handling gate is satisfied","Create isolated Subpar Supabase project + auth + storage","Connect Wix order webhook and customer matching","Connect Doug Gmail OAuth and thread sync","Add durable log/file ingestion and audit history"].map((x,i)=><div className="os-system" key={x}><i className={i===0?"":"planned"}/><div><b>{i+1}. {x}</b></div><em>{i===0?"Now":"Next"}</em></div>)}</div></section></div>}

function DemoRail(){return <div className="os-page" style={{paddingTop:0}}><div className="os-demoRail"><span>DEEP WORKFLOWS</span><Link href="/intake/SP-1846"><ShoppingBag size={11}/>New order</Link><Link href="/project/SP-1842"><Gauge size={11}/>Tuner project</Link><Link href="/log-review/SP-1842"><Activity size={11}/>Log review</Link><Link href="/revision/SP-1842"><RefreshCw size={11}/>Revision</Link><Link href="/portal/SP-1842"><UserRound size={11}/>Customer portal</Link><Link href="/workflow/SP-1842"><SlidersHorizontal size={11}/>Handoff simulator</Link><Link href="/closeout/SP-1842"><CheckCircle2 size={11}/>Closeout</Link><Link href="/automations"><Bot size={11}/>Automations</Link></div></div>}

function ProjectDrawer({job,onClose,flash}){return <div className="os-overlay" onClick={onClose}><section className="os-modal" onClick={e=>e.stopPropagation()}><div className="os-modalHead"><div><span className="os-eyebrow">TUNE PROJECT • {job.order}</span><h2>{job.name} • {job.vehicle}</h2></div><button onClick={onClose}><X size={15}/></button></div><div className="os-modalBody"><div className="os-projectHero"><div className="os-projectBox"><h3>{job.status}</h3><p>{job.next}. This generic project drawer gives every queue record a working destination while Alex's project remains the full deep-workflow demo.</p><div className="os-projectFacts">{[["Platform",job.platform],["Engine",job.engine],["Fuel",job.fuel],["Current revision",job.rev],["Waiting on",job.waitingOn],["Updated",job.last]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div></div><aside className="os-projectBox"><span className="os-eyebrow">NEXT ACTION</span><h3 style={{marginTop:7}}>{job.next}</h3><p>{job.waitingOn==="Doug"?"This project belongs in Doug's working queue.":"Customer action is currently blocking progress."}</p><div className="os-projectActions"><button className="os-btn os-btn-primary" onClick={()=>flash(`${job.order}: action completed in demo`)}>Complete next action</button><button className="os-btn" onClick={()=>flash(`${job.order}: customer message staged`)}>Message customer</button><button className="os-btn" onClick={()=>flash(`${job.order}: internal note added`)}>Add tuner note</button></div></aside></div><div className="os-note" style={{marginTop:10}}>Production version: this view will load from the same Customer → Vehicle → Order → Tune Project → Revision → Log model as the Alex workflow.</div></div></section></div>}

function NewTuneModal({onClose,flash}){const [name,setName]=useState(""),[vehicle,setVehicle]=useState(""),[platform,setPlatform]=useState("MHD");function create(){if(!name||!vehicle)return;flash(`Demo tune created for ${name}`);onClose()}return <div className="os-overlay" onClick={onClose}><section className="os-modal" onClick={e=>e.stopPropagation()}><div className="os-modalHead"><div><span className="os-eyebrow">MANUAL PROJECT</span><h2>Create a tune</h2></div><button onClick={onClose}><X size={15}/></button></div><div className="os-modalBody"><div className="os-newTuneGrid os-form" style={{padding:0}}><label><span>Customer name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Customer name"/></label><label><span>Vehicle</span><input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="2021 BMW M340i"/></label><label><span>Platform</span><select value={platform} onChange={e=>setPlatform(e.target.value)}><option>MHD</option><option>BM3</option><option>EcuTek</option></select></label><label><span>Fuel target</span><select><option>93</option><option>E30</option><option>E40</option><option>E50</option></select></label><label className="full"><span>Internal note</span><textarea placeholder="Goals, hardware, prior history..."/></label></div><div className="os-modalActions"><button className="os-btn" onClick={onClose}>Cancel</button><button className="os-btn os-btn-primary" onClick={create}>Create demo tune</button></div></div></section></div>}

function NotificationTray({onClose,openJob}){const alex=findJob("SP-1842"),carlos=findJob("SP-1846");return <div style={{position:"fixed",right:22,top:70,zIndex:70,width:330,border:"1px solid #303730",borderRadius:12,background:"#121512",boxShadow:"0 24px 70px rgba(0,0,0,.5)",overflow:"hidden"}}><div className="os-panelHead"><div><h3>Notifications</h3><p>3 items need attention</p></div><button className="os-mini" onClick={onClose}><X size={13}/></button></div><div className="os-activity"><button className="os-activityItem" style={{border:0,color:"inherit",textAlign:"left"}} onClick={()=>{onClose();openJob(alex,"log")}}><div className="os-activityIcon"><Activity size={13}/></div><div><b>2 new Alex Rivera logs</b><span>Rev 4 • MHD • 18m ago</span></div><ChevronRight size={13}/></button><button className="os-activityItem" style={{border:0,color:"inherit",textAlign:"left"}} onClick={()=>{onClose();openJob(carlos)}}><div className="os-activityIcon"><ShoppingBag size={13}/></div><div><b>Carlos Mendez new order</b><span>S55 • BM3 • intake needed</span></div><ChevronRight size={13}/></button><div className="os-activityItem"><div className="os-activityIcon"><Mail size={13}/></div><div><b>6 unread customer messages</b><span>Across 4 projects</span></div><ChevronRight size={13}/></div></div></div>}

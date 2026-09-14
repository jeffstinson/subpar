"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, Archive, Bell, Bot, Calculator, Car, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleDollarSign, ClipboardCheck, Database, ExternalLink, FileText,
  Fuel, Gauge, LayoutDashboard, ListChecks, Mail, Menu, MessageSquare, MoreHorizontal,
  Plus, RefreshCw, Search, Send, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal,
  Sparkles, UploadCloud, UserRound, Users, Wrench, X, Zap
} from "lucide-react";
import {
  jobs, closedTunes, activities, messageThreads, integrations, automationRules,
  deepPath, findJob
} from "./lib/demo-data";

const PHOTO = {
  m340: "https://images.unsplash.com/photo-1748988729902-e2ed3f57549e?auto=format&fit=crop&w=1600&q=84",
  m4: "https://images.unsplash.com/photo-1744223679892-8b33437a7273?auto=format&fit=crop&w=1600&q=84",
  m2: "https://images.unsplash.com/photo-1777755268261-4b3009a7c63d?auto=format&fit=crop&w=1600&q=84",
  m3: "https://images.unsplash.com/photo-1747868328685-6f276c1fb771?auto=format&fit=crop&w=1600&q=84",
  x3: "https://images.unsplash.com/photo-1769214567934-dc16b57f92ba?auto=format&fit=crop&w=1600&q=84",
  supra: "https://images.unsplash.com/photo-1673078999683-f729317c3ce6?auto=format&fit=crop&w=1600&q=84",
};

const vehicleImages = {
  "SP-1842": PHOTO.m340,
  "SP-1839": PHOTO.m2,
  "SP-1834": PHOTO.m3,
  "SP-1830": PHOTO.supra,
  "SP-1827": PHOTO.m340,
  "SP-1846": PHOTO.m4,
  "SP-1845": PHOTO.m2,
  "SP-1822": PHOTO.x3,
};

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
const counts={queue:18,orders:3,logs:7,revisions:4,messages:6};

function Badge({children,tone="green"}){return <span className={`os-badge ${tone}`}>{children}</span>}
function PanelHead({title,sub,children}){return <div className="os-panelHead"><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div>{children}</div>}
function labelFor(id){for(const group of navGroups){const item=group.items.find(x=>x[0]===id);if(item)return item[1]}return "Dashboard"}
function imageFor(job){return vehicleImages[job?.order]||PHOTO.m340}

export default function Home(){
  const [active,setActive]=useState("dashboard");
  const [query,setQuery]=useState("");
  const [selectedJob,setSelectedJob]=useState(null);
  const [showNewTune,setShowNewTune]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [toast,setToast]=useState("");
  const [refreshing,setRefreshing]=useState(false);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const order=params.get("project");
    if(order){const job=findJob(order);if(job)setSelectedJob(job)}
  },[]);

  function flash(text){setToast(text);window.setTimeout(()=>setToast(""),2200)}
  function refresh(){setRefreshing(true);window.setTimeout(()=>{setRefreshing(false);flash("Demo activity refreshed")},650)}
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
    dashboard:<Dashboard openJob={openJob} setActive={setActive} setShowNewTune={setShowNewTune} refresh={refresh} refreshing={refreshing}/>,
    queue:<QueueView openJob={openJob}/>, orders:<OrdersView openJob={openJob}/>, logs:<LogsView openJob={openJob}/>,
    revisions:<RevisionsView openJob={openJob}/>, messages:<MessagesView flash={flash}/>, customers:<CustomersView openJob={openJob}/>,
    garage:<GarageView openJob={openJob}/>, portal:<PortalView openJob={openJob}/>, closed:<ClosedView flash={flash}/>,
    calculator:<CalculatorView/>, integrations:<IntegrationsView flash={flash}/>, audit:<AuditView/>
  }[active];

  return <div className="os-shell">
    {toast&&<div className="os-toast">{toast}</div>}
    <Sidebar active={active} setActive={setActive}/>
    <main className="os-main">
      <header className="os-topbar">
        <div className="os-crumb"><b>SUBPAR OS</b><span>/</span><span>{labelFor(active).toUpperCase()}</span></div>
        <div className="os-topActions">
          <div className="os-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customers, vehicles, tunes, logs..."/>
            {searchResults.length>0&&<div className="os-searchResults">{searchResults.map(j=><button key={j.order} onClick={()=>{setQuery("");openJob(j)}}><span><b>{j.name}</b><small>{j.vehicle} • {j.order}</small></span><em>{j.status}</em></button>)}</div>}
          </div>
          <button className="os-iconBtn" onClick={refresh}><RefreshCw size={15} className={refreshing?"spin":""}/></button>
          <button className="os-iconBtn os-bell" onClick={()=>setNotifications(v=>!v)}><Bell size={16}/><i/></button>
          <div className="os-profile"><div className="os-avatar">DT</div><div><b>Doug Talmadge</b><span>Owner • Subpar Tuning</span></div><ChevronDown size={13}/></div>
        </div>
      </header>
      {notifications&&<NotificationTray onClose={()=>setNotifications(false)} openJob={openJob}/>} 
      {content}
    </main>
    <div className="os-mobileNav">{[["dashboard","Home",LayoutDashboard],["queue","Queue",ListChecks],["garage","Garage",Car],["logs","Logs",Activity],["messages","Messages",MessageSquare]].map(([id,label,Icon])=><button className={active===id?"on":""} key={id} onClick={()=>setActive(id)}><Icon size={17}/><span>{label}</span></button>)}</div>
    {selectedJob&&<ProjectDrawer job={selectedJob} onClose={()=>setSelectedJob(null)} flash={flash}/>} 
    {showNewTune&&<NewTuneModal onClose={()=>setShowNewTune(false)} flash={flash}/>} 
  </div>
}

function Sidebar({active,setActive}){
  return <aside className="os-sidebar">
    <div className="os-brand"><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>TUNING DASHBOARD</span></div></div>
    <div className="os-brandRule"/>
    {navGroups.map(group=><div className="os-navGroup" key={group.label}><span className="os-navLabel">{group.label}</span><nav className="os-nav">{group.items.map(([id,label,Icon])=><button key={id} className={active===id?"os-active":""} onClick={()=>setActive(id)}><Icon size={15}/><span>{label}</span>{counts[id]&&<em>{counts[id]}</em>}</button>)}</nav></div>)}
    <div className="os-navGroup"><span className="os-navLabel">AUTOMATION</span><nav className="os-nav"><Link href="/automations"><Bot size={15}/><span>Automation Studio</span><em>4</em></Link><Link href="/mobile"><Menu size={15}/><span>Mobile Command</span></Link></nav></div>
    <div className="os-sideStatement"><span>BETTER BUILDS.</span><span>HAPPIER DRIVERS.</span><small>SUBPAR TUNING</small></div>
    <div className="os-sideBottom"><div className="os-user"><div className="os-avatar">DT</div><div><b>Doug Talmadge</b><span>Subpar Tuning</span></div><Settings size={14}/></div></div>
  </aside>
}

function Dashboard({openJob,setActive,setShowNewTune,refresh,refreshing}){
  const topStats=[
    [ShoppingBag,"New Orders","3","Wix purchases awaiting intake","amber"],[FileText,"Logs Waiting","7","Awaiting review across platforms","green"],
    [RefreshCw,"Revisions Due","4","Needs Doug's attention","red"],[CheckCircle2,"Ready to Deliver","2","Customer-ready tunes","green"],
    [Users,"Active Customers","18","Across 17 vehicles","green"],[CircleDollarSign,"Revenue (MTD)","$7,840","Confirmed Wix orders","green"]
  ];
  return <div className="os-page os-dashboardPage">
    <section className="os-hero" style={{backgroundImage:`linear-gradient(90deg,#0b0e0d 0%,rgba(11,14,13,.88) 38%,rgba(11,14,13,.38) 70%,#0b0e0d 100%),url(${PHOTO.m340})`}}>
      <div className="os-heroCopy"><span className="os-eyebrow">GOOD EVENING,</span><h1>Doug<span>.</span></h1><p>Keep the momentum going. Here’s what’s happening with your tunes, customers and revisions today.</p><div className="os-heroActions"><button className="os-btn os-btn-primary" onClick={()=>setShowNewTune(true)}><Plus size={14}/>New tune</button><button className="os-btn" onClick={refresh}><RefreshCw size={14} className={refreshing?"spin":""}/>Sync activity</button></div></div>
      <div className="os-heroQuote"><span>PERFORMANCE</span><span>PEOPLE</span><span>PROGRESS</span><i/><small>SUBPAR TUNING</small></div>
    </section>

    <div className="os-kpis">{topStats.map(([Icon,label,value,sub,tone])=><article className="os-kpi" key={label}><div className={`os-kpiIcon ${tone}`}><Icon size={18}/></div><div><span>{label}</span><b>{value}</b><small>{sub}</small></div></article>)}</div>

    <div className="os-dashboardGrid">
      <section className="os-panel os-queuePanel"><PanelHead title="Tune Queue" sub="Prioritized around the next action. Keep the pipeline moving."><button className="os-linkBtn" onClick={()=>setActive("queue")}>View all tunes <ChevronRight size={13}/></button></PanelHead><QueueTable rows={jobs.slice(0,6)} openJob={openJob}/></section>
      <section className="os-panel"><PanelHead title="Recent Activity" sub="Live updates from your systems."/><div className="os-activity">{activities.slice(0,5).map(a=><ActivityItem key={a.text} item={a} openJob={openJob}/>)}</div></section>
      <section className="os-panel os-garageStrip"><PanelHead title="Vehicle Garage" sub="Recent customer vehicles"><button className="os-linkBtn" onClick={()=>setActive("garage")}>View all vehicles <ChevronRight size={13}/></button></PanelHead><div className="os-vehicleStrip">{jobs.slice(0,4).map(j=><VehicleMini key={j.order} job={j} onClick={()=>openJob(j)}/>)}</div></section>
      <section className="os-panel os-intakePanel"><PanelHead title="Automated Intake" sub="From Wix purchase to tune delivery"><Link className="os-linkBtn" href="/automations">Manage <ChevronRight size={13}/></Link></PanelHead><div className="os-intakeSteps">{[["1","Wix order received","Customer + product matched",true],["2","Platform-specific email sent","MHD / BM3 / EcuTek instructions",true],["3","Vehicle intake","2 customers completing info",false],["4","Moves into tune queue","Doug only sees what needs action",false]].map(([n,a,b,done])=><div key={n}><span className={done?"done":""}>{done?<Check size={12}/>:n}</span><div><b>{a}</b><small>{b}</small></div>{done&&<CheckCircle2 size={14}/>}</div>)}</div></section>
    </div>
  </div>
}

function VehicleMini({job,onClick}){return <button className="os-vehicleMini" onClick={onClick}><img src={imageFor(job)} alt={job.vehicle}/><div className="os-vehicleMiniShade"/><div className="os-vehicleMiniInfo"><b>{job.vehicle.replace("BMW ","")}</b><span>{job.name}</span><div><Badge tone={job.platform==="MHD"?"green":job.platform==="BM3"?"blue":"purple"}>{job.platform}</Badge><Badge tone="gray">{job.fuel}</Badge></div></div></button>}

function ActivityItem({item,openJob}){const job=findJob(item.order);const Icon={log:UploadCloud,email:Mail,order:ShoppingBag,revision:RefreshCw,message:MessageSquare,intake:ClipboardCheck}[item.type]||Activity;return <button className="os-activityItem" onClick={()=>job&&openJob(job,item.type==="log"?"log":"project")}><div className={`os-activityIcon ${item.tone}`}><Icon size={14}/></div><div><b>{item.text}</b><small>{item.order}</small></div><span>{item.time}</span></button>}

function QueueTable({rows,openJob}){const [filter,setFilter]=useState("All");const filtered=rows.filter(j=>filter==="All"||j.platform===filter||j.priority===filter||j.waitingOn===filter);return <><div className="os-queueFilters">{["All","MHD","BM3","EcuTek","High","Customer"].map(f=><button key={f} className={filter===f?"on":""} onClick={()=>setFilter(f)}>{f}{f==="All"&&<em>{rows.length}</em>}</button>)}</div><div className="os-tableWrap"><table className="os-table"><thead><tr><th>Customer</th><th>Vehicle</th><th>Platform</th><th>Fuel</th><th>Status</th><th>Priority</th><th>Last activity</th><th/></tr></thead><tbody>{filtered.map(j=><tr key={j.order} onClick={()=>openJob(j,j.status==="Log Uploaded"?"log":j.status.includes("Revision")?"revision":"project")}><td><b>{j.name}</b><small>{j.order}</small></td><td><b>{j.vehicle}</b><small>{j.engine} • {j.chassis}</small></td><td>{j.platform}</td><td>{j.fuel}</td><td><Badge tone={j.tone}>{j.status}</Badge></td><td><span className={`os-priority ${j.priority.toLowerCase()}`}>{j.priority}</span></td><td>{j.last}</td><td><MoreHorizontal size={14}/></td></tr>)}</tbody></table></div></>}

function PageHead({eyebrow,title,sub,children}){return <div className="os-head"><div><span className="os-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{sub}</p></div><div className="os-actions">{children}</div></div>}
function Stat({label,value,sub,tone="green",Icon=Gauge}){return <article className="os-stat"><div className={`os-kpiIcon ${tone}`}><Icon size={18}/></div><div><span>{label}</span><b>{value}</b><small>{sub}</small></div></article>}

function QueueView({openJob}){return <div className="os-page"><PageHead eyebrow="OPERATIONS" title="Tune Queue" sub="One queue for every active calibration, regardless of platform."/><div className="os-stats4"><Stat label="Needs Doug" value="9" sub="Logs, revisions, delivery" Icon={Zap}/><Stat label="Waiting on Customer" value="5" sub="Info, logs, confirmation" tone="amber" Icon={UserRound}/><Stat label="Ready to Deliver" value="2" sub="Customer-ready" Icon={CheckCircle2}/><Stat label="High Priority" value="4" sub="Review first" tone="red" Icon={Activity}/></div><section className="os-panel"><PanelHead title="All active tunes" sub="Status, owner and next action stay visible."/><QueueTable rows={jobs} openJob={openJob}/></section></div>}

function OrdersView({openJob}){const orderJobs=jobs.filter(j=>["New Order","Vehicle Info Received","Compatibility Review"].includes(j.status));return <div className="os-page"><PageHead eyebrow="ORDER → PROJECT" title="New Orders" sub="Paid Wix orders become structured tune projects only after intake and compatibility gates pass."/><div className="os-cardGrid">{orderJobs.map(j=><article className="os-orderCard" key={j.order}><img src={imageFor(j)} alt={j.vehicle}/><div className="os-orderShade"/><div className="os-orderBody"><div><Badge tone={j.platform==="BM3"?"blue":j.platform==="EcuTek"?"purple":"green"}>{j.platform}</Badge><Badge tone="amber">{j.status}</Badge></div><h3>{j.name}</h3><p>{j.vehicle} • {j.engine} • {j.fuel}</p><small>Next: {j.next}</small><button className="os-btn os-btn-primary" onClick={()=>openJob(j)}>Open intake <ChevronRight size={12}/></button></div></article>)}</div></div>}

function LogsView({openJob}){const rows=jobs.filter(j=>j.status==="Log Uploaded"||j.status==="Compatibility Review");return <div className="os-page"><PageHead eyebrow="CALIBRATION" title="Datalog Reviews" sub="Incoming pulls prioritized by customer wait time, platform and risk."/><div className="os-cardGrid">{rows.map(j=><article className="os-workCard" key={j.order}><div className="os-workIcon"><Activity size={19}/></div><div><span className="os-eyebrow">{j.order} • {j.platform}</span><h3>{j.name} • {j.vehicle}</h3><p>{j.next}</p><div className="os-workMeta"><Badge tone={j.priority==="High"?"red":"amber"}>{j.priority}</Badge><span>{j.last}</span></div></div><button className="os-btn os-btn-primary" onClick={()=>openJob(j,"log")}>Review logs</button></article>)}</div></div>}

function RevisionsView({openJob}){const rows=jobs.filter(j=>j.waitingOn==="Doug");return <div className="os-page"><PageHead eyebrow="DELIVERY" title="Tune Revisions" sub="Build, review and publish the next file with context from the last log attached."/><div className="os-cardGrid">{rows.slice(0,6).map(j=><article className="os-workCard" key={j.order}><div className="os-workIcon purple"><RefreshCw size={19}/></div><div><span className="os-eyebrow">{j.order} • {j.rev}</span><h3>{j.name}</h3><p>{j.vehicle} • {j.next}</p><div className="os-workMeta"><Badge tone={j.platform==="MHD"?"green":j.platform==="BM3"?"blue":"purple"}>{j.platform}</Badge><span>{j.last}</span></div></div><button className="os-btn" onClick={()=>openJob(j,"revision")}>Open revision</button></article>)}</div></div>}

function MessagesView({flash}){const [selected,setSelected]=useState(messageThreads[0]);const [draft,setDraft]=useState("");return <div className="os-page"><PageHead eyebrow="COMMUNICATION" title="Messages" sub="Customer communication attached to the exact vehicle and tune project."/><div className="os-messageLayout"><section className="os-panel os-threadList">{messageThreads.map(t=><button className={selected.order===t.order?"on":""} key={t.order} onClick={()=>setSelected(t)}><div className="os-threadAvatar">{t.name.split(" ").map(x=>x[0]).join("")}</div><div><b>{t.name}</b><span>{t.subject}</span><small>{t.preview}</small></div><em>{t.time}</em></button>)}</section><section className="os-panel os-chat"><PanelHead title={selected.name} sub={`${selected.order} • Gmail synced demo`}/><div className="os-chatBody"><div className="os-bubble"><b>{selected.name}</b><p>{selected.preview}</p><span>{selected.time}</span></div><div className="os-bubble mine"><b>Doug</b><p>Got it — I have this attached to your tune and I’ll review the next step.</p><span>Demo reply</span></div></div><div className="os-chatComposer"><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Reply through Doug’s Gmail…"/><button onClick={()=>{if(draft.trim()){flash("Demo reply added");setDraft("")}}}><Send size={14}/></button></div></section></div></div>}

function CustomersView({openJob}){return <div className="os-page"><PageHead eyebrow="CRM" title="Customers" sub="One customer record across every vehicle, tune, file and conversation."/><div className="os-customerGrid">{jobs.map(j=><article className="os-customerCard" key={j.order}><div className="os-customerTop"><div className="os-threadAvatar">{j.name.split(" ").map(x=>x[0]).join("")}</div><div><h3>{j.name}</h3><p>{j.email}</p></div><MoreHorizontal size={15}/></div><img src={imageFor(j)} alt={j.vehicle}/><div className="os-customerFacts"><span>{j.vehicle}</span><span>{j.platform} • {j.fuel}</span><span>Customer since {j.customerSince}</span></div><button className="os-btn" onClick={()=>openJob(j)}>Open customer</button></article>)}</div></div>}

function GarageView({openJob}){
  const [selected,setSelected]=useState(jobs[0]);
  const [filter,setFilter]=useState("All Vehicles");
  const [search,setSearch]=useState("");
  const filtered=jobs.filter(j=>(filter==="All Vehicles"||j.platform===filter||j.vehicle.includes(filter))&&(`${j.name} ${j.vehicle} ${j.chassis} ${j.engine}`.toLowerCase().includes(search.toLowerCase())));
  return <div className="os-page os-garagePage">
    <section className="os-garageHero" style={{backgroundImage:`linear-gradient(90deg,#0b0e0d 0%,rgba(11,14,13,.86) 42%,rgba(11,14,13,.34) 74%,#0b0e0d 100%),url(${PHOTO.m340})`}}><div><span className="os-eyebrow">CUSTOMER VEHICLES</span><h1>Vehicle Garage<span>.</span></h1><p>Customer cars, platform history, tune readiness and permanent vehicle context — all in one place.</p></div><div className="os-garageQuote">BETTER<br/>BUILDS.<br/>HAPPIER<br/>DRIVERS.<i/><small>SUBPAR TUNING</small></div></section>
    <div className="os-stats4"><Stat label="Total Vehicles" value="48" sub="Customer vehicles in garage" Icon={Car}/><Stat label="Active Tunes" value="36" sub="Vehicles with an active tune" Icon={Wrench}/><Stat label="Platforms" value="6" sub="MHD / BM3 / EcuTek / Stock" Icon={SlidersHorizontal}/><Stat label="Ready for Tune" value="7" sub="Approved & ready to schedule" Icon={CheckCircle2}/></div>
    <div className="os-garageToolbar"><div className="os-filterTabs">{["All Vehicles","MHD","BM3","EcuTek"].map(f=><button className={filter===f?"on":""} key={f} onClick={()=>setFilter(f)}>{f}{f==="All Vehicles"&&<em>48</em>}</button>)}</div><div className="os-garageSearch"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vehicles..."/></div></div>
    <div className="os-garageLayout"><section className="os-garageGrid">{filtered.map((j,i)=><button className={`os-garageCard ${selected.order===j.order?"selected":""} ${i<2?"featured":""}`} key={j.order} onClick={()=>setSelected(j)}><img src={imageFor(j)} alt={j.vehicle}/><div className="os-garageCardShade"/><div className="os-garageCardBadges"><Badge tone={j.status==="Ready to Deliver"?"green":j.status==="Waiting on Customer"?"amber":j.status==="Revision in Progress"?"blue":"green"}>{j.status}</Badge><MoreHorizontal size={14}/></div><div className="os-garageCardInfo"><b>{j.name}</b><h3>{j.vehicle}</h3><p>{j.engine} • {j.fuel} • {j.platform}</p></div></button>)}</section><aside className="os-vehicleDetail"><img src={imageFor(selected)} alt={selected.vehicle}/><div className="os-detailShade"/><div className="os-detailBody"><Badge tone={selected.waitingOn==="Doug"?"green":"amber"}>{selected.status}</Badge><h2>{selected.name}</h2><h3>{selected.vehicle}</h3><p>{selected.engine} • {selected.chassis} • {selected.fuel}</p><div className="os-detailTabs"><button className="on">Overview</button><button>Tune History</button><button>Notes</button><button>Files</button></div><div className="os-detailFacts">{[["Customer",selected.name],["Platform",selected.platform],["Chassis",selected.chassis],["Engine",selected.engine],["Fuel",selected.fuel],["Current Status",selected.status],["Last Activity",selected.last]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div><button className="os-btn os-btn-primary" onClick={()=>openJob(selected)}>View Full Vehicle Profile <ChevronRight size={13}/></button></div></aside></div>
    <div className="os-garageBottom"><section className="os-panel"><PanelHead title="Recent Garage Activity" sub="Latest updates across all customer vehicles"/><div className="os-activity">{activities.slice(0,4).map(a=><ActivityItem key={a.text} item={a} openJob={openJob}/>)}</div></section><section className="os-panel"><PanelHead title="Platform Breakdown" sub="Active garage mix"/><div className="os-platformBreakdown"><div className="os-donut"><b>48</b><span>Vehicles</span></div><div>{[["MHD",16,"green"],["BM3",14,"blue"],["EcuTek",10,"purple"],["Stock",8,"gray"]].map(([a,b,c])=><span key={a}><i className={c}/><b>{a}</b><em>{b}</em></span>)}</div></div></section></div>
  </div>
}

function PortalView({openJob}){return <div className="os-page"><PageHead eyebrow="CUSTOMER EXPERIENCE" title="Customer Portal" sub="Exactly what the customer needs to see — no internal tuner noise."/><div className="os-portalGrid">{jobs.slice(0,6).map(j=><article className="os-portalCard" key={j.order}><img src={imageFor(j)} alt={j.vehicle}/><div className="os-portalBody"><Badge tone={j.waitingOn==="Doug"?"green":"amber"}>{j.waitingOn==="Doug"?"Waiting on Subpar":"Waiting on Customer"}</Badge><h3>{j.name}</h3><p>{j.vehicle}</p><div><span>Current revision</span><b>{j.rev}</b></div><div><span>Next step</span><b>{j.next}</b></div><button className="os-btn" onClick={()=>openJob(j,"portal")}>Open customer view</button></div></article>)}</div></div>}

function ClosedView({flash}){return <div className="os-page"><PageHead eyebrow="ARCHIVE" title="Closed Tunes" sub="Completed projects stay tied to the vehicle forever."/><section className="os-panel"><div className="os-tableWrap"><table className="os-table"><thead><tr><th>Customer</th><th>Vehicle</th><th>Platform</th><th>Final rev</th><th>Fuel</th><th>Closed</th><th>Duration</th><th/></tr></thead><tbody>{closedTunes.map(t=><tr key={t.order}><td><b>{t.name}</b><small>{t.order}</small></td><td>{t.vehicle}</td><td>{t.platform}</td><td>{t.finalRev}</td><td>{t.fuel}</td><td>{t.closed}</td><td>{t.duration}</td><td><button className="os-mini" onClick={()=>flash("Archived tune opened in demo")}>View</button></td></tr>)}</tbody></table></div></section></div>}

function CalculatorView(){const [tank,setTank]=useState(15.6),[fuel,setFuel]=useState(5),[current,setCurrent]=useState(10),[e85,setE85]=useState(78),[target,setTarget]=useState(40);const add=Math.max(0,((target-current)/Math.max(1,e85-current))*Math.max(0,tank-fuel));const pump=Math.max(0,tank-fuel-add);return <div className="os-page"><PageHead eyebrow="TOOLS" title="E85 Calculator" sub="Fast blend math for the BMW/Supra combinations Doug sees most."/><div className="os-calcLayout"><section className="os-panel os-calc"><PanelHead title="Blend inputs" sub="Synthetic calculator preview"/><div className="os-formGrid">{[["Tank capacity (gal)",tank,setTank],["Fuel currently in tank",fuel,setFuel],["Current ethanol %",current,setCurrent],["Actual E85 %",e85,setE85],["Target ethanol %",target,setTarget]].map(([a,v,set])=><label key={a}><span>{a}</span><input type="number" value={v} onChange={x=>set(Number(x.target.value))}/></label>)}</div></section><section className="os-panel os-calcResult"><span className="os-eyebrow">MIX RESULT</span><h2>{add.toFixed(2)} gal E85</h2><p>then add approximately</p><h3>{pump.toFixed(2)} gal pump gas</h3><div className="os-meter"><i style={{width:`${Math.min(100,target)}%`}}/></div><small>Target blend: E{target}</small></section></div></div>}

function IntegrationsView({flash}){return <div className="os-page"><PageHead eyebrow="SYSTEMS" title="Integrations" sub="Subpar OS organizes the tools Doug already uses instead of replacing them."/><div className="os-integrationGrid">{integrations.map(i=><article className="os-integration" key={i.name}><div className={`os-integrationIcon ${i.tone}`}><Database size={18}/></div><div><h3>{i.name}</h3><p>{i.detail}</p><small>{i.last}</small></div><Badge tone={i.status==="Ready"?"green":"gray"}>{i.status}</Badge><button className="os-btn" onClick={()=>flash(`${i.name} configuration preview`)}>Configure</button></article>)}</div><section className="os-panel os-automationSummary"><PanelHead title="Active automation rules" sub="Vehicle-aware routing built on top of integrations"><Link className="os-linkBtn" href="/automations">Open Studio <ChevronRight size={13}/></Link></PanelHead>{automationRules.map(r=><div className="os-rule" key={r.name}><Zap size={14}/><div><b>{r.name}</b><small>{r.trigger}</small></div><span>{r.action}</span><Badge tone={r.status==="Active"?"green":"amber"}>{r.status}</Badge></div>)}</section></div>}

function AuditView(){const checks=[["Unified dashboard shell","PASS"],["Responsive mobile navigation","PASS"],["Vehicle photography / garage","PASS"],["Project → log → revision → closeout flow","PASS"],["Customer-facing portal","PASS"],["Wix live ingestion","GATED"],["Gmail live sync/send","GATED"],["Persistent database/auth","NEXT"],["MHD CSV parser","NEXT"]];return <div className="os-page"><PageHead eyebrow="SYSTEM" title="Product Audit" sub="What is visually complete now vs what still requires the real-data backend."/><section className="os-panel"><div className="os-auditList">{checks.map(([a,b])=><div key={a}><div><ShieldCheck size={15}/><b>{a}</b></div><Badge tone={b==="PASS"?"green":b==="GATED"?"amber":"blue"}>{b}</Badge></div>)}</div></section></div>}

function NotificationTray({onClose,openJob}){return <aside className="os-notifications"><div className="os-notificationHead"><div><span className="os-eyebrow">INBOX</span><h3>Notifications</h3></div><button onClick={onClose}><X size={15}/></button></div>{activities.slice(0,4).map(a=><button key={a.text} onClick={()=>{const j=findJob(a.order);if(j)openJob(j)}}><i className={a.tone}/><div><b>{a.text}</b><span>{a.time}</span></div></button>)}</aside>}

function ProjectDrawer({job,onClose,flash}){return <div className="os-drawerBackdrop" onClick={onClose}><aside className="os-drawer" onClick={e=>e.stopPropagation()}><button className="os-drawerClose" onClick={onClose}><X size={16}/></button><div className="os-drawerHero"><img src={imageFor(job)} alt={job.vehicle}/><div/><section><Badge tone={job.tone}>{job.status}</Badge><h2>{job.name}</h2><h3>{job.vehicle}</h3><p>{job.engine} • {job.chassis} • {job.fuel}</p></section></div><div className="os-drawerBody"><div className="os-detailFacts">{[["Order",job.order],["Platform",job.platform],["Revision",job.rev],["Waiting on",job.waitingOn],["Next action",job.next],["Updated",job.last]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div><div className="os-drawerButtons"><button className="os-btn os-btn-primary" onClick={()=>flash("Project action staged")}>Open project</button><button className="os-btn" onClick={()=>flash("Customer message staged")}>Message customer</button></div></div></aside></div>}

function NewTuneModal({onClose,flash}){const [name,setName]=useState("");return <div className="os-modalBackdrop" onClick={onClose}><section className="os-modal" onClick={e=>e.stopPropagation()}><div className="os-modalHead"><div><span className="os-eyebrow">NEW TUNE</span><h2>Create tune project</h2></div><button onClick={onClose}><X size={16}/></button></div><div className="os-formGrid"><label><span>Customer</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Customer name"/></label><label><span>Vehicle</span><input placeholder="2024 BMW M3"/></label><label><span>Platform</span><select><option>MHD</option><option>bootmod3</option><option>EcuTek</option></select></label><label><span>Fuel</span><select><option>93</option><option>E30</option><option>E40</option><option>E50</option></select></label></div><button className="os-btn os-btn-primary" onClick={()=>{flash("Demo tune project created");onClose()}}>Create project</button></section></div>}

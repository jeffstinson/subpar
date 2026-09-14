
"use client";

import { useMemo, useState } from "react";
import {
  LayoutDashboard, FolderKanban, ShoppingBag, Activity, RefreshCw, MessageSquare,
  CreditCard, FileCheck2, Files, Package, Users, Car, BarChart3, Settings,
  Search, Bell, Plus, Upload, ExternalLink, CheckCircle2, AlertCircle, Clock3,
  ChevronRight, Send, Calculator, Globe2, LogOut, Gauge, CircleDollarSign, Mail
} from "lucide-react";

const jobs = [
  {id:1,name:"Alex Rivera",email:"alex.rivera@gmail.com",vehicle:"2021 BMW M340i",engine:"B58TU",platform:"MHD",rev:"Rev 4",status:"Log Uploaded",priority:"High",last:"18m ago",fuel:"E40",order:"#SP-1842"},
  {id:2,name:"Mike Tremblay",email:"mike.tremblay@outlook.com",vehicle:"2019 BMW M2 Competition",engine:"S55",platform:"BM3",rev:"Rev 2",status:"Revision in Progress",priority:"High",last:"46m ago",fuel:"93",order:"#SP-1839"},
  {id:3,name:"Ryan Gallagher",email:"rgallagher@me.com",vehicle:"2022 BMW M3 Competition",engine:"S58",platform:"EcuTek",rev:"Rev 5",status:"Ready to Deliver",priority:"Med",last:"1h ago",fuel:"E50",order:"#SP-1834"},
  {id:4,name:"Sarah Chen",email:"s.chen.bmw@icloud.com",vehicle:"2020 Toyota Supra",engine:"B58",platform:"MHD",rev:"Rev 2",status:"Waiting on Customer",priority:"Med",last:"3h ago",fuel:"93",order:"#SP-1830"},
  {id:5,name:"Tyler Brooks",email:"tyler.brooks@gmail.com",vehicle:"2015 BMW 335i xDrive",engine:"N55",platform:"MHD",rev:"Rev 4",status:"Compat. Review",priority:"Low",last:"5h ago",fuel:"E30",order:"#SP-1827"},
  {id:6,name:"Carlos Mendez",email:"c.mendez.tuning@hotmail.com",vehicle:"2016 BMW M4",engine:"S55",platform:"BM3",rev:"Rev 1",status:"New Order",priority:"High",last:"Just now",fuel:"93",order:"#SP-1846"},
  {id:7,name:"Jordan Patel",email:"jpatel@proton.me",vehicle:"2024 BMW M2",engine:"S58",platform:"EcuTek",rev:"Rev 1",status:"Vehicle Info Received",priority:"Med",last:"11m ago",fuel:"E50",order:"#SP-1845"},
];

const nav = [
  ["dashboard","Dashboard",LayoutDashboard],
  ["projects","Active Projects",FolderKanban],
  ["orders","New Orders",ShoppingBag],
  ["logs","Datalog Reviews",Activity],
  ["revisions","Tune Revisions",RefreshCw],
  ["messages","Messages",MessageSquare],
  ["payments","Payments",CreditCard],
  ["waivers","Waivers",FileCheck2],
  ["files","Files",Files],
  ["products","Products",Package],
  ["customers","Customers",Users],
  ["garage","Vehicle Garage",Car],
  ["calculator","E85 Calculator",Calculator],
  ["website","Website Redesign",Globe2],
  ["analytics","Analytics",BarChart3],
  ["settings","Settings",Settings],
];

function Badge({children, tone="green"}) {
  return <span className={`badge ${tone}`}>{children}</span>
}

function Sidebar({active,setActive}) {
  return <aside className="sidebar">
    <div className="brand">
      <img src="/subpar-logo.png" alt="Subpar Tuning" />
      <div>
        <strong>SUBPAR OS</strong>
        <span>TUNING DASHBOARD</span>
      </div>
    </div>
    <nav>
      {nav.map(([id,label,Icon]) => (
        <button key={id} onClick={()=>setActive(id)} className={active===id ? "nav active":"nav"}>
          <Icon size={17}/><span>{label}</span>
          {id==="logs" && <em>7</em>}
          {id==="messages" && <em>6</em>}
          {id==="orders" && <em>3</em>}
        </button>
      ))}
    </nav>
    <div className="sideBottom">
      <div className="user">
        <div className="avatar">DT</div>
        <div><b>Doug Talmadge</b><span>Subpar Tuning</span></div>
      </div>
      <button className="logout"><LogOut size={15}/> Exit Dashboard</button>
    </div>
  </aside>
}

function Header({active,search,setSearch}) {
  const label = nav.find(x=>x[0]===active)?.[1] || "Dashboard";
  return <header className="topbar">
    <div className="crumb">SUBPAR OS <span>/</span> {label}</div>
    <div className="topActions">
      <div className="search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers, vehicles, orders, logs..." /></div>
      <button className="iconBtn"><Bell size={17}/><i /></button>
    </div>
  </header>
}

function Dashboard({setActive}) {
  const [filter,setFilter] = useState("All");
  const rows = jobs.filter(j => filter==="All" || filter==="High"&&j.priority==="High" || filter===j.platform);
  return <div className="page">
    <div className="pageHead">
      <div><span className="eyebrow">TODAY'S WORK QUEUE</span><h1>Good evening, Doug.</h1><p>Everything that needs your attention, without living in Wix and Gmail.</p></div>
      <div className="headActions"><button className="btn secondary"><RefreshCw size={14}/> Sync activity</button><button className="btn primary"><Plus size={14}/> New tune</button></div>
    </div>

    <div className="stats">
      {[
        ["New Orders","3","Awaiting intake","amber",ShoppingBag],
        ["Logs Waiting","7","Ready to analyze","green",Activity],
        ["Revisions Due","4","In progress","red",RefreshCw],
        ["Ready to Deliver","2","Awaiting send-off","purple",Send],
        ["Unread Messages","6","Customer replies","blue",Mail],
        ["Revenue This Month","$7,840","Wix confirmed","green",CircleDollarSign],
        ["Active Customers","18","Open tune projects","white",Users],
        ["Missing Info","5","Needs customer action","amber",AlertCircle],
      ].map(([a,b,c,t,Icon])=><div className="stat" key={a}><div className="statTop"><span>{a}</span><Icon size={15}/></div><strong className={t}>{b}</strong><small>{c}</small></div>)}
    </div>

    <div className="dashGrid">
      <section className="panel queuePanel">
        <div className="panelHead">
          <div><h3>Work Queue</h3><p>Prioritized by newest activity and tuner action required.</p></div>
          <div className="filters">{["All","High","MHD","BM3","EcuTek"].map(x=><button key={x} className={filter===x?"on":""} onClick={()=>setFilter(x)}>{x}</button>)}</div>
        </div>
        <div className="tableWrap"><table>
          <thead><tr><th>Customer</th><th>Vehicle</th><th>Platform</th><th>Rev</th><th>Status</th><th>Priority</th><th>Last Activity</th><th></th></tr></thead>
          <tbody>{rows.map(j=><tr key={j.id}>
            <td><b>{j.name}</b><span>{j.email}</span></td>
            <td>{j.vehicle}<span>{j.engine}</span></td>
            <td><Badge tone={j.platform==="MHD"?"green":j.platform==="BM3"?"blue":"purple"}>{j.platform}</Badge></td>
            <td>{j.rev}</td>
            <td><Badge tone={j.status==="Log Uploaded"?"green":j.status==="Ready to Deliver"?"purple":j.status==="Revision in Progress"?"red":"amber"}>{j.status}</Badge></td>
            <td><Badge tone={j.priority==="High"?"red":j.priority==="Med"?"amber":"gray"}>{j.priority}</Badge></td>
            <td>{j.last}</td>
            <td><button className="miniBtn"><ChevronRight size={14}/></button></td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="panel activityPanel">
        <div className="panelHead"><div><h3>Today's Activity</h3><p>Synced activity across the stack.</p></div></div>
        <div className="activityList">
          {[
            ["Alex Rivera uploaded 2 MHD logs","18m",Upload],
            ["EcuTek alert matched to Ryan Gallagher","31m",Mail],
            ["Carlos Mendez purchased S55 tune","Now",ShoppingBag],
            ["Mike Tremblay moved to Rev 2","46m",RefreshCw],
            ["Sarah Chen replied from Gmail","3h",MessageSquare],
            ["Jordan Patel completed vehicle intake","11m",CheckCircle2],
          ].map(([t,time,Icon])=><div className="activityRow" key={t}><div className="activityIcon"><Icon size={14}/></div><div><b>{t}</b><span>{time}</span></div></div>)}
        </div>
      </section>

      <section className="panel automation">
        <div className="panelHead"><div><h3>Automation / Onboarding</h3><p>What happens after a Wix purchase.</p></div></div>
        <div className="steps">
          {[
            ["1","Wix Order","Customer + order created","done"],
            ["2","Platform Intake","MHD / BM3 / EcuTek instructions","done"],
            ["3","Vehicle Form","2 waiting on customer","active"],
            ["4","Tune Queue","Moves to Doug automatically",""],
          ].map(([n,a,b,s])=><div className={`step ${s}`} key={n}><span>{n}</span><div><b>{a}</b><small>{b}</small></div></div>)}
        </div>
        <div className="chips"><Badge>Wix</Badge><Badge>Gmail</Badge><Badge>MHD</Badge><Badge tone="blue">BM3</Badge><Badge tone="purple">EcuTek</Badge></div>
      </section>

      <section className="panel logPanel">
        <div className="panelHead"><div><h3>Latest Log Snapshot</h3><p>Alex Rivera • MHD • Rev 4</p></div><button className="miniLink">Open Datazap <ExternalLink size={12}/></button></div>
        <div className="metrics">
          {[["Boost Target","24.0 psi",82],["Boost Actual","24.3 psi",84],["Lambda","0.81",78],["Max Timing Corr.","-1.5°",35],["HPFP Min","2,570 psi",88],["IAT Peak","118°F",62]].map(([a,b,w])=><div className="metric" key={a}><span>{a}</span><b>{b}</b><div><i style={{width:`${w}%`}} /></div></div>)}
        </div>
        <div className="insight"><CheckCircle2 size={16}/><div><b>Clean pull overall.</b><span>No throttle closure. Slight Cyl 4 correction around 5,700 RPM.</span></div></div>
      </section>
    </div>
  </div>
}

function GenericList({title,subtitle,kind}) {
  const list = kind==="customers" ? jobs : jobs.slice(0,6);
  return <div className="page">
    <div className="pageHead"><div><span className="eyebrow">{title.toUpperCase()}</span><h1>{title}</h1><p>{subtitle}</p></div></div>
    <section className="panel cardsPanel">
      <div className="cardsGrid">
        {list.map(j=><div className="customerCard" key={j.id}>
          <div className="cardTop"><div className="avatar small">{j.name.split(" ").map(x=>x[0]).join("")}</div><Badge tone={j.platform==="MHD"?"green":j.platform==="BM3"?"blue":"purple"}>{j.platform}</Badge></div>
          <h3>{j.name}</h3><p>{j.vehicle}</p>
          <div className="cardMeta"><span>{j.engine}</span><span>{j.fuel}</span><span>{j.rev}</span></div>
          <div className="cardBottom"><span>{j.status}</span><ChevronRight size={15}/></div>
        </div>)}
      </div>
    </section>
  </div>
}

function CalculatorView() {
  const [tank,setTank]=useState(15.6), [current,setCurrent]=useState(5), [currentE,setCurrentE]=useState(10), [e85,setE85]=useState(78), [target,setTarget]=useState(40);
  const add = Math.max(0,tank-current);
  const x = Math.max(0,Math.min(add, ((target*tank)-(currentE*current)-(10*add))/(e85-10)));
  const pump = Math.max(0,add-x);
  return <div className="page">
    <div className="pageHead"><div><span className="eyebrow">CUSTOMER TOOL</span><h1>E85 Calculator</h1><p>Built directly into the Subpar customer experience.</p></div></div>
    <div className="calculatorGrid">
      <section className="panel calcCard">
        <h3>Blend Calculator</h3>
        {[["Tank Capacity (gal)",tank,setTank],["Fuel Currently in Tank (gal)",current,setCurrent],["Current Ethanol %",currentE,setCurrentE],["Actual E85 Ethanol %",e85,setE85],["Target Ethanol %",target,setTarget]].map(([l,v,set])=><label key={l}><span>{l}</span><input type="number" value={v} onChange={e=>set(Number(e.target.value))}/></label>)}
      </section>
      <section className="panel resultCard">
        <span className="eyebrow">TARGET BLEND</span><strong>E{target}</strong>
        <div className="resultRows"><div><span>Add E85</span><b>{x.toFixed(2)} gal</b></div><div><span>Add Pump Gas</span><b>{pump.toFixed(2)} gal</b></div><div><span>Total Added</span><b>{add.toFixed(2)} gal</b></div></div>
        <div className="note"><AlertCircle size={15}/>Verify actual ethanol content before mixing. Calculator assumes pump gas is E10.</div>
      </section>
    </div>
  </div>
}

function WebsiteView() {
  return <div className="page websitePage">
    <div className="pageHead"><div><span className="eyebrow">WEBSITE REDESIGN</span><h1>SubparTuning.com</h1><p>Dark, cleaner, faster path from “I need a tune” to purchase and portal.</p></div></div>
    <section className="siteMock">
      <div className="siteTop"><div className="siteBrand"><img src="/subpar-logo.png"/><div><b>SUBPAR TUNING</b><span>Custom Calibration • Remote Tuning</span></div></div><div className="siteNav"><span>Custom Tuning</span><span>Platforms</span><span>Revisions</span><span>About</span><button>Customer Portal</button></div></div>
      <div className="siteHero">
        <div><span className="eyebrow">BMW • TOYOTA SUPRA • REMOTE CUSTOM TUNING</span><h2>Data-driven tuning.<br/><em>Built around your car.</em></h2><p>Custom calibration across MHD, bootmod3 and EcuTek — with a customer experience that keeps orders, revisions, logs, files and support in one place.</p><div className="siteBtns"><button className="btn primary">Shop Custom Tunes</button><button className="btn secondary">Customer Portal</button></div></div>
        <div className="siteLogoStage"><div></div><img src="/subpar-logo.png"/></div>
      </div>
      <div className="siteSection"><div className="sectionTitle"><div><span className="eyebrow">POPULAR CALIBRATIONS</span><h3>Find your platform.</h3></div></div>
        <div className="products">
          {[["S58","S58 Custom Tune","$850"],["B58 / B58TU","B58 Custom Tune","$650"],["S55","S55 Custom Tune","$750"],["N55","N55 Custom Tune","From $550"]].map(([e,n,p])=><div className="productCard" key={e}><span>{e}</span><h4>{n}</h4><p>Remote custom calibration with organized intake, revisions and log workflow.</p><b>{p}</b><div><Badge>MHD</Badge><Badge tone="blue">BM3</Badge></div></div>)}
        </div>
      </div>
    </section>
  </div>
}

function SettingsView() {
  const items=[["Wix","Orders, products, customer data and payment status."],["Gmail","Customer threads, automated onboarding and EcuTek email ingestion."],["MHD","Primary workflow: revisions, CSV logs, Datazap links and log summaries."],["bootmod3","Track project activity, links and customer status without replacing BM3."],["EcuTek","Ingest ECU Connect / cloud notifications into the correct order timeline."],["Datazap","Store/open log URLs from the same customer profile."]];
  return <div className="page"><div className="pageHead"><div><span className="eyebrow">INTEGRATIONS</span><h1>Settings</h1><p>Keep the platforms Doug already uses. Subpar OS organizes them.</p></div></div><div className="settingsGrid">{items.map(([a,b])=><section className="panel settingCard" key={a}><div className="settingIcon"><Gauge size={18}/></div><h3>{a}</h3><p>{b}</p><button className="btn secondary">Configure</button></section>)}</div></div>
}

export default function Home() {
  const [active,setActive]=useState("dashboard");
  const [search,setSearch]=useState("");
  const content = useMemo(()=>{
    if(active==="dashboard") return <Dashboard setActive={setActive}/>;
    if(active==="customers") return <GenericList title="Customers" subtitle="Customer, vehicle, order and tune history in one record." kind="customers"/>;
    if(active==="garage") return <GenericList title="Vehicle Garage" subtitle="Persistent history for every car Doug has tuned."/>;
    if(active==="logs") return <GenericList title="Datalog Reviews" subtitle="Newest logs across MHD, BM3 and EcuTek."/>;
    if(active==="orders") return <GenericList title="New Orders" subtitle="Wix purchases waiting for intake or routing."/>;
    if(active==="revisions") return <GenericList title="Tune Revisions" subtitle="Files in progress or ready to deliver."/>;
    if(active==="projects") return <GenericList title="Active Projects" subtitle="Every open tune, organized by current action."/>;
    if(active==="calculator") return <CalculatorView/>;
    if(active==="website") return <WebsiteView/>;
    if(active==="settings") return <SettingsView/>;
    return <GenericList title={nav.find(x=>x[0]===active)?.[1] || "Subpar OS"} subtitle="This workflow is ready for live integration data."/>;
  },[active]);

  return <div className="shell">
    <Sidebar active={active} setActive={setActive}/>
    <main className="main">
      <Header active={active} search={search} setSearch={setSearch}/>
      {content}
    </main>
  </div>
}

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Database, FileStack, GitBranch, LockKeyhole, Radio, Server, ShieldCheck, Workflow } from "lucide-react";
import { getDashboardData, getProjectById, getSystemData } from "../server/repository";
import styles from "./data-core.module.css";

const apiRoutes = [
  ["GET","/api/v1/dashboard","Dashboard snapshot"],
  ["GET","/api/v1/projects","Project collection + filters"],
  ["GET","/api/v1/projects/SP-1842","Hydrated project record"],
  ["GET","/api/v1/customers","Customer + vehicle/project relations"],
  ["GET","/api/v1/vehicles","Vehicle + customer/project relations"],
  ["GET","/api/v1/system","Data mode + integration state"],
  ["POST","/api/v1/actions","Guarded dry-run mutations"],
];

export default async function DataCorePage() {
  const system = await getSystemData();
  const dashboard = await getDashboardData();
  const alex = await getProjectById("SP-1842");

  const layers = [
    [Database,"Normalized records","Customers, vehicles, orders and tune projects now have durable IDs and explicit relationships."],
    [GitBranch,"Tune history","Requirements, revisions, logs, files, messages and events hang from the same project instead of separate screen state."],
    [Workflow,"Repository boundary","UI/API code talks to one repository contract. Demo data can later be swapped for Supabase without redesigning every screen."],
    [ShieldCheck,"Mutation guard","Writes are dry-run only in preview. No customer email, revision publish or status mutation can silently become live."],
    [LockKeyhole,"RLS-first schema","The proposed Postgres migration enables row-level security before any customer browser access is allowed."],
    [Radio,"Integration-ready","Webhook receipt/idempotency and sync-state tables are defined before Wix/Gmail ingestion is enabled."],
  ];

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>DATA CORE</span></div></div>
      <Link href="/audit" className={styles.audit}>Open product audit <ChevronRight size={13}/></Link>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>PRODUCTION FOUNDATION • PHASE 1</span><h1>One data model behind the whole tuning workflow.</h1><p>The current UI still uses synthetic records, but the app now has a server-side data boundary and normalized project model underneath it. This is the layer that Supabase, Wix, Gmail and file storage will plug into.</p></div>
      <div className={styles.mode}><span>DATA MODE</span><b>{system.configuredMode.toUpperCase()}</b><small>{system.mutationMode} mutations</small></div>
    </section>

    <section className={styles.counts}>{Object.entries(system.counts).map(([key,value])=><div key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><b>{value}</b></div>)}</section>

    <section className={styles.grid}>
      <div className={styles.main}>
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>DATA ARCHITECTURE</span><h2>Foundation now in place</h2></div><CheckCircle2 size={20}/></div><div className={styles.layers}>{layers.map(([Icon,title,body])=><article key={title}><div className={styles.icon}><Icon size={17}/></div><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>

        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>API SURFACE</span><h2>Versioned server endpoints</h2></div><Server size={20}/></div><div className={styles.api}>{apiRoutes.map(([method,path,desc])=><a href={method==="GET"?path:undefined} key={path} className={styles.apiRow}><span className={method==="GET"?styles.get:styles.post}>{method}</span><code>{path}</code><p>{desc}</p>{method==="GET"&&<ChevronRight size={13}/>}</a>)}</div></section>
      </div>

      <aside className={styles.side}>
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>HYDRATED PROJECT</span><h2>{alex.projectNumber}</h2></div><FileStack size={19}/></div><div className={styles.project}><h3>{alex.customer.name}</h3><p>{alex.vehicle.year} {alex.vehicle.make} {alex.vehicle.model}</p><div><span>Chassis</span><b>{alex.vehicle.chassis}</b></div><div><span>Engine</span><b>{alex.vehicle.engine}</b></div><div><span>Platform</span><b>{alex.platform}</b></div><div><span>Revision</span><b>Rev {alex.currentRevision}</b></div><div><span>Requirements</span><b>{alex.requirements.length}</b></div><div><span>Logs</span><b>{alex.logs.length}</b></div><div><span>Files</span><b>{alex.files.length}</b></div><div><span>Messages</span><b>{alex.messages.length}</b></div></div><a className={styles.button} href="/api/v1/projects/SP-1842">Inspect API record <ChevronRight size={13}/></a></section>

        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>QUEUE SNAPSHOT</span><h2>Server-derived state</h2></div></div><div className={styles.snapshot}>{Object.entries(dashboard.counts).map(([key,value])=><div key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><b>{value}</b></div>)}</div></section>
      </aside>
    </section>

    <section className={styles.next}><div><span className={styles.eyebrow}>NEXT CONNECTION</span><h2>Swap the demo repository for isolated Supabase persistence.</h2><p>The database migration, environment boundaries and API contract are ready. Live mode stays off until the Subpar-only Supabase project and real-data approval are in place.</p></div><div className={styles.sequence}>{["Create isolated Supabase project","Run core migration","Add server-only adapter","Seed synthetic records","Then connect Wix + Gmail"].map((item,index)=><div key={item}><span>{index+1}</span><b>{item}</b></div>)}</div></section>
  </main>;
}

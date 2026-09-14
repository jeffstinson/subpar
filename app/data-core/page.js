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
  ["GET","/api/v1/readiness","Persistence + environment readiness"],
  ["POST","/api/v1/actions","Guarded dry-run mutations"],
];

export default async function DataCorePage() {
  const system = await getSystemData();
  const dashboard = await getDashboardData();
  const alex = await getProjectById("SP-1842");

  const layers = [
    [Database,"Normalized records","Customers, vehicles, orders and tune projects have durable IDs and explicit relationships."],
    [GitBranch,"Tune history","Requirements, revisions, logs, files, messages and events hang from the same project instead of separate screen state."],
    [Workflow,"Repository boundary","The same server contract now supports demo-memory or a dedicated Supabase adapter."],
    [ShieldCheck,"Mutation guard","Reads can switch to Supabase while writes remain dry-run. No customer email, revision publish or status mutation silently becomes live."],
    [LockKeyhole,"RLS-first schema","The Postgres migration enables row-level security before any customer browser access is allowed."],
    [Radio,"Integration-ready","Webhook receipt/idempotency and sync-state tables exist before Wix/Gmail ingestion is enabled."],
  ];

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>DATA CORE</span></div></div>
      <Link href="/persistence" className={styles.audit}>Persistence readiness <ChevronRight size={13}/></Link>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>PRODUCTION FOUNDATION • PHASE 2</span><h1>One data model. Swappable persistence.</h1><p>The app now has a normalized project model and repository boundary plus a server-only Supabase adapter. The preview remains synthetic, but the exact same API can read from real Postgres once the isolated Subpar environment is provisioned.</p></div>
      <div className={styles.mode}><span>DATA MODE</span><b>{system.configuredMode.toUpperCase()}</b><small>{system.mutationMode} mutations</small></div>
    </section>

    <section className={styles.counts}>{Object.entries(system.counts || {}).map(([key,value])=><div key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><b>{value}</b></div>)}</section>

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

    <section className={styles.next}><div><span className={styles.eyebrow}>NEXT CONNECTION</span><h2>Provision the isolated Subpar Supabase project, then prove parity with fake data.</h2><p>The adapter, deterministic synthetic seed, migration and environment checks are now ready. Real customer data stays off until that entire path is verified.</p></div><div className={styles.sequence}>{["Create isolated Supabase project","Run core migration","Set server credentials","Run deterministic demo seed","Switch reads to Supabase","Verify parity with writes still off"].map((item,index)=><div key={item}><span>{index+1}</span><b>{item}</b></div>)}</div></section>
  </main>;
}

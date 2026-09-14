import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Database, KeyRound, LockKeyhole, Server, ShieldCheck, TriangleAlert } from "lucide-react";
import { getReadinessData } from "../server/repository";
import styles from "./persistence.module.css";

export default async function PersistencePage() {
  const r = await getReadinessData();
  const checks = [
    ["Repository adapter", r.repositoryAdapter, true],
    ["Supabase configuration", r.supabaseConfigured ? "Configured" : "Waiting on environment", r.supabaseConfigured],
    ["Database connectivity", r.connectivity, r.connectivity === "ok"],
    ["Persistent mutations", r.mutationsEnabled ? "Enabled" : "Dry-run only", false],
    ["Synthetic seed gate", r.syntheticSeedAllowed ? "Allowed" : "Locked", r.syntheticSeedAllowed],
    ["Real customer data", "Explicitly disabled", false],
  ];

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PERSISTENCE READINESS</span></div></div>
      <Link href="/data-core" className={styles.link}>Data Core <ChevronRight size={13}/></Link>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>PHASE 2 • SUPABASE ADAPTER</span><h1>Ready to prove persistence with synthetic data.</h1><p>The repository can now run from demo memory or a dedicated Subpar Supabase project. Live customer data and outbound actions remain locked until the environment, migration and synthetic seed are validated.</p></div>
      <div className={styles.mode}><span>CURRENT MODE</span><b>{r.mode.toUpperCase()}</b><small>{r.repositoryAdapter}</small></div>
    </section>

    <section className={styles.grid}>
      <div className={styles.main}>
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>READINESS CHECKS</span><h2>Persistence gate</h2></div><Database size={20}/></div><div className={styles.checks}>{checks.map(([label,value,pass])=><div key={label}><span className={pass?styles.pass:styles.wait}>{pass?<CheckCircle2 size={15}/>:<TriangleAlert size={15}/>}</span><div><b>{label}</b><small>{value}</small></div></div>)}</div></section>

        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>SWITCHOVER SEQUENCE</span><h2>Demo → Supabase</h2></div><Server size={20}/></div><div className={styles.steps}>{[
          "Create a dedicated Subpar Supabase project",
          "Run supabase/migrations/0001_core.sql",
          "Set server-only Supabase URL + service-role key",
          "Temporarily allow the synthetic seed",
          "Run supabase/seed/0001_demo.sql",
          "Set SUBPAR_DATA_MODE=supabase with mutations still disabled",
          "Verify API/dashboard parity before enabling any writes"
        ].map((step,index)=><div key={step}><span>{index+1}</span><b>{step}</b></div>)}</div></section>
      </div>

      <aside className={styles.side}>
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>ENVIRONMENT</span><h2>Required server config</h2></div><KeyRound size={19}/></div><div className={styles.env}>{Object.entries(r.required).map(([name,ready])=><div key={name}><span>{name}</span><b className={ready?styles.good:styles.missing}>{ready?"SET":"MISSING"}</b></div>)}</div>{r.missing.length>0&&<div className={styles.notice}>Nothing is broken — Supabase simply has not been connected to this deployment yet.</div>}</section>

        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>SAFETY</span><h2>Hard boundaries</h2></div><ShieldCheck size={19}/></div><div className={styles.safety}><div><LockKeyhole size={15}/><span>Service-role key stays server-only</span></div><div><LockKeyhole size={15}/><span>RLS is enabled by migration</span></div><div><LockKeyhole size={15}/><span>Writes remain dry-run</span></div><div><LockKeyhole size={15}/><span>Real-data gate remains closed</span></div></div></section>

        <a href="/api/v1/readiness" className={styles.api}>Inspect readiness API <ChevronRight size={13}/></a>
      </aside>
    </section>
  </main>;
}

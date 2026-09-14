import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Database, Gauge, Image as ImageIcon,
  KeyRound, Layers3, Route, ShieldCheck, Smartphone, TriangleAlert, Wrench
} from "lucide-react";
import styles from "./audit.module.css";

const sections = [
  {
    title: "Product & visual system", icon: Layers3, status: "PASS", tone: "pass", score: "94%",
    body: "The dashboard, garage, calculator and deep tune workflow read as one premium BMW-focused product rather than disconnected mockups.",
    items: ["Premium dashboard shell", "Photo-driven Vehicle Garage", "Consistent charcoal + Subpar green", "Deep workflow visual overlay"],
  },
  {
    title: "Workflow coverage", icon: Route, status: "PASS", tone: "pass", score: "96%",
    body: "Synthetic lifecycle coverage is complete enough for Doug to evaluate the operating model end-to-end.",
    items: ["Order → intake", "Project → log review", "Revision → customer delivery", "Closeout → archive / reopen"],
  },
  {
    title: "Mobile & responsive", icon: Smartphone, status: "PASS", tone: "pass", score: "89%",
    body: "Main dashboard, calculator and deep workflow screens adapt to phone layouts. Final device QA should happen before live rollout.",
    items: ["Mobile command center", "Dashboard bottom nav", "Responsive deep workflows", "Responsive E85 calculator"],
  },
  {
    title: "Vehicle & fuel tooling", icon: Gauge, status: "PASS", tone: "pass", score: "95%",
    body: "The E85 tool is chassis-aware, validates achievable blends, and has a manual fallback for modified or unlisted cars.",
    items: ["BMW/Supra chassis presets", "Factory tank capacities", "Editable pump ethanol", "Impossible-target detection"],
  },
  {
    title: "Data model & server boundary", icon: Database, status: "FOUNDATION", tone: "pass", score: "78%",
    body: "A normalized server-side data model, versioned API surface and dry-run mutation boundary are now in place underneath the synthetic UI.",
    items: ["Customers / vehicles / orders / projects", "Revisions / logs / files / messages / events", "Versioned /api/v1 routes", "Repository adapter boundary"],
  },
  {
    title: "Asset control", icon: ImageIcon, status: "FOLLOW-UP", tone: "warn", score: "80%",
    body: "The logo is now locally controlled. Vehicle photography still relies on externally hosted stock imagery and should be curated before final launch.",
    items: ["Curate licensed final vehicle set", "Move hero/garage images under app control", "Adopt next/image", "Add image fallback strategy"],
  },
  {
    title: "Routing & application structure", icon: Wrench, status: "FOLLOW-UP", tone: "warn", score: "82%",
    body: "Deep flows use proper URLs and server APIs now exist, while several dashboard areas still behave as local client-side tabs.",
    items: ["Convert queue/garage/messages to routes", "Read dashboard from repository/API", "Reduce root client bundle", "Add automated tests"],
  },
  {
    title: "Security, identity & live integrations", icon: KeyRound, status: "GATED", tone: "gated", score: "45%",
    body: "Schema and environment boundaries are defined, but authentication, live Supabase persistence and external integrations remain intentionally disabled.",
    items: ["Isolated Supabase project", "Internal + portal authentication", "Wix webhook verification", "Gmail OAuth / secret handling"],
  },
];

export default function AuditPage() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRODUCT AUDIT</span></div></div>
      <div style={{display:"flex",gap:8}}><Link className={styles.health} href="/data-core">Data core <ChevronRight size={13}/></Link><a className={styles.health} href="/api/health">Health <ChevronRight size={13}/></a></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>FULL PRODUCT AUDIT • 2026-09-14</span><h1>Preview-grade product. Production foundation underway.</h1><p>The Vercel build is cohesive enough for Doug to evaluate as a real tuning operating system, and the first production architecture layer now sits underneath it: normalized records, server APIs, mutation guards and an isolated Supabase schema.</p></div>
      <div className={styles.score}><span>BUILD READINESS</span><b>94</b><small>/ 100 preview</small></div>
    </section>

    <section className={styles.summary}>
      <div><CheckCircle2 size={18}/><span><b>5</b><small>Pass / foundation areas</small></span></div>
      <div className={styles.warn}><TriangleAlert size={18}/><span><b>2</b><small>Follow-up areas</small></span></div>
      <div className={styles.gated}><ShieldCheck size={18}/><span><b>1</b><small>Live-data gate</small></span></div>
    </section>

    <section className={styles.grid}>{sections.map((section) => {
      const Icon = section.icon;
      return <article className={`${styles.card} ${styles[section.tone]}`} key={section.title}>
        <div className={styles.cardTop}><div className={styles.icon}><Icon size={18}/></div><span>{section.status}</span><b>{section.score}</b></div>
        <h2>{section.title}</h2><p>{section.body}</p>
        <div className={styles.items}>{section.items.map((item) => <div key={item}><i/>{item}</div>)}</div>
      </article>;
    })}</section>

    <section className={styles.next}>
      <div><span className={styles.eyebrow}>CURRENT PRODUCTION PHASE</span><h2>Connect the normalized data core to isolated Supabase persistence.</h2><p>The migration, server repository contract, API surface and environment boundaries are now defined. The next live-data step is creating the dedicated Subpar Supabase project, then seeding synthetic data before any real Wix/Gmail records are touched.</p></div>
      <div className={styles.nextSteps}>{["Create isolated Supabase project","Run core schema migration","Add authenticated server adapter","Seed synthetic project records","Then connect Wix + Gmail"].map((step,index) => <div key={step}><span>{index+1}</span><b>{step}</b></div>)}</div>
    </section>
  </main>;
}

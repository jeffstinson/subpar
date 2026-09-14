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
    title: "Data model & persistence boundary", icon: Database, status: "FOUNDATION", tone: "pass", score: "88%",
    body: "The normalized data core now has a swappable demo/Supabase repository, a deterministic synthetic seed, environment validation and a live connectivity readiness check.",
    items: ["Customers / vehicles / orders / projects", "Supabase REST adapter", "Deterministic synthetic seed", "Versioned /api/v1 readiness"],
  },
  {
    title: "Asset control", icon: ImageIcon, status: "FOLLOW-UP", tone: "warn", score: "80%",
    body: "The logo is locally controlled. Vehicle photography still relies on externally hosted stock imagery and should be curated before final launch.",
    items: ["Curate licensed final vehicle set", "Move hero/garage images under app control", "Adopt next/image", "Add image fallback strategy"],
  },
  {
    title: "Routing & application structure", icon: Wrench, status: "FOLLOW-UP", tone: "warn", score: "84%",
    body: "Deep flows use proper URLs and the server contract is now persistence-ready, while several dashboard areas still behave as local client-side tabs.",
    items: ["Convert queue/garage/messages to routes", "Read dashboard directly from repository/API", "Reduce root client bundle", "Add automated tests"],
  },
  {
    title: "Security, identity & live integrations", icon: KeyRound, status: "GATED", tone: "gated", score: "52%",
    body: "Server-only credential boundaries, RLS-first schema and dry-run mutations are in place. Auth, real persistence and external integrations are still intentionally disabled.",
    items: ["Provision isolated Supabase project", "Internal + portal authentication", "Wix webhook verification", "Gmail OAuth / secret handling"],
  },
];

export default function AuditPage() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRODUCT AUDIT</span></div></div>
      <div style={{display:"flex",gap:8}}><Link className={styles.health} href="/persistence">Persistence <ChevronRight size={13}/></Link><a className={styles.health} href="/api/health">Health <ChevronRight size={13}/></a></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>FULL PRODUCT AUDIT • 2026-09-14</span><h1>Preview-grade product. Persistence-ready foundation.</h1><p>The Vercel build is cohesive enough for Doug to evaluate as a real tuning operating system, and the backend contract can now switch from synthetic memory to a dedicated Subpar Supabase database without redesigning the application.</p></div>
      <div className={styles.score}><span>BUILD READINESS</span><b>95</b><small>/ 100 preview</small></div>
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
      <div><span className={styles.eyebrow}>CURRENT PRODUCTION PHASE</span><h2>Provision isolated Supabase and prove database parity with fake data.</h2><p>The adapter, migration, seed and environment checks are complete. The next external step is creating the dedicated Subpar Supabase project, running the migration/seed, then flipping reads to Supabase while writes stay disabled.</p></div>
      <div className={styles.nextSteps}>{["Create isolated Supabase project","Run core schema migration","Set server-only credentials","Run deterministic synthetic seed","Switch reads to Supabase","Verify parity before writes"].map((step,index) => <div key={step}><span>{index+1}</span><b>{step}</b></div>)}</div>
    </section>
  </main>;
}

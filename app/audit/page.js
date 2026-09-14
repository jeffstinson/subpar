import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Database, Gauge, Image as ImageIcon,
  KeyRound, Layers3, Route, ShieldCheck, Smartphone, TriangleAlert, Wrench
} from "lucide-react";
import styles from "./audit.module.css";

const sections = [
  {
    title: "Product & visual system",
    icon: Layers3,
    status: "PASS",
    tone: "pass",
    score: "92%",
    body: "The dashboard, garage and deep tune workflow now read as one premium BMW-focused product rather than disconnected mockups.",
    items: ["Premium dashboard shell", "Photo-driven Vehicle Garage", "Consistent charcoal + Subpar green", "Deep workflow visual overlay"],
  },
  {
    title: "Workflow coverage",
    icon: Route,
    status: "PASS",
    tone: "pass",
    score: "95%",
    body: "Synthetic lifecycle coverage is complete enough for Doug to evaluate the operating model end-to-end.",
    items: ["Order → intake", "Project → log review", "Revision → customer delivery", "Closeout → archive / reopen"],
  },
  {
    title: "Mobile & responsive",
    icon: Smartphone,
    status: "PASS",
    tone: "pass",
    score: "88%",
    body: "Main dashboard, calculator and deep workflow screens adapt to phone layouts. Final device QA should happen before live rollout.",
    items: ["Mobile command center", "Dashboard bottom nav", "Responsive deep workflows", "Responsive E85 calculator"],
  },
  {
    title: "Vehicle & fuel tooling",
    icon: Gauge,
    status: "PASS",
    tone: "pass",
    score: "94%",
    body: "The E85 tool is now chassis-aware, validates achievable blends, and has a manual fallback for modified or unlisted cars.",
    items: ["BMW/Supra chassis presets", "Factory tank capacities", "Editable pump ethanol", "Impossible-target detection"],
  },
  {
    title: "Asset control",
    icon: ImageIcon,
    status: "FOLLOW-UP",
    tone: "warn",
    score: "72%",
    body: "The current photography is strong enough for the preview but relies on externally hosted stock imagery.",
    items: ["Curate licensed final vehicle set", "Move hero/garage images under app control", "Adopt next/image", "Replace logo compatibility redirect"],
  },
  {
    title: "Routing & application structure",
    icon: Wrench,
    status: "FOLLOW-UP",
    tone: "warn",
    score: "78%",
    body: "Deep flows use proper URLs, while several main dashboard sections still behave as local client-side tabs.",
    items: ["Convert queue/garage/messages to routes", "Reduce root client bundle", "Share one project state model", "Add automated tests"],
  },
  {
    title: "Persistence & integrations",
    icon: Database,
    status: "GATED",
    tone: "gated",
    score: "35%",
    body: "Real persistence is intentionally not connected yet. The next major build phase is isolated Subpar storage/auth plus Wix and Gmail.",
    items: ["Supabase project", "Wix paid-order webhooks", "Gmail sync/send", "Tune/log file storage"],
  },
  {
    title: "Security & identity",
    icon: KeyRound,
    status: "GATED",
    tone: "gated",
    score: "30%",
    body: "The demo is low-risk because it uses synthetic data. Customer authentication, authorization and secret handling are required before live data.",
    items: ["Internal authentication", "Customer portal auth", "Row-level permissions", "Webhook verification / rate limits"],
  },
];

export default function AuditPage() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRODUCT AUDIT</span></div></div>
      <a className={styles.health} href="/api/health">Health endpoint <ChevronRight size={13}/></a>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>FULL PRODUCT AUDIT • 2026-09-14</span><h1>Strong preview. Clear production path.</h1><p>The current Vercel build is cohesive enough for Doug to evaluate the product as a real tuning operating system. The remaining work is mostly persistence, integrations, routing cleanup and production hardening—not another round of disconnected screens.</p></div>
      <div className={styles.score}><span>PREVIEW READINESS</span><b>91</b><small>/ 100</small></div>
    </section>

    <section className={styles.summary}>
      <div><CheckCircle2 size={18}/><span><b>4</b><small>PASS areas</small></span></div>
      <div className={styles.warn}><TriangleAlert size={18}/><span><b>2</b><small>Follow-up areas</small></span></div>
      <div className={styles.gated}><ShieldCheck size={18}/><span><b>2</b><small>Live-data gates</small></span></div>
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
      <div><span className={styles.eyebrow}>RECOMMENDED NEXT PHASE</span><h2>Move the same product from synthetic state into a persistent Subpar backend.</h2><p>After Doug signs off on workflow and terminology: create isolated Supabase auth/database/storage, then connect Wix orders, Gmail communication, file storage and MHD-first log ingestion.</p></div>
      <div className={styles.nextSteps}>{["Supabase + auth + storage","Wix paid-order ingestion","Gmail sync / send","MHD parser + file workflow"].map((step,index) => <div key={step}><span>{index+1}</span><b>{step}</b></div>)}</div>
    </section>
  </main>;
}

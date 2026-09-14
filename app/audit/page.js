import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Database, Gauge, Image as ImageIcon,
  KeyRound, Layers3, Radio, Route, ShieldCheck, Smartphone, TriangleAlert, Wrench
} from "lucide-react";
import styles from "./audit.module.css";

const sections = [
  {
    title: "Product & visual system", icon: Layers3, status: "PASS", tone: "pass", score: "94%",
    body: "The dashboard, garage, calculator and deep tune workflow read as one premium BMW-focused product rather than disconnected mockups.",
    items: ["Premium dashboard shell", "Photo-driven Vehicle Garage", "Consistent charcoal + Subpar green", "Deep workflow visual overlay"],
  },
  {
    title: "Workflow coverage", icon: Route, status: "PASS", tone: "pass", score: "98%",
    body: "The operating model now spans paid order through intake, tuning, datalog review, controlled revision delivery, closeout, permanent vehicle history and future retune cycles.",
    items: ["Order → intake", "Project → log review", "Revision → controlled delivery", "Closeout → archive → retune cycle"],
  },
  {
    title: "Mobile & responsive", icon: Smartphone, status: "PASS", tone: "pass", score: "89%",
    body: "Main dashboard, calculator and deep workflow screens adapt to phone layouts. Final device QA should happen before live rollout.",
    items: ["Mobile command center", "Dashboard bottom nav", "Responsive deep workflows", "Responsive E85 calculator"],
  },
  {
    title: "Vehicle & fuel tooling", icon: Gauge, status: "PASS", tone: "pass", score: "95%",
    body: "Vehicle intelligence and the E85 tool understand the BMW/Supra operating context while preserving explicit manual review for unknown or modified combinations.",
    items: ["BMW/Supra chassis intelligence", "Engine/platform workflow mapping", "Chassis-aware E85 calculator", "Manual-review fallbacks"],
  },
  {
    title: "Data model & persistence boundary", icon: Database, status: "FOUNDATION", tone: "pass", score: "95%",
    body: "The normalized data core now includes tune-cycle boundaries, closeout history and an ordered 15-migration production schema with a swappable demo/Supabase repository.",
    items: ["Customer / vehicle / order / project core", "Cycle-scoped revisions/logs/files", "Deterministic synthetic seed", "Schema head 0015"],
  },
  {
    title: "Identity, sessions & private files", icon: KeyRound, status: "FOUNDATION", tone: "pass", score: "95%",
    body: "Team/customer login, verified memberships, protected route boundaries, private buckets, immutable tune artifacts and signed archive downloads are modeled before real data is allowed.",
    items: ["Owner / tuner / staff roles", "Customer-scoped portal identity", "Default-deny protected routes", "Private current + archived tune delivery"],
  },
  {
    title: "Integration staging", icon: Radio, status: "FOUNDATION", tone: "pass", score: "93%",
    body: "Wix and Gmail have replay-safe staging, resumable historical imports, independent read/apply/send gates and connection probes that can be proven before ingestion is enabled.",
    items: ["Signed Wix JWT + receipt ledger", "Resumable historical imports", "Gmail history/thread model", "Draft → approval → provider-send boundary"],
  },
  {
    title: "Production activation & integrity", icon: ShieldCheck, status: "FOUNDATION", tone: "pass", score: "95%",
    body: "The owner-only Activation Center separates code readiness, infrastructure readiness and live-data readiness, then verifies cross-cycle/file invariants before a guarded production checkpoint can pass.",
    items: ["Operational integrity RPC", "Persisted audit evidence", "Provider connection evidence", "Guarded production_activation checkpoint"],
  },
  {
    title: "Asset control", icon: ImageIcon, status: "FOLLOW-UP", tone: "warn", score: "80%",
    body: "The logo is locally controlled. Vehicle photography still relies on externally hosted stock imagery and should be curated before final launch.",
    items: ["Curate licensed final vehicle set", "Move hero/garage images under app control", "Adopt next/image", "Add image fallback strategy"],
  },
  {
    title: "Routing & application structure", icon: Wrench, status: "FOLLOW-UP", tone: "warn", score: "90%",
    body: "Deep flows, access controls and server APIs use proper URLs, while several legacy dashboard sections still behave as local client-side tabs and should be reduced after cutover.",
    items: ["Convert remaining local tabs to routes", "Read more dashboard sections from repository/API", "Reduce root client bundle", "Add CI-level automated tests"],
  },
  {
    title: "Live integrations & production data", icon: ShieldCheck, status: "GATED", tone: "gated", score: "76%",
    body: "The application-side cutover controls are built, but dedicated Supabase, real Doug/customer identities, historical reconciliation and provider proof still have to happen before real customer operations are unlocked.",
    items: ["Provision isolated Supabase", "Run migrations 0001–0015", "Pass /activation with real infrastructure", "Enable Gmail provider send last"],
  },
];

export default function AuditPage() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRODUCT AUDIT</span></div></div>
      <div style={{display:"flex",gap:8}}><Link className={styles.health} href="/activation">Activation <ChevronRight size={13}/></Link><Link className={styles.health} href="/go-live">Go Live <ChevronRight size={13}/></Link><Link className={styles.health} href="/security">Security <ChevronRight size={13}/></Link><a className={styles.health} href="/api/health">Health <ChevronRight size={13}/></a></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>FULL PRODUCT AUDIT • 2026-09-14</span><h1>Feature-complete core. Activation-gated production foundation.</h1><p>Subpar OS now covers the tuning lifecycle itself and the machinery needed to introduce real infrastructure safely. The remaining work is primarily provisioning, evidence-based validation, historical reconciliation, device QA and controlled provider cutover—not redesigning the core workflow.</p></div>
      <div className={styles.score}><span>PREVIEW READINESS</span><b>98</b><small>/ 100 preview</small></div>
    </section>

    <section className={styles.summary}>
      <div><CheckCircle2 size={18}/><span><b>8</b><small>Pass / foundation areas</small></span></div>
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
      <div><span className={styles.eyebrow}>NEXT EXTERNAL GATE</span><h2>Provision the isolated stack, then make `/activation` earn the green light.</h2><p>The safe path is now explicit: migrations and private storage, real auth identities, synthetic end-to-end proof, provider connection tests, historical reconciliation, live reads, controlled applies, Gmail send last, then the guarded production activation checkpoint.</p></div>
      <div className={styles.nextSteps}>{["Create isolated Supabase project","Run migrations 0001–0015","Prove identities + private storage","Record synthetic end-to-end pass","Run Wix/Gmail provider preflight","Reconcile historical imports","Enable live reads before writes","Pass guarded production activation"].map((step,index) => <div key={step}><span>{index+1}</span><b>{step}</b></div>)}</div>
    </section>
  </main>;
}

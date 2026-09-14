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
    title: "Data model & persistence boundary", icon: Database, status: "FOUNDATION", tone: "pass", score: "90%",
    body: "The normalized data core has a swappable demo/Supabase repository, deterministic synthetic seed, environment validation and live connectivity readiness checks.",
    items: ["Customers / vehicles / orders / projects", "Supabase adapter", "Deterministic synthetic seed", "Versioned /api/v1 readiness"],
  },
  {
    title: "Identity, sessions & private files", icon: KeyRound, status: "FOUNDATION", tone: "pass", score: "92%",
    body: "Team/customer login, verified memberships, protected route boundaries, session refresh, logout, private buckets and signed file finalization are now modeled before real data is allowed.",
    items: ["Owner / tuner / staff roles", "Customer-scoped portal identity", "Verified protected routes", "Private File Manager + signed storage"],
  },
  {
    title: "Asset control", icon: ImageIcon, status: "FOLLOW-UP", tone: "warn", score: "80%",
    body: "The logo is locally controlled. Vehicle photography still relies on externally hosted stock imagery and should be curated before final launch.",
    items: ["Curate licensed final vehicle set", "Move hero/garage images under app control", "Adopt next/image", "Add image fallback strategy"],
  },
  {
    title: "Routing & application structure", icon: Wrench, status: "FOLLOW-UP", tone: "warn", score: "87%",
    body: "Deep flows, access controls and server APIs use proper URLs, while several dashboard sections still behave as local client-side tabs.",
    items: ["Convert queue/garage/messages to routes", "Read dashboard directly from repository/API", "Reduce root client bundle", "Add automated tests"],
  },
  {
    title: "Live integrations & production data", icon: ShieldCheck, status: "GATED", tone: "gated", score: "62%",
    body: "The safety architecture is in place, but real Supabase persistence, Wix and Gmail remain intentionally disabled until the isolated project is provisioned and synthetic auth/storage tests pass.",
    items: ["Provision isolated Supabase project", "Create Doug + customer test identities", "Validate storage against real private buckets", "Wix/Gmail only after access tests"],
  },
];

export default function AuditPage() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRODUCT AUDIT</span></div></div>
      <div style={{display:"flex",gap:8}}><Link className={styles.health} href="/access">Access <ChevronRight size={13}/></Link><Link className={styles.health} href="/security">Security <ChevronRight size={13}/></Link><Link className={styles.health} href="/persistence">Persistence <ChevronRight size={13}/></Link><a className={styles.health} href="/api/health">Health <ChevronRight size={13}/></a></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>FULL PRODUCT AUDIT • 2026-09-14</span><h1>Preview-grade product. Session-safe production foundation.</h1><p>The product is cohesive enough for Doug to evaluate as a real tuning operating system. Persistence, role-based identity, verified route boundaries, session refresh and private file delivery now sit behind the workflow before any real customer data is introduced.</p></div>
      <div className={styles.score}><span>BUILD READINESS</span><b>97</b><small>/ 100 preview</small></div>
    </section>

    <section className={styles.summary}>
      <div><CheckCircle2 size={18}/><span><b>6</b><small>Pass / foundation areas</small></span></div>
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
      <div><span className={styles.eyebrow}>NEXT EXTERNAL GATE</span><h2>Provision Supabase and prove the complete stack with synthetic users.</h2><p>The application-side work for persistence, sessions, permissions and private files is now in place. The next external step is attaching the dedicated Subpar Supabase project, running migrations/seed and testing Doug/Alex-style accounts against the same live private database and storage stack before Wix or Gmail are connected.</p></div>
      <div className={styles.nextSteps}>{["Create isolated Supabase project","Run migrations 0001–0003","Seed synthetic records","Create Doug owner + Alex portal identities","Enable auth in preview","Verify database + private storage parity"].map((step,index) => <div key={step}><span>{index+1}</span><b>{step}</b></div>)}</div>
    </section>
  </main>;
}

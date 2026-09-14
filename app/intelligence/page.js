import Link from "next/link";
import { ArrowLeft, Bot, ChevronRight, Cpu, Database, ShieldCheck, Sparkles } from "lucide-react";
import IntelligenceClient from "./intelligence-client";
import { getVehicleIntelligenceCatalogServer } from "../server/intelligence-store";
import styles from "./intelligence.module.css";

export default async function IntelligencePage(){
  const catalog=await getVehicleIntelligenceCatalogServer();
  const summary=catalog.summary;
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>VEHICLE INTELLIGENCE</span></div></div>
      <div className={styles.links}><Link href="/automations">Automation Studio <ChevronRight size={13}/></Link><Link href="/intake-queue">Intake Queue <ChevronRight size={13}/></Link></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>CHASSIS → ENGINE → PLATFORM → WORKFLOW</span><h1>The car should configure the project.</h1><p>Subpar OS resolves the vehicle and tuning platform into the exact prerequisites, logging recipe, parameter-pack profile and automation path Doug expects. ROM/DME eligibility remains an explicit tuner approval—not an assumption.</p><div className={styles.heroMeta}><span><Database size={13}/>{summary.vehicles} curated chassis presets</span><span><Cpu size={13}/>{summary.engines.length} engine families</span><span><Bot size={13}/>{summary.platforms.length} tuning platforms</span><span><Database size={13}/>{catalog.source} source</span></div></div>
      <div className={styles.score}><Sparkles size={21}/><span>INTELLIGENCE LAYER</span><b>DATA-DRIVEN</b><small>Manual approval remains the final gate</small></div>
    </section>

    <section className={styles.rules}><span><ShieldCheck size={13}/>Workflow-ready ≠ guaranteed ROM support</span><span><ShieldCheck size={13}/>Doug-owned packs stay versioned</span><span><ShieldCheck size={13}/>Requirements seed at project activation</span><span><ShieldCheck size={13}/>Manual fallback for unknown vehicles</span></section>

    <IntelligenceClient vehicles={catalog.vehicles} source={catalog.source}/>
  </main>;
}

import Link from "next/link";
import { ArrowLeft, ChevronRight, Cpu, ShieldCheck } from "lucide-react";
import { getVehicleIntelligenceCatalog } from "../server/vehicle-platform-intelligence";
import VehicleIntelligenceClient from "./vehicle-intelligence-client";
import styles from "./vehicle-intelligence.module.css";

export default function VehicleIntelligencePage(){
  const catalog=getVehicleIntelligenceCatalog();
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>VEHICLE INTELLIGENCE</span></div></div>
      <div className={styles.links}><Link href="/intake-queue">Intake Queue <ChevronRight size={13}/></Link><Link href="/automations">Automations <ChevronRight size={13}/></Link></div>
    </header>

    <section className={styles.hero}>
      <div><span>BMW / SUPRA WORKFLOW INTELLIGENCE</span><h1>The car should configure the tune workflow.</h1><p>Chassis, engine, platform, fuel and hardware resolve into the correct prerequisites, logging recipe, parameter-pack family and automation plan — while exact ROM/DME compatibility still stays under Doug’s approval.</p></div>
      <div className={styles.heroCard}><Cpu size={22}/><b>{catalog.vehicles.length} VEHICLE PROFILES</b><small>{catalog.productionWorkflowEngines.length} workflow engine families · {catalog.platforms.length} platforms</small></div>
    </section>

    <section className={styles.rules}><span><ShieldCheck size={13}/>Workflow-ready is not auto-compatible</span><span><ShieldCheck size={13}/>Exact ROM/DME stays tuner-approved</span><span><ShieldCheck size={13}/>Logging packs stay versioned</span><span><ShieldCheck size={13}/>Unknown cars fall back to manual review</span></section>

    <VehicleIntelligenceClient catalog={catalog}/>
  </main>;
}

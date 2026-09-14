import Link from "next/link";
import { ArrowLeft, ChevronRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { listIntakeRequests } from "../server/intake";
import { getIntakeHandoffState } from "../server/intake-handoff";
import { resolveVehicleIntelligenceServer } from "../server/intelligence-store";
import IntakeQueueClient from "./intake-queue-client";
import styles from "./intake-queue.module.css";

export default async function IntakeQueuePage(){
  const baseIntakes=await listIntakeRequests({limit:50});
  const intakes=await Promise.all(baseIntakes.map(async intake=>{
    let handoff={status:"unknown"};
    try{handoff=await getIntakeHandoffState(intake.id)}catch{}
    const payload={...(intake.vehiclePayload||{}),platform:intake.vehiclePayload?.platform||intake.platform||""};
    let intelligence;
    try{intelligence=await resolveVehicleIntelligenceServer(payload)}catch{intelligence={state:"review_required",warnings:["Vehicle intelligence lookup failed; keep manual review enabled."],requirements:[],automations:[]}}
    return {...intake,handoff,intelligence};
  }));
  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>INTAKE QUEUE</span></div></div><div className={styles.links}><Link href="/intelligence">Vehicle Intelligence <ChevronRight size={13}/></Link><Link href="/outbound">Approval Queue <ChevronRight size={13}/></Link><Link href="/messages">Messages <ChevronRight size={13}/></Link></div></header>
    <section className={styles.hero}><div><span>PAID ORDER → INTAKE INVITE → REVIEWED VEHICLE → TUNE PROJECT</span><h1>Don’t open a project until the car is known.</h1><p>Every paid Wix order lands here first. Subpar OS resolves chassis + engine + platform into the right prerequisites and logging workflow, but Doug still approves compatibility before project activation.</p></div><div className={styles.heroStatus}><ClipboardCheck size={21}/><b>{intakes.length} INTAKES</b><small>Vehicle intelligence · secure intake · atomic activation</small></div></section>
    <section className={styles.rules}><span><ShieldCheck size={13}/>Paid order is not a tune project</span><span><ShieldCheck size={13}/>Workflow-ready is not ROM approval</span><span><ShieldCheck size={13}/>Intake email never auto-sends</span><span><ShieldCheck size={13}/>Activation is atomic + replay-safe</span></section>
    <IntakeQueueClient initialIntakes={intakes}/>
  </main>;
}

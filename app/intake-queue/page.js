import Link from "next/link";
import { ArrowLeft, ChevronRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { listIntakeRequests } from "../server/intake";
import { getIntakeHandoffState } from "../server/intake-handoff";
import IntakeQueueClient from "./intake-queue-client";
import styles from "./intake-queue.module.css";

export default async function IntakeQueuePage(){
  const baseIntakes=await listIntakeRequests({limit:50});
  const intakes=await Promise.all(baseIntakes.map(async intake=>{
    try{return {...intake,handoff:await getIntakeHandoffState(intake.id)}}catch{return {...intake,handoff:{status:"unknown"}}}
  }));
  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>INTAKE QUEUE</span></div></div><div className={styles.links}><Link href="/outbound">Approval Queue <ChevronRight size={13}/></Link><Link href="/go-live">Go Live <ChevronRight size={13}/></Link><Link href="/messages">Messages <ChevronRight size={13}/></Link></div></header>
    <section className={styles.hero}><div><span>PAID ORDER → INTAKE INVITE → REVIEWED VEHICLE → TUNE PROJECT</span><h1>Don’t open a project until the car is known.</h1><p>Every paid Wix order lands here first. Subpar OS can stage the intake invitation automatically, but Gmail provider send still requires approval. Customer details are collected through a secure link, compatibility is explicitly reviewed, then one approved action creates the vehicle and tune project.</p></div><div className={styles.heroStatus}><ClipboardCheck size={21}/><b>{intakes.length} INTAKES</b><small>Approval-gated email · secure intake · atomic activation</small></div></section>
    <section className={styles.rules}><span><ShieldCheck size={13}/>Paid order is not a tune project</span><span><ShieldCheck size={13}/>Intake email never auto-sends</span><span><ShieldCheck size={13}/>Raw intake token is never stored</span><span><ShieldCheck size={13}/>Activation is atomic + replay-safe</span></section>
    <IntakeQueueClient initialIntakes={intakes}/>
  </main>;
}

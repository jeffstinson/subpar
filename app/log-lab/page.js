import Link from "next/link";
import { ArrowLeft, ChevronRight, Gauge, ShieldCheck } from "lucide-react";
import LogLabClient from "./log-lab-client";
import styles from "./log-lab.module.css";

export default function LogLabPage(){
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>DATALOG INTELLIGENCE</span></div></div>
      <div className={styles.links}><Link href="/log-review/SP-1842">Alex Log Review <ChevronRight size={13}/></Link><Link href="/intelligence">Vehicle Intelligence <ChevronRight size={13}/></Link></div>
    </header>

    <section className={styles.hero}>
      <div><span>MHD-FIRST LOG NORMALIZATION</span><h1>Make the log reviewable before Doug opens it.</h1><p>Subpar OS maps inconsistent CSV headers into canonical channels, checks whether the expected channels are actually present, summarizes the pull, and surfaces review flags without pretending it can approve a tune.</p></div>
      <div className={styles.heroCard}><Gauge size={22}/><b>CONFIDENCE FIRST</b><small>Unknown or missing channels reduce parser confidence instead of being silently guessed.</small></div>
    </section>

    <section className={styles.rules}><span><ShieldCheck size={13}/>Raw CSV is not persisted in this lab</span><span><ShieldCheck size={13}/>Review thresholds are tuner-configurable</span><span><ShieldCheck size={13}/>Parser flags are not tune approval</span><span><ShieldCheck size={13}/>MHD first · BM3/EcuTek adapters next</span></section>

    <LogLabClient/>
  </main>;
}

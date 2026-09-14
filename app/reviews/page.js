import Link from "next/link";
import { ArrowLeft, ChevronRight, Gauge, ShieldCheck } from "lucide-react";
import { getLogReviewWorkspace, listLogReviewQueue } from "../server/log-review-workflow";
import ReviewCockpit from "./review-cockpit";
import styles from "./reviews.module.css";

export default async function ReviewsPage(){
  const queue=await listLogReviewQueue({limit:50});
  const first=queue[0];
  const workspace=await getLogReviewWorkspace({projectNumber:first?.projectNumber||"SP-1842",logId:first?.id||null});
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>DATALOG REVIEWS</span></div></div>
      <div className={styles.links}><Link href="/log-lab">Parser Lab <ChevronRight size={13}/></Link><Link href="/intelligence">Vehicle Intelligence <ChevronRight size={13}/></Link></div>
    </header>
    <section className={styles.hero}>
      <div><span>DATALOG → CONTEXT → DOUG DECISION</span><h1>Review the change, not just the CSV.</h1><p>Parser output organizes the pull. This cockpit compares revisions, preserves Doug’s annotations, records the actual tuner decision and hands the project to the correct next state without pretending an automated flag is calibration approval.</p></div>
      <div className={styles.heroCard}><Gauge size={20}/><b>{queue.length} WAITING</b><small>Parsed logs · comparison context · explicit tuner handoff</small></div>
    </section>
    <section className={styles.rules}><span><ShieldCheck size={13}/>Parser output is assistive</span><span><ShieldCheck size={13}/>Doug owns every decision</span><span><ShieldCheck size={13}/>Raw CSV stays immutable</span><span><ShieldCheck size={13}/>Datazap link ≠ parsed data</span></section>
    <ReviewCockpit initialQueue={queue} initialWorkspace={workspace}/>
  </main>;
}

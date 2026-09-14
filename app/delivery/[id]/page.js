import Link from "next/link";
import { ArrowLeft, ChevronRight, PackageCheck, ShieldCheck } from "lucide-react";
import { getRevisionDeliveryWorkspace, revisionDeliveryReadiness } from "../../server/revision-delivery";
import DeliveryClient from "./delivery-client";
import styles from "./delivery.module.css";

export default async function DeliveryPage({params}){
  const {id}=await params;
  const workspace=await getRevisionDeliveryWorkspace({projectNumber:id});
  const readiness=revisionDeliveryReadiness();
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/reviews" className={styles.back}><ArrowLeft size={15}/>Review cockpit</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>REVISION DELIVERY</span></div></div>
      <div className={styles.links}><Link href={`/project/${id}`}>Project <ChevronRight size={13}/></Link><Link href={`/portal/${id}/delivery?preview=alex`}>Customer view <ChevronRight size={13}/></Link></div>
    </header>
    <section className={styles.hero}><div><span>REVIEW → FILE → QA → APPROVAL → DELIVERY → NEXT LOG</span><h1>Make delivery a controlled handoff.</h1><p>Doug can prepare the revision, attach the private tune artifact, run delivery QA, approve it, then expose that exact immutable file to the customer. Gmail stays staged behind its own approval/send gate.</p></div><div className={styles.heroCard}><PackageCheck size={22}/><b>{workspace.revision?`REV ${workspace.revision.revisionNumber??workspace.revision.revision_number??"—"}`:"NO REVISION"}</b><small>{workspace.delivery?.status||"Draft not initialized"}</small></div></section>
    <section className={styles.rules}><span><ShieldCheck size={13}/>Upload stays internal</span><span><ShieldCheck size={13}/>QA hashes the tune artifact</span><span><ShieldCheck size={13}/>Approval does not publish</span><span><ShieldCheck size={13}/>Delivery unlocks portal visibility</span></section>
    <DeliveryClient initialWorkspace={workspace} readiness={readiness}/>
  </main>;
}

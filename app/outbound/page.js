import Link from "next/link";
import { ArrowLeft, ChevronRight, Mail, ShieldCheck } from "lucide-react";
import { getIntegrationReadiness } from "../server/integrations";
import { listGmailOutbound } from "../server/gmail-outbound";
import { getProjectById } from "../server/repository";
import OutboundClient from "./outbound-client";
import styles from "./outbound.module.css";

export default async function OutboundPage(){
  const project=await getProjectById("SP-1842");
  const readiness=getIntegrationReadiness();
  const queue=project?await listGmailOutbound({projectId:project.id,limit:30}):[];

  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>OUTBOUND COMMUNICATIONS</span></div></div><div className={styles.links}><Link href="/integration-lab">Integration Lab <ChevronRight size={13}/></Link><Link href="/go-live">Go Live <ChevronRight size={13}/></Link></div></header>
    <section className={styles.hero}><div><span>GMAIL DELIVERY CONTROL</span><h1>Draft it. Approve it. Then send it.</h1><p>Customer email is treated like a tune revision: an intentional action with ownership, approval, idempotency and a permanent provider result. No screen can bypass this queue to send directly through Doug’s Gmail.</p></div><div><Mail size={22}/><b>{readiness.gmail.readyForOutbound?"SEND READY":"SEND LOCKED"}</b><small>{readiness.gmail.readyForOutbound?"Gmail provider gate is enabled":"Preview / approval workflow only"}</small></div></section>
    <section className={styles.rules}><span><ShieldCheck size={14}/>Staff may prepare drafts</span><span><ShieldCheck size={14}/>Owner/tuner approval required</span><span><ShieldCheck size={14}/>Provider send has its own environment gate</span><span><ShieldCheck size={14}/>Provider message ID is written back after send</span></section>
    {project?<OutboundClient project={project} initialQueue={queue} sendEnabled={readiness.gmail.readyForOutbound}/>:<section className={styles.missing}>Synthetic project SP-1842 is unavailable.</section>}
  </main>;
}

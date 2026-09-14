import Link from "next/link";
import { ArrowLeft, ChevronRight, Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { getCommunicationWorkspace } from "../server/communications";
import { getIntegrationReadiness } from "../server/integrations";
import CommunicationsClient from "./communications-client";
import styles from "./messages.module.css";

export default async function MessagesPage(){
  const [workspace,readiness]=await Promise.all([getCommunicationWorkspace({limit:50}),Promise.resolve(getIntegrationReadiness())]);
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>COMMUNICATIONS</span></div></div>
      <div className={styles.links}><Link href="/outbound">Approval Queue <ChevronRight size={13}/></Link><Link href="/integration-lab">Integration Lab <ChevronRight size={13}/></Link></div>
    </header>
    <section className={styles.hero}>
      <div><span>PROJECT-LINKED CUSTOMER COMMUNICATION</span><h1>Every customer message, in tune context.</h1><p>Gmail stays Doug’s mailbox. Subpar OS adds the missing context: which car, which project, which revision, who is waiting on whom, and whether a reply is only drafted or actually approved for delivery.</p></div>
      <div className={styles.heroStatus}><MessageSquareText size={21}/><b>{workspace.counts.threads} THREADS</b><small>{workspace.counts.unread} unread · {workspace.counts.waitingOnDoug} need Doug</small></div>
    </section>
    <section className={styles.rules}><span><Mail size={13}/>Gmail thread remains source of truth</span><span><ShieldCheck size={13}/>Replies enter approval queue before send</span><span><ShieldCheck size={13}/>Customer + project match is visible before action</span><span><ShieldCheck size={13}/>Internal tune context never leaks into customer copy</span></section>
    <CommunicationsClient workspace={workspace} sendEnabled={readiness.gmail.readyForOutbound}/>
  </main>;
}

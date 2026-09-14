import Link from "next/link";
import { ArrowLeft,ShieldCheck } from "lucide-react";
import ActivationClient from "./activation-client";
import styles from "./activation.module.css";

export default function ActivationPage(){
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/go-live"><ArrowLeft size={14}/>Go Live Center</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRODUCTION ACTIVATION</span></div></div>
      <div className={styles.lock}><ShieldCheck size={14}/>Owner only</div>
    </header>
    <ActivationClient/>
  </main>;
}

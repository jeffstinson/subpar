import Link from "next/link";
import { ArrowLeft,GitBranch,ShieldCheck } from "lucide-react";
import ActivationClient from "./activation-client";
import styles from "./activation.module.css";

export default function ActivationPage(){
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/go-live"><ArrowLeft size={14}/>Go Live Center</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>PRODUCTION ACTIVATION</span></div></div>
      <div className={styles.lock}><Link href="/validation" style={{color:"inherit",textDecoration:"none",display:"flex",alignItems:"center",gap:6}}><GitBranch size={13}/>Quality Gates</Link><span style={{display:"flex",alignItems:"center",gap:6}}><ShieldCheck size={14}/>Owner only</span></div>
    </header>
    <ActivationClient/>
  </main>;
}

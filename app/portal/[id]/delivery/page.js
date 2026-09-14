import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import DeliveryPortalClient from "./delivery-portal-client";
import styles from "./delivery-portal.module.css";

export default async function CustomerDeliveryPage({params}){
  const {id}=await params;
  return <main className={styles.page}>
    <header className={styles.topbar}><Link href={`/portal/${id}`} className={styles.back}><ArrowLeft size={15}/>Tune portal</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR TUNING</b><span>REVISION DELIVERY</span></div></div><span className={styles.secure}><ShieldCheck size={14}/>Private portal</span></header>
    <DeliveryPortalClient projectNumber={id}/>
  </main>;
}

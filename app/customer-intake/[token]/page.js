import { notFound } from "next/navigation";
import { resolveIntakeAccess } from "../../server/intake";
import CustomerIntakeClient from "./customer-intake-client";
import styles from "./customer-intake.module.css";

export default async function CustomerIntakePage({params}){
  const {token}=await params;
  const intake=await resolveIntakeAccess(token);
  if(!intake)notFound();
  return <main className={styles.page}>
    <header className={styles.topbar}><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR TUNING</b><span>VEHICLE INTAKE</span></div></div><span>{intake.externalOrderId||intake.orderId}</span></header>
    <section className={styles.hero}><span>SECURE CUSTOMER INTAKE</span><h1>Tell Doug exactly what he’s tuning.</h1><p>This information stays attached to your tune so vehicle details, fuel, hardware and platform don’t get lost between email threads or revisions.</p></section>
    <CustomerIntakeClient token={token} intake={intake}/>
  </main>;
}

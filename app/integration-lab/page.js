import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, DatabaseZap, LockKeyhole, Mail, Radio, RefreshCw, ShieldCheck, ShoppingBag, TriangleAlert, Workflow } from "lucide-react";
import { getIntegrationReadiness } from "../server/integrations";
import { listIntegrationReceipts } from "../server/integration-ledger";
import IntegrationLabClient from "./integration-lab-client";
import styles from "./integration-lab.module.css";

function State({ready,labelReady="READY",labelWait="GATED"}){return <span className={ready?styles.good:styles.wait}>{ready?<CheckCircle2 size={12}/>:<LockKeyhole size={12}/>} {ready?labelReady:labelWait}</span>}

export default async function IntegrationLabPage(){
  const readiness=getIntegrationReadiness();
  const receipts=await listIntegrationReceipts(8);
  const wixReady=readiness.wix.readyForSignedIngress;
  const gmailReady=readiness.gmail.readyForReadSync;

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>INTEGRATION LAB</span></div></div>
      <div className={styles.toplinks}><Link href="/go-live">Go Live Center <ChevronRight size={13}/></Link><Link href="/access">Access + Files <ChevronRight size={13}/></Link><a href="/api/v1/integrations/readiness">Readiness API <ChevronRight size={13}/></a></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>PHASE 5 • EXTERNAL SYSTEM STAGING</span><h1>Prove the handoff before the real data arrives.</h1><p>Wix purchases and Gmail conversations can now be normalized, matched, deduplicated and planned against the Subpar data model without creating a customer, sending an email or mutating Doug’s live workflow.</p><div className={styles.heroMeta}><span><ShieldCheck size={13}/>Real-data gate closed</span><span><RefreshCw size={13}/>Idempotent processing</span><span><DatabaseZap size={13}/>No raw provider payload retention</span></div></div>
      <div className={styles.mode}><span>INTEGRATION MODE</span><b>{readiness.realDataApproved?"APPROVED":"SYNTHETIC"}</b><small>{readiness.stagingEnabled?"staging gate enabled":"preview simulations only"}</small></div>
    </section>

    <section className={styles.statusGrid}>
      <article><div className={styles.statusIcon}><ShoppingBag size={19}/></div><div><span>WIX INGRESS</span><h2>Paid-order webhook</h2><p>Signed JWT verification + duplicate receipt protection.</p></div><State ready={wixReady}/></article>
      <article><div className={styles.statusIcon}><Mail size={19}/></div><div><span>GMAIL SYNC</span><h2>Thread + history model</h2><p>OAuth refresh, history cursor and project matching.</p></div><State ready={gmailReady}/></article>
      <article><div className={styles.statusIcon}><Radio size={19}/></div><div><span>GMAIL SEND</span><h2>Outbound boundary</h2><p>Draft planning exists; actual send has its own hard gate.</p></div><State ready={readiness.gmail.readyForOutbound} labelReady="SEND READY" labelWait="SEND OFF"/></article>
      <article><div className={styles.statusIcon}><ShieldCheck size={19}/></div><div><span>SAFETY</span><h2>Apply gate</h2><p>Wix planning is separate from customer/order/project mutation.</p></div><State ready={readiness.wix.applyEnabled&&readiness.realDataApproved} labelReady="APPLY READY" labelWait="DRY RUN"/></article>
    </section>

    <section className={styles.flowPanel}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>INGESTION CONTRACT</span><h2>External event → trusted Subpar action</h2></div><Workflow size={20}/></div>
      <div className={styles.flow}>{[
        ["01","VERIFY","Provider signature / OAuth identity must be valid before processing."],
        ["02","RECEIPT","Record one idempotency identity so retries cannot duplicate work."],
        ["03","NORMALIZE","Strip provider-specific shape into customer, order, thread and message fields."],
        ["04","MATCH","Resolve existing customer, vehicle and tune-project relationships."],
        ["05","PLAN","Show exactly what would create, update, route or notify before mutation."],
        ["06","APPLY","Separate future gate; disabled in this staging phase."],
      ].map(([n,title,body])=><article key={n}><i>{n}</i><div><b>{title}</b><p>{body}</p></div></article>)}</div>
    </section>

    <IntegrationLabClient/>

    <section className={styles.lowerGrid}>
      <section className={styles.panel}>
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>RECEIPT LEDGER</span><h2>Retry-safe event history</h2></div><RefreshCw size={18}/></div>
        <div className={styles.receipts}>{receipts.map((receipt,index)=>{
          const integration=receipt.integration;
          const eventType=receipt.eventType||receipt.event_type||"event";
          const externalId=receipt.externalEventId||receipt.external_event_id;
          const status=receipt.status||"received";
          const received=receipt.receivedAt||receipt.received_at;
          return <div key={externalId||index}><span className={styles.receiptIcon}>{integration==="wix"?<ShoppingBag size={14}/>:<Mail size={14}/>}</span><div><b>{integration?.toUpperCase()} · {eventType}</b><small>{externalId}</small></div><em>{status}</em><time>{received?new Date(received).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"—"}</time></div>
        })}</div>
      </section>

      <aside className={styles.panel}>
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>LIVE CONNECTION CHECKLIST</span><h2>Still intentionally closed</h2></div><TriangleAlert size={18}/></div>
        <div className={styles.checklist}>{[
          [readiness.realDataApproved,"Real-data approval / NDA gate"],
          [readiness.wix.publicKeyConfigured,"Dedicated Wix webhook public key"],
          [readiness.wix.webhookEnabled,"Wix signed ingress enabled"],
          [readiness.gmail.oauthConfigured,"Dedicated Gmail OAuth credentials"],
          [readiness.gmail.watchConfigured,"Gmail Pub/Sub topic"],
          [readiness.gmail.syncEnabled,"Gmail read-sync gate"],
          [readiness.gmail.sendEnabled,"Outbound Gmail send gate"],
        ].map(([done,label])=><div key={label}><span className={done?styles.checkOn:styles.checkOff}>{done?<CheckCircle2 size={13}/>:<LockKeyhole size={13}/>}</span><b>{label}</b><em>{done?"SET":"LOCKED"}</em></div>)}</div>
      </aside>
    </section>

    <section className={styles.next}><div><span className={styles.eyebrow}>NEXT AFTER SYNTHETIC PARITY</span><h2>Use the Go Live Center for historical import and cutover.</h2><p>Signed event planning is now paired with resumable import batches, provider ID linkage, gated Wix persistence and Gmail thread hydration. The Go Live Center controls the historical → live handoff so Wix apply happens before Gmail sending.</p><Link href="/go-live" style={{display:"inline-flex",alignItems:"center",gap:6,color:"#72c989",fontSize:11,textDecoration:"none",fontWeight:800}}>Open Go Live Center <ChevronRight size={13}/></Link></div><div>{["Attach isolated Supabase","Run migrations 0001–0006","Dry-run Wix/Gmail history","Resolve conflicts and reconcile counts","Enable Wix signed ingress + apply","Enable Gmail read sync","Outbound Gmail last"].map((step,index)=><p key={step}><i>{index+1}</i>{step}</p>)}</div></section>
  </main>;
}

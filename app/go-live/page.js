import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Database, FileCheck2, KeyRound, LockKeyhole, Mail, Rocket, ShieldCheck, ShoppingBag, TriangleAlert } from "lucide-react";
import { getGoLiveReadiness, goLiveValidationSuite, listImportBatches } from "../server/go-live";
import GoLiveClient from "./go-live-client";
import styles from "./go-live.module.css";

function Gate({ready}){return <span className={ready?styles.ready:styles.locked}>{ready?<CheckCircle2 size={12}/>:<LockKeyhole size={12}/>} {ready?"READY":"WAITING"}</span>}

export default async function GoLivePage(){
  const readiness=getGoLiveReadiness();
  const [batches,validations]=await Promise.all([listImportBatches(6),Promise.resolve(goLiveValidationSuite())]);
  const integration=readiness.integrationReadiness;

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>GO LIVE CENTER</span></div></div>
      <div className={styles.toplinks}><Link href="/integration-lab">Integration Lab <ChevronRight size={13}/></Link><a href="/api/v1/go-live/readiness">Readiness API <ChevronRight size={13}/></a></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>PHASE 6 • DEPLOYMENT + CUTOVER READINESS</span><h1>Make Doug’s eventual setup boring.</h1><p>Everything needed to move from synthetic preview to a real Subpar deployment is organized here: isolated infrastructure, migrations, identities, private files, Wix/Gmail configuration, historical imports, validation tests and the exact order to flip live gates.</p><div className={styles.heroMeta}><span><ShieldCheck size={13}/>Default deny</span><span><Database size={13}/>6 ordered migrations</span><span><FileCheck2 size={13}/>Replay-safe imports</span></div></div>
      <div className={styles.score}><span>PRE-REQUISITES</span><b>{readiness.prerequisitesReady?"READY":"STAGED"}</b><small>{readiness.liveReady?"live gate approved":"real-data gate remains closed"}</small></div>
    </section>

    <section className={styles.statusGrid}>
      <article><Database size={19}/><div><span>SUPABASE</span><h2>Database + storage</h2><p>Dedicated Subpar project, service role and private-file secret.</p></div><Gate ready={readiness.checks.find(x=>x.id==="supabase")?.ready&&readiness.checks.find(x=>x.id==="file-secret")?.ready}/></article>
      <article><KeyRound size={19}/><div><span>IDENTITY</span><h2>Team + portal auth</h2><p>Doug/staff roles and customer-scoped sessions.</p></div><Gate ready={readiness.checks.find(x=>x.id==="public-auth")?.ready}/></article>
      <article><ShoppingBag size={19}/><div><span>WIX</span><h2>Orders + webhook</h2><p>Signed ingress first; historical apply before live mutation.</p></div><Gate ready={integration.wix.publicKeyConfigured}/></article>
      <article><Mail size={19}/><div><span>GMAIL</span><h2>Threads + mailbox watch</h2><p>Historical read sync before outbound customer email.</p></div><Gate ready={integration.gmail.oauthConfigured&&integration.gmail.watchConfigured}/></article>
    </section>

    <section className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>SETUP CHECKLIST</span><h2>Configuration without exposing secrets</h2></div><ShieldCheck size={19}/></div>
        <div className={styles.checks}>{readiness.checks.map(check=><div key={check.id}><span className={check.ready?styles.checkOn:styles.checkOff}>{check.ready?<CheckCircle2 size={13}/>:<LockKeyhole size={13}/>}</span><div><b>{check.label}</b><p>{check.detail}</p></div><em>{check.ready?"SET":"OPEN"}</em></div>)}</div>
      </section>
      <aside className={styles.panel}>
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>MIGRATION MANIFEST</span><h2>Run once, in order</h2></div><Database size={19}/></div>
        <div className={styles.migrations}>{readiness.migrations.map(migration=><div key={migration.id}><i>{migration.id}</i><div><b>{migration.file}</b><p>{migration.purpose}</p></div></div>)}</div>
      </aside>
    </section>

    <GoLiveClient/>

    <section className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>VALIDATION SUITE</span><h2>Tests we run before live writes</h2></div><FileCheck2 size={19}/></div>
        <div className={styles.validations}>{validations.map((test,index)=><div key={test.id}><i>{String(index+1).padStart(2,"0")}</i><div><b>{test.name}</b><p>{test.passCondition}</p></div><span>REQUIRED</span></div>)}</div>
      </section>
      <aside className={styles.panel}>
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>IMPORT BATCHES</span><h2>Resumable by design</h2></div><Rocket size={19}/></div>
        <div className={styles.batches}>{batches.map(batch=><div key={batch.id}><span className={batch.integration==="wix"?styles.wix:styles.gmail}>{batch.integration.toUpperCase()}</span><div><b>{batch.importType.replaceAll("_"," ")}</b><p>{batch.status} · {batch.mode}</p></div><em>{batch.scannedCount||0} scanned</em></div>)}</div>
        <div className={styles.warning}><TriangleAlert size={15}/><p>Apply mode stays unavailable until the isolated database, identities, storage, historical dry-runs and real-data approval all pass.</p></div>
      </aside>
    </section>

    <section className={styles.sequence}>
      <div><span className={styles.eyebrow}>ACTIVATION ORDER</span><h2>No big-bang switch.</h2><p>Each external capability gets turned on only after the layer beneath it has already been proven. That makes onboarding repeatable and rollback-friendly.</p></div>
      <div className={styles.sequenceList}>{readiness.recommendedSequence.map((step,index)=><div key={step}><i>{index+1}</i><b>{step}</b></div>)}</div>
    </section>
  </main>;
}

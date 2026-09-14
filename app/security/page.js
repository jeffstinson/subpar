import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Database, FileKey2, FolderLock, KeyRound,
  LockKeyhole, ShieldCheck, UserRound, Users, Wrench
} from "lucide-react";
import { getAccessReadiness, permissionMatrix } from "../server/access-control";
import { getAuthReadiness } from "../server/env";
import { getStorageReadiness } from "../server/storage";
import AccessSimulator from "./access-simulator";
import styles from "./security.module.css";

export default function SecurityPage() {
  const access = getAccessReadiness();
  const auth = getAuthReadiness();
  const storage = getStorageReadiness();
  const matrix = permissionMatrix();

  const roles = [
    [ShieldCheck,"Owner","Doug-level access: integrations, users, automation, tunes and files."],
    [Wrench,"Tuner","Tune projects, revisions, log review, customer delivery and file workflow."],
    [Users,"Staff","Customers, vehicles, messages and internal read access without tune publishing."],
    [UserRound,"Customer","Only their own portal-visible project state, messages and approved files."],
  ];

  const buckets = Object.entries(storage.buckets).map(([kind,bucket]) => ({kind,bucket}));

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>IDENTITY + FILE SECURITY</span></div></div>
      <Link href="/persistence" className={styles.rightLink}>Persistence <ChevronRight size={13}/></Link>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>PHASE 3 • IDENTITY + PRIVATE FILES</span><h1>Doug and the customer no longer share the same trust boundary.</h1><p>Subpar OS now has explicit internal roles, a customer-safe portal API, default-deny permissions, private file buckets and a server broker for short-lived upload/download tickets. Signed uploads must be finalized through the server before immutable file metadata is registered.</p></div>
      <div className={styles.mode}><span>AUTH MODE</span><b>{auth.mode.toUpperCase()}</b><small>{access.realSessionsEnabled ? "real sessions ready" : "preview principals only"}</small></div>
    </section>

    <section className={styles.summary}>
      <article><i><ShieldCheck size={17}/></i><div><span>Permission model</span><b>{access.permissionCount} explicit permissions</b></div></article>
      <article><i><Users size={17}/></i><div><span>Internal roles</span><b>Owner • Tuner • Staff</b></div></article>
      <article><i><UserRound size={17}/></i><div><span>Portal identity</span><b>Customer-scoped</b></div></article>
      <article><i><FolderLock size={17}/></i><div><span>Storage</span><b>{buckets.length} private buckets</b></div></article>
    </section>

    <section className={styles.grid}>
      <div className={styles.main}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>ROLE MODEL</span><h2>Internal work vs customer access</h2></div><KeyRound size={19}/></div>
          <div className={styles.roleGrid}>{roles.map(([Icon,title,body]) => <article className={styles.roleCard} key={title}><span>ROLE</span><b><Icon size={13} style={{verticalAlign:"middle",marginRight:6}}/>{title}</b><p>{body}</p></article>)}</div>
        </section>

        <section className={`${styles.panel} ${styles.permissionWrap}`}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>PERMISSION SIMULATOR</span><h2>See the server decision by role</h2></div><ShieldCheck size={19}/></div>
          <AccessSimulator matrix={matrix}/>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>PRIVATE FILE FLOW</span><h2>Files never need a public URL</h2></div><FileKey2 size={19}/></div>
          <div className={styles.flow}>
            <div><span>1</span><div><b>Application checks identity + project ownership</b><small>Doug/internal roles can access tuner-only files. Customers must match the project owner and the file must be customer-visible.</small></div></div>
            <div><span>2</span><div><b>Server creates a short-lived signed upload/download ticket</b><small>Uploads receive a unique, non-overwriting path. A second signed finalization token binds that upload to the project, kind and destination bucket.</small></div></div>
            <div><span>3</span><div><b>Object remains in a private bucket</b><small>Stock files, revisions, datalogs, parameter packs and customer attachments are separated by purpose.</small></div></div>
            <div><span>4</span><div><b>Server verifies the uploaded object and registers immutable metadata</b><small>The finalization endpoint checks the signed token, project namespace, bucket, role and actual stored object before creating the file record.</small></div></div>
          </div>
        </section>
      </div>

      <aside className={styles.side}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>PRIVATE BUCKETS</span><h2>Storage layout</h2></div><FolderLock size={19}/></div>
          <div className={styles.bucketList}>{buckets.map(({kind,bucket}) => <div className={styles.bucket} key={bucket}><span className={styles.bucketIcon}><LockKeyhole size={14}/></span><div><b>{bucket}</b><small>{kind.replaceAll("_"," ")}</small></div><em>PRIVATE</em></div>)}</div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>AUTH READINESS</span><h2>Current gate</h2></div><Database size={19}/></div>
          <div className={styles.flow}>
            <div><span>{auth.publicAuthConfigured ? <CheckCircle2 size={12}/> : "1"}</span><div><b>Supabase public auth config</b><small>{auth.publicAuthConfigured ? "Configured" : "Waiting on dedicated Subpar URL + anon key"}</small></div></div>
            <div><span>{auth.internalAuthEnabled ? <CheckCircle2 size={12}/> : "2"}</span><div><b>Internal login enforcement</b><small>{auth.internalAuthEnabled ? "Enabled" : "Intentionally disabled for preview"}</small></div></div>
            <div><span>{auth.portalAuthEnabled ? <CheckCircle2 size={12}/> : "3"}</span><div><b>Customer portal auth</b><small>{auth.portalAuthEnabled ? "Enabled" : "Intentionally disabled for preview"}</small></div></div>
            <div><span>{storage.ticketSecretConfigured ? <CheckCircle2 size={12}/> : "4"}</span><div><b>File finalization signing</b><small>{storage.ticketSecretConfigured ? "Ready for current mode" : "Needs SUBPAR_FILE_TICKET_SECRET"}</small></div></div>
          </div>
          <div className={styles.gate} style={{marginTop:14}}><LockKeyhole size={16}/><div><b>Real customer data is still blocked.</b><p>Adding auth architecture does not open the NDA/live-data gate or enable outbound customer actions.</p></div></div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>RLS HARDENING</span><h2>Browser writes narrowed</h2></div><ShieldCheck size={19}/></div>
          <div className={styles.flow}>
            <div><span><CheckCircle2 size={12}/></span><div><b>Revisions + logs</b><small>Staff can read; only owner/tuner roles may mutate.</small></div></div>
            <div><span><CheckCircle2 size={12}/></span><div><b>Files + audit events</b><small>Authenticated users read by scope; server broker owns writes.</small></div></div>
            <div><span><CheckCircle2 size={12}/></span><div><b>Integration history</b><small>Owner-readable, server-managed and append-oriented.</small></div></div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>INSPECT</span><h2>Security APIs</h2></div></div>
          <div className={styles.apiLinks}>
            <a href="/api/v1/security">Security readiness <ChevronRight size={13}/></a>
            <a href="/api/v1/session">Doug preview session <ChevronRight size={13}/></a>
            <a href="/api/v1/session?preview=alex">Alex preview session <ChevronRight size={13}/></a>
            <a href="/api/v1/portal/projects/SP-1842?preview=alex">Customer-safe SP-1842 API <ChevronRight size={13}/></a>
            <a href="/api/v1/access">Permission matrix <ChevronRight size={13}/></a>
          </div>
        </section>
      </aside>
    </section>

    <section className={styles.next}><div className={styles.nextInner}><div><span className={styles.eyebrow}>NEXT STEP AFTER SUPABASE IS ATTACHED</span><h2>Turn preview principals into actual Doug/customer sessions.</h2><p>Run all three migrations, create Doug as the first owner, validate Alex-style portal access against synthetic seeded data, then test the full signed upload → finalization → download cycle before auth is enforced on production routes.</p></div><div className={styles.steps}>{["Run 0001 + 0002 + 0003 migrations","Create Doug owner membership","Create synthetic customer portal identity","Test upload + finalization tickets","Verify portal-safe API exposure","Then enforce protected routes"].map((step,index)=><div key={step}><span>{index+1}</span><b>{step}</b></div>)}</div></div></section>
  </main>;
}

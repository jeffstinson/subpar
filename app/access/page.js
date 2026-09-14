import Link from "next/link";
import { ArrowLeft, ChevronRight, FileKey2, FolderLock, KeyRound, LockKeyhole, LogIn, LogOut, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";
import { getAccessReadiness } from "../server/access-control";
import { getAuthReadiness } from "../server/env";
import { getStorageReadiness } from "../server/storage";
import styles from "./access.module.css";

export default function AccessPage(){
  const access=getAccessReadiness();
  const auth=getAuthReadiness();
  const storage=getStorageReadiness();
  const phases=[
    [LogIn,"Sign in","Team or customer requests a secure email link."],
    [ShieldCheck,"Resolve identity","Supabase user must map to an active internal or portal membership."],
    [KeyRound,"Create server session","Verified access token is copied into an HttpOnly, SameSite session cookie."],
    [RefreshCw,"Keep it alive","Supabase token refreshes automatically resync the secure server session."],
    [LogOut,"Sign out","Server cookie and browser Supabase session are both cleared."],
  ];
  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/" className={styles.back}><ArrowLeft size={15}/>Dashboard</Link><div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>ACCESS + FILES</span></div></div><Link href="/security" className={styles.link}>Security center <ChevronRight size={13}/></Link></header>

    <section className={styles.hero}><div><span>PHASE 4 • SESSIONS + PROTECTED ROUTES</span><h1>Real login behavior, without opening the real-data gate.</h1><p>The app now has a complete session handoff for internal staff and customer portal users, verified route boundaries, logout/expiry behavior and a private File Manager that uses the signed-storage broker.</p></div><div className={styles.mode}><span>AUTH MODE</span><b>{auth.mode.toUpperCase()}</b><small>{access.realSessionsEnabled?"Supabase sessions ready":"Preview-safe"}</small></div></section>

    <section className={styles.cards}>
      <article><Users size={20}/><span>TEAM ACCESS</span><h2>Owner · Tuner · Staff</h2><p>Internal routes verify an active internal membership before loading.</p><Link href="/login?audience=internal">Open team login <ChevronRight size={13}/></Link></article>
      <article><UserRound size={20}/><span>CUSTOMER ACCESS</span><h2>Customer-scoped portal</h2><p>Portal routes require a customer membership and cannot cross into tuner routes.</p><Link href="/login?audience=customer&next=/portal/SP-1842">Open customer login <ChevronRight size={13}/></Link></article>
      <article><FolderLock size={20}/><span>PRIVATE FILES</span><h2>Project File Manager</h2><p>Signed download tickets, signed uploads and immutable registration live in one workflow.</p><Link href="/files/SP-1842">Open Alex’s files <ChevronRight size={13}/></Link></article>
    </section>

    <section className={styles.grid}>
      <section className={styles.panel}><div className={styles.head}><div><span>SESSION LIFECYCLE</span><h2>Browser → server → protected app</h2></div><KeyRound size={20}/></div><div className={styles.timeline}>{phases.map(([Icon,title,body],index)=><div key={title}><i>{index+1}</i><Icon size={16}/><div><b>{title}</b><p>{body}</p></div></div>)}</div></section>
      <aside className={styles.side}>
        <section className={styles.panel}><div className={styles.head}><div><span>BOUNDARIES</span><h2>Current state</h2></div><ShieldCheck size={20}/></div><div className={styles.checks}><div><span>Internal route enforcement</span><b>{auth.internalAuthEnabled?"ON":"PREVIEW OFF"}</b></div><div><span>Portal route enforcement</span><b>{auth.portalAuthEnabled?"ON":"PREVIEW OFF"}</b></div><div><span>Default deny</span><b>YES</b></div><div><span>Private buckets</span><b>{Object.keys(storage.buckets).length}</b></div><div><span>Signed upload finalization</span><b>{storage.uploadFinalization?"READY":"NO"}</b></div></div></section>
        <section className={styles.panel}><div className={styles.head}><div><span>FILES</span><h2>Five private lanes</h2></div><FileKey2 size={20}/></div><div className={styles.buckets}>{Object.entries(storage.buckets).map(([kind,bucket])=><div key={bucket}><LockKeyhole size={13}/><span><b>{bucket}</b><small>{kind.replaceAll("_"," ")}</small></span></div>)}</div></section>
      </aside>
    </section>

    <section className={styles.next}><div><span>NEXT EXTERNAL GATE</span><h2>Attach the isolated Subpar Supabase project.</h2><p>Once the project exists, we run the migrations and synthetic seed, create Doug’s owner identity plus an Alex-style customer test identity, enable auth on preview, and verify every route/file boundary before touching Wix or Gmail.</p></div><div>{["Run migrations 0001–0003","Seed synthetic data","Create test auth users","Enable internal + portal auth","Verify File Manager with real private storage"].map((item,index)=><p key={item}><i>{index+1}</i>{item}</p>)}</div></section>
  </main>;
}

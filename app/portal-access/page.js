"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, FileKey2, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import styles from "./portal-access.module.css";

const files = [
  { id: "file_pack_sp1842", name: "B58TU MHD Parameter Pack v3.2", detail: "Customer-visible PDF", expected: "allowed" },
  { id: "file_rev_sp1842_4", name: "Alex M340i Rev 4 E40", detail: "Delivered tune revision", expected: "allowed" },
  { id: "file_stock_sp1842", name: "Original stock backup", detail: "Internal-only source file", expected: "denied" },
];

export default function PortalAccessPage() {
  const [email, setEmail] = useState("alex.rivera@gmail.com");
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [result, setResult] = useState(null);

  function sendPreview() {
    setSent(true);
    setSignedIn(false);
    setResult(null);
  }

  async function testFile(file) {
    setResult({ file: file.name, loading: true });
    const response = await fetch("/api/v1/storage/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ principal: "alex", action: "download", project: "SP-1842", fileId: file.id, expiresIn: 300 }),
    });
    const data = await response.json();
    setResult({
      file: file.name,
      allowed: response.ok,
      loading: false,
      message: response.ok ? (data.ticket?.dryRun ? "Access approved; preview mode intentionally returns no real file URL." : "Short-lived signed download created.") : data.error,
    });
  }

  return <main className={styles.page}>
    <header className={styles.top}>
      <Link className={styles.back} href="/security"><ArrowLeft size={14}/> Security center</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR TUNING</b><span>CUSTOMER PORTAL ACCESS</span></div></div>
      <Link className={styles.back} href="/portal/SP-1842">Portal preview <ChevronRight size={13}/></Link>
    </header>

    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>CUSTOMER IDENTITY PREVIEW</span>
          <h1>The customer sees their tune — not Doug’s whole operation.</h1>
          <p>This preview demonstrates the intended authentication boundary for the customer portal. Alex receives a secure email sign-in, resolves to exactly one customer identity, and only sees portal-approved project state, messages and files.</p>
          <div className={styles.trust}>
            <div><KeyRound size={16}/><b>Passwordless access</b><small>Magic-link style sign-in keeps the portal simple for customers.</small></div>
            <div><ShieldCheck size={16}/><b>Customer-scoped RLS</b><small>The database ties the Auth user to one customer record.</small></div>
            <div><FileKey2 size={16}/><b>Private downloads</b><small>Approved files use expiring signed URLs instead of public storage.</small></div>
          </div>
        </div>

        <aside className={styles.login}>
          <span className={styles.eyebrow}>SIGN IN</span><h2>Access your Subpar tune</h2>
          <p>Enter the email used for your tune order. In production, Subpar OS will send a secure sign-in link through Supabase Auth.</p>
          <label className={styles.field}><span>Email address</span><input value={email} onChange={event => setEmail(event.target.value)} type="email"/></label>
          <button className={styles.button} onClick={sendPreview}><Mail size={14}/>Send secure sign-in link</button>
          {sent && <div className={styles.sent}><b>Preview link prepared for {email}</b><p>No email was sent. Authentication is intentionally in demo mode until the dedicated Subpar Supabase project is connected.</p><button className={`${styles.button} ${styles.secondary}`} onClick={() => setSignedIn(true)}><UserRound size={14}/>Open as Alex Rivera</button></div>}
          <div className={styles.note}>Preview only: this page never sends email, creates an Auth user, or opens access to real customer data.</div>
        </aside>
      </section>

      {signedIn && <section className={styles.portal}>
        <div className={styles.portalHead}>
          <div className={styles.identity}><div className={styles.avatar}>AR</div><div><b>Alex Rivera</b><span>alex.rivera@gmail.com • Customer portal identity</span></div></div>
          <span className={styles.scope}>SCOPED TO SP-1842</span>
        </div>

        <div className={styles.portalGrid}>
          <div className={styles.card}>
            <h3>What this identity can see</h3>
            <div className={styles.project}>
              <div><span>Vehicle</span><b>2021 BMW M340i</b></div>
              <div><span>Chassis</span><b>G20</b></div>
              <div><span>Platform</span><b>MHD</b></div>
              <div><span>Current tune</span><b>Rev 4 • E40</b></div>
              <div><span>Status</span><b>Waiting on Doug</b></div>
              <div><span>Next action</span><b>Log review</b></div>
            </div>
            <div className={styles.bottom}><ShieldCheck size={15}/><div><b>Not included in the customer scope</b><p>Other customers, raw internal notes, internal automation logic, Wix payment payloads, raw tuner-only datalogs, integration credentials and staff tools.</p></div></div>
          </div>

          <div className={styles.card}>
            <h3>File authorization demo</h3>
            <div className={styles.files}>{files.map(file => <button className={styles.file} key={file.id} onClick={() => testFile(file)}><span className={styles.fileIcon}>{file.expected === "allowed" ? <CheckCircle2 size={14}/> : <LockKeyhole size={14}/>}</span><span><b>{file.name}</b><small>{file.detail}</small></span><em>Test</em></button>)}</div>
            {result && <div className={`${styles.result} ${result.allowed === false ? styles.denied : ""}`}><span>{result.loading ? "CHECKING" : result.allowed ? "ACCESS APPROVED" : "ACCESS DENIED"}</span><b>{result.file}</b><small>{result.loading ? "Evaluating customer identity, project ownership and file visibility…" : result.message}</small></div>}
          </div>
        </div>
      </section>}
    </div>
  </main>;
}

"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound, Wrench } from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email,setEmail]=useState("");
  const [audience,setAudience]=useState("internal");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const next = params.get("next") || "/";
  const requested = params.get("audience");
  const selected = requested === "customer" ? "customer" : audience;
  const config = useMemo(() => ({
    url: process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY,
  }), []);
  const liveReady = Boolean(config.url && config.key);

  async function sendLink(event) {
    event.preventDefault();
    if (!liveReady) return setStatus("Supabase auth is not attached yet. Use a preview identity below.");
    setBusy(true); setStatus("");
    try {
      const supabase = createClient(config.url, config.key, { auth:{ detectSessionInUrl:true, persistSession:true } });
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/confirm?audience=${selected}&next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo:redirectTo, shouldCreateUser:false } });
      if (error) throw error;
      setStatus("Magic link sent. Check your email to continue.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <section className={styles.brandPanel}>
      <img src="/subpar-logo.png" alt="Subpar Tuning"/>
      <span>SUBPAR OS</span>
      <h1>One secure home for every tune.</h1>
      <p>Internal tuning operations and the customer portal now use separate identities, permissions and private file access.</p>
      <div className={styles.points}><div><ShieldCheck/>Role-based access</div><div><LockKeyhole/>Private tune files</div><div><KeyRound/>Short-lived sessions</div></div>
    </section>

    <section className={styles.loginPanel}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>SECURE ACCESS</span>
        <h2>{selected === "customer" ? "Customer portal" : "Subpar team login"}</h2>
        <p>{selected === "customer" ? "Access your vehicle, current tune, files and next steps." : "Access the tuning dashboard, customer queue, revisions and logs."}</p>

        <div className={styles.audience}>
          <button className={selected === "internal" ? styles.active : ""} onClick={()=>setAudience("internal")}><Wrench size={15}/>Team</button>
          <button className={selected === "customer" ? styles.active : ""} onClick={()=>setAudience("customer")}><UserRound size={15}/>Customer</button>
        </div>

        <form onSubmit={sendLink}>
          <label>Email address</label>
          <div className={styles.input}><Mail size={16}/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder={selected === "customer" ? "you@example.com" : "doug@subpartuning.com"}/></div>
          <button className={styles.primary} disabled={busy}>{busy ? "Sending…" : "Email me a secure link"}<ArrowRight size={15}/></button>
        </form>
        {status && <div className={styles.status}>{status}</div>}

        {!liveReady && <div className={styles.preview}>
          <span>PREVIEW MODE</span><p>Real authentication stays off until the isolated Subpar Supabase project is attached.</p>
          <div><a href="/">Preview as Doug</a><a href="/portal/SP-1842">Preview as Alex</a><a href="/security">Security center</a></div>
        </div>}
      </div>
    </section>
  </main>;
}

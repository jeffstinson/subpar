"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

export default function ConfirmPage(){
  const [message,setMessage]=useState("Securing your Subpar OS session…");
  useEffect(()=>{
    let cancelled=false;
    async function run(){
      try{
        const url=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL;
        const key=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY;
        if(!url||!key) throw new Error("Supabase authentication is not configured on this deployment.");
        const supabase=createClient(url,key,{auth:{detectSessionInUrl:true,persistSession:true}});
        let session=(await supabase.auth.getSession()).data.session;
        if(!session){
          await new Promise(r=>setTimeout(r,900));
          session=(await supabase.auth.getSession()).data.session;
        }
        if(!session?.access_token) throw new Error("The sign-in link is invalid or has expired.");
        const response=await fetch("/api/v1/auth/session",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});
        const body=await response.json();
        if(!response.ok) throw new Error(body.error||"Unable to create Subpar OS session.");
        if(cancelled)return;
        setMessage(`Welcome, ${body.principal.displayName}. Redirecting…`);
        const params=new URLSearchParams(window.location.search);
        const audience=params.get("audience");
        const next=params.get("next") || (audience==="customer"?"/portal/SP-1842":"/");
        window.setTimeout(()=>window.location.replace(next),500);
      }catch(error){ if(!cancelled)setMessage(error.message); }
    }
    run(); return()=>{cancelled=true};
  },[]);
  return <main style={{minHeight:"100vh",background:"#090c0b",color:"#edf4ee",display:"grid",placeItems:"center",fontFamily:"Inter,system-ui,sans-serif",padding:24}}><div style={{width:"min(480px,100%)",padding:32,border:"1px solid #27322b",borderRadius:20,background:"#101512",textAlign:"center",boxShadow:"0 30px 80px rgba(0,0,0,.35)"}}><ShieldCheck size={34} style={{color:"#65bf7f",marginBottom:14}}/><h1 style={{fontSize:28,margin:"0 0 10px"}}>Subpar OS</h1><p style={{color:"#93a098",lineHeight:1.6}}>{message}</p>{message.includes("Redirecting")?<CheckCircle2 size={20} style={{color:"#65bf7f"}}/>:<Loader2 size={20} style={{animation:"spin 1s linear infinite",color:"#65bf7f"}}/>}</div></main>;
}

"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function SessionSync(){
  useEffect(()=>{
    const url=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUBPAR_SUPABASE_ANON_KEY;
    if(!url||!key)return;
    const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const path=window.location.pathname;
    const params=new URLSearchParams(window.location.search);
    let cancelled=false;

    async function sync(session){
      if(cancelled||!session?.access_token)return;
      await fetch("/api/v1/auth/session",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"}).catch(()=>{});
    }

    async function start(){
      if(path==="/login"&&params.get("signedOut")==="1"){
        await supabase.auth.signOut().catch(()=>{});
        return;
      }
      if(path!=="/login"&&!path.startsWith("/auth/")){
        const {data}=await supabase.auth.getSession();
        if(data.session)await sync(data.session);
      }
    }
    start();

    const {data:listener}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_OUT"){
        await fetch("/api/v1/auth/session",{method:"DELETE",cache:"no-store"}).catch(()=>{});
        return;
      }
      if(event==="SIGNED_IN"||event==="TOKEN_REFRESHED")await sync(session);
    });
    return()=>{cancelled=true;listener.subscription.unsubscribe();};
  },[]);
  return null;
}

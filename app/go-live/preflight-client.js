"use client";

import { useState } from "react";
import { CheckCircle2, Database, HardDrive, KeyRound, Mail, RefreshCw, ShieldCheck, ShoppingBag, TriangleAlert } from "lucide-react";
import styles from "./go-live.module.css";

const tests=[
  {id:"supabase",label:"Database schema",detail:"Expected tables + migration ledger",Icon:Database,external:false},
  {id:"storage",label:"Private storage",detail:"Five buckets exist and stay private",Icon:HardDrive,external:false},
  {id:"wix",label:"Wix OAuth",detail:"Authenticate to Doug’s Wix installation only",Icon:ShoppingBag,external:true},
  {id:"gmail",label:"Gmail OAuth",detail:"Authenticate + read mailbox profile only",Icon:Mail,external:true},
];

export default function PreflightClient({connectionTestsEnabled=false,realDataApproved=false}){
  const [selected,setSelected]=useState(["supabase","storage"]);
  const [result,setResult]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  function toggle(id){setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id])}

  async function run(){
    setBusy(true);setError("");setResult(null);
    try{
      const res=await fetch("/api/v1/go-live/preflight",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scopes:selected,principal:"doug"})});
      const body=await res.json();
      if(!res.ok)throw new Error(body.error||"Preflight failed");
      setResult(body.result);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  return <section className={styles.planner}>
    <div className={styles.sectionHead}><div><span>CONNECTION PREFLIGHT</span><h2>Test each layer without exposing a secret</h2></div><ShieldCheck size={19}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>{tests.map(({id,label,detail,Icon,external})=>{
      const active=selected.includes(id);
      const gated=external&&(!connectionTestsEnabled||!realDataApproved);
      return <button key={id} onClick={()=>toggle(id)} style={{textAlign:"left",border:`1px solid ${active?"#3d6a49":"#232c27"}`,background:active?"rgba(97,189,124,.07)":"#0b0f0d",color:"#d7dfda",borderRadius:11,padding:12,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><Icon size={16} color={active?"#75ca8b":"#69756d"}/><span style={{fontSize:7,color:gated?"#a78a67":"#698078",letterSpacing:".1em",fontWeight:900}}>{gated?"GATED":active?"SELECTED":"OPTIONAL"}</span></div>
        <b style={{display:"block",fontSize:11,marginTop:10}}>{label}</b><small style={{display:"block",fontSize:8,color:"#758078",lineHeight:1.4,marginTop:3}}>{detail}</small>
      </button>
    })}</div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12,flexWrap:"wrap"}}><button className={styles.primary} style={{width:"auto",marginTop:0,paddingLeft:16,paddingRight:16}} onClick={run} disabled={busy||!selected.length}>{busy?<RefreshCw className={styles.spin} size={14}/>:<KeyRound size={14}/>}Run selected preflight</button><span style={{fontSize:8,color:"#6f7a73"}}>Supabase/storage are non-provider checks. Wix/Gmail probes require the connection-test + real-data gates.</span></div>
    {error&&<div className={styles.error}><TriangleAlert size={14}/>{error}</div>}
    {result&&<div style={{marginTop:14,display:"grid",gap:7}}>{result.tests.map(test=><div key={test.provider} style={{display:"grid",gridTemplateColumns:"28px 110px 1fr auto",gap:8,alignItems:"center",border:"1px solid #1f2823",background:"#0b0f0d",borderRadius:9,padding:"9px 10px"}}><span style={{width:23,height:23,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",background:test.status==="pass"?"rgba(97,189,124,.1)":test.status==="fail"?"rgba(190,91,63,.1)":"#151917",color:test.status==="pass"?"#77cd8d":test.status==="fail"?"#dd8d71":"#727d76"}}>{test.status==="pass"?<CheckCircle2 size={13}/>:test.status==="fail"?<TriangleAlert size={13}/>:<KeyRound size={13}/>}</span><b style={{fontSize:9,textTransform:"uppercase"}}>{test.provider}</b><span style={{fontSize:9,color:"#849087"}}>{test.detail}</span><em style={{fontSize:8,fontStyle:"normal",color:"#667169"}}>{test.latencyMs??0} ms</em></div>)}</div>}
  </section>;
}

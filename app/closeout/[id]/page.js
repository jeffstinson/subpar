import Link from "next/link";
import { ArrowLeft,ChevronRight } from "lucide-react";
import { getLifecycleWorkspace,lifecycleReadiness } from "../../server/tune-lifecycle";
import CloseoutClient from "./closeout-client";

export default async function CloseoutPage({params}){
  const {id}=await params;
  const workspace=await getLifecycleWorkspace({projectNumber:id});
  const readiness=lifecycleReadiness();
  return <main style={{minHeight:"100vh",background:"#090c0b"}}>
    <header style={{height:70,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",borderBottom:"1px solid #202824",color:"#dce7e0",fontFamily:"Inter,ui-sans-serif,system-ui,sans-serif"}}>
      <Link href={`/project/${workspace.project?.projectNumber||id}`} style={{display:"flex",gap:7,alignItems:"center",color:"#a7b6ad",textDecoration:"none",fontSize:12}}><ArrowLeft size={14}/>Project</Link>
      <div style={{display:"flex",gap:10,alignItems:"center"}}><img src="/subpar-logo.png" alt="Subpar Tuning" style={{width:34,height:34,objectFit:"contain"}}/><div style={{display:"flex",flexDirection:"column"}}><b style={{fontSize:11,letterSpacing:".13em"}}>SUBPAR OS</b><span style={{fontSize:9,color:"#6fd59b",letterSpacing:".16em"}}>TUNE LIFECYCLE</span></div></div>
      <div style={{display:"flex",gap:12}}><Link href={`/delivery/${workspace.project?.projectNumber||id}`} style={{display:"flex",gap:5,alignItems:"center",color:"#9fb0a6",textDecoration:"none",fontSize:11}}>Revision delivery <ChevronRight size={12}/></Link><Link href={`/portal/${workspace.project?.projectNumber||id}/history`} style={{display:"flex",gap:5,alignItems:"center",color:"#9fb0a6",textDecoration:"none",fontSize:11}}>Customer history <ChevronRight size={12}/></Link></div>
    </header>
    <CloseoutClient initialWorkspace={workspace} readiness={readiness}/>
  </main>;
}

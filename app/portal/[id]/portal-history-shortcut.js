"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { usePathname } from "next/navigation";

export default function PortalHistoryShortcut({projectNumber}){
  const pathname=usePathname();
  if(pathname?.endsWith("/history"))return null;
  return <Link href={`/portal/${encodeURIComponent(projectNumber)}/history`} style={{position:"fixed",right:18,bottom:82,zIndex:70,display:"flex",alignItems:"center",gap:7,padding:"9px 12px",border:"1px solid #31523d",borderRadius:999,background:"rgba(15,25,19,.94)",boxShadow:"0 12px 36px rgba(0,0,0,.35)",color:"#a9ebbf",textDecoration:"none",font:"700 10px Inter,ui-sans-serif,system-ui,sans-serif",letterSpacing:".04em",backdropFilter:"blur(12px)"}}><History size={14}/>Tune history</Link>;
}

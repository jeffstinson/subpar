import Link from "next/link";

export default function NotFound(){
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"radial-gradient(700px 380px at 50% 20%,rgba(52,151,81,.08),transparent 65%),#090a0a",color:"#eef2ef",fontFamily:"Inter,system-ui,sans-serif",padding:24}}>
    <section style={{width:"min(520px,100%)",border:"1px solid #2a2e2b",borderRadius:16,background:"linear-gradient(180deg,#151715,#111312)",padding:28,textAlign:"center"}}>
      <img src="/subpar-logo.png" alt="Subpar Tuning" style={{width:64,height:64,borderRadius:"50%",background:"#fff"}}/>
      <div style={{marginTop:16,color:"#64bd7e",fontSize:9,fontWeight:900,letterSpacing:".15em"}}>SUBPAR OS</div>
      <h1 style={{fontSize:28,letterSpacing:"-.04em",margin:"8px 0"}}>That workspace isn’t here.</h1>
      <p style={{fontSize:11,lineHeight:1.6,color:"#7f8981",margin:"0 auto 18px",maxWidth:420}}>The project may have moved, the demo route may have changed, or the link may be incomplete.</p>
      <Link href="/" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",height:38,padding:"0 14px",borderRadius:9,border:"1px solid #2d9254",background:"#176b38",color:"#fff",fontSize:10,fontWeight:800,textDecoration:"none"}}>Back to dashboard</Link>
    </section>
  </main>
}

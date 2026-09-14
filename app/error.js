"use client";

export default function Error({error,reset}){
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#090a0a",color:"#eef2ef",fontFamily:"Inter,system-ui,sans-serif",padding:24}}>
    <section style={{width:"min(560px,100%)",border:"1px solid #3a302f",borderRadius:16,background:"linear-gradient(180deg,#171514,#111212)",padding:28}}>
      <div style={{color:"#e8877f",fontSize:9,fontWeight:900,letterSpacing:".14em"}}>SUBPAR OS • WORKSPACE ERROR</div>
      <h1 style={{fontSize:26,letterSpacing:"-.04em",margin:"9px 0"}}>This view hit a problem.</h1>
      <p style={{fontSize:11,lineHeight:1.6,color:"#8a928c",margin:"0 0 18px"}}>The rest of the app is still available. Retry this view, and if it keeps happening the production version will capture the error in the audit trail.</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={reset} style={{height:38,padding:"0 14px",borderRadius:9,border:"1px solid #2d9254",background:"#176b38",color:"#fff",fontSize:10,fontWeight:800,cursor:"pointer"}}>Try again</button>
        <button onClick={()=>window.location.href="/"} style={{height:38,padding:"0 14px",borderRadius:9,border:"1px solid #353a36",background:"#171918",color:"#dce2dd",fontSize:10,fontWeight:800,cursor:"pointer"}}>Dashboard</button>
      </div>
      {error?.digest&&<div style={{marginTop:16,fontSize:8,color:"#5f6761"}}>Reference: {error.digest}</div>}
    </section>
  </main>
}

export default function Loading(){
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#090a0a",color:"#eef2ef",fontFamily:"Inter,system-ui,sans-serif"}}>
    <div style={{textAlign:"center"}}>
      <img src="/subpar-logo.png" alt="Subpar Tuning" style={{width:58,height:58,borderRadius:"50%",background:"#fff"}}/>
      <div style={{marginTop:14,fontSize:11,fontWeight:900,letterSpacing:".14em"}}>SUBPAR OS</div>
      <div style={{marginTop:5,fontSize:9,color:"#64bd7e",letterSpacing:".12em"}}>LOADING TUNING WORKSPACE…</div>
    </div>
  </main>
}

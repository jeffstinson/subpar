import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Subpar OS — Tuning Operations Preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{width:"100%",height:"100%",display:"flex",background:"#090a0a",color:"white",fontFamily:"Arial, sans-serif",padding:"54px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:"-40px",top:"-80px",width:"520px",height:"520px",borderRadius:"50%",background:"radial-gradient(circle, rgba(52,151,84,.26), rgba(9,10,10,0) 68%)"}}/>
        <div style={{display:"flex",flexDirection:"column",width:"100%",justifyContent:"space-between",position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:"18px"}}>
            <div style={{width:"68px",height:"68px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:"#176b38",border:"2px solid #4aae6b",fontSize:"24px",fontWeight:800}}>ST</div>
            <div style={{display:"flex",flexDirection:"column"}}>
              <div style={{fontSize:"26px",fontWeight:800,letterSpacing:"3px"}}>SUBPAR OS</div>
              <div style={{fontSize:"13px",color:"#66c081",letterSpacing:"4px",marginTop:"7px"}}>TUNING OPERATIONS PREVIEW</div>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",maxWidth:"930px"}}>
            <div style={{fontSize:"64px",lineHeight:1.02,fontWeight:800,letterSpacing:"-3px"}}>One place to run the entire tuning workflow.</div>
            <div style={{fontSize:"23px",lineHeight:1.45,color:"#9aa39c",marginTop:"22px"}}>Tune projects • vehicle-aware automations • datalogs • revisions • Gmail • customer portal</div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
            <div style={{display:"flex",gap:"9px"}}>{["MHD","bootmod3","EcuTek","Wix","Gmail","Datazap"].map(x=><div key={x} style={{fontSize:"14px",color:"#c9d0cb",border:"1px solid #303632",borderRadius:"999px",padding:"9px 13px",background:"#131513"}}>{x}</div>)}</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}><div style={{fontSize:"15px",color:"#65bd7f",fontWeight:700}}>LIVE PREVIEW</div><div style={{fontSize:"13px",color:"#707870",marginTop:"4px"}}>Subpar Tuning</div></div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

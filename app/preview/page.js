import Link from "next/link";
import { ArrowRight, Activity, Bot, Car, FileText, Gauge, Mail, Settings, Users } from "lucide-react";

export const metadata = {
  title: "Subpar OS Preview — Subpar Tuning",
  description: "Preview the Subpar Tuning operating system: tune projects, customer and vehicle history, automations, logs, revisions, messages and customer portal workflows.",
  openGraph: {
    title: "Subpar OS — Tuning Operations Preview",
    description: "A tuner-first operating system for Subpar Tuning. Preview tune projects, automations, logs, revisions, messages and customer workflows.",
    url: "https://subpar-two.vercel.app/preview",
    siteName: "Subpar Tuning",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Subpar OS — Tuning Operations Preview",
    description: "Preview the tuner-first operating system being built for Subpar Tuning."
  }
};

const features = [
  [Gauge, "Tune Projects", "Customer, vehicle, order, revisions, files and logs stay together from purchase through delivery."],
  [Bot, "Automations", "Trigger requests and follow-ups from engine, vehicle, platform, fuel, status and missing requirements."],
  [Activity, "Datalog Workflow", "Surface MHD, bootmod3, EcuTek and Datazap activity in one review queue."],
  [Mail, "Messages", "Keep Gmail conversations attached to the correct customer, vehicle and tune project."],
  [Car, "Vehicle History", "Build a permanent record for every car Doug tunes, including hardware, fuel, platform and revisions."],
  [Users, "Customer Portal", "Customers see status, required files, revisions, messages and the next thing they need to do."]
];

export default function PreviewPage() {
  return (
    <main className="previewRoot">
      <header className="previewNav">
        <div className="previewBrand">
          <img src="/subpar-logo.png" alt="Subpar Tuning" />
          <div><b>SUBPAR OS</b><span>TUNING OPERATIONS PREVIEW</span></div>
        </div>
        <div className="previewNavActions">
          <Link href="/" className="previewGhost">Open Dashboard</Link>
          <Link href="/project/SP-1842" className="previewPrimary">Open Demo Project <ArrowRight size={14}/></Link>
        </div>
      </header>

      <section className="previewHero">
        <div className="previewHeroCopy">
          <span className="previewEyebrow">SUBPAR TUNING • PRODUCT PREVIEW</span>
          <h1>One place to run the entire tuning workflow.</h1>
          <p>Subpar OS is being built around how Doug actually works: customers, vehicles, stock-file requests, tuning parameter packs, datalogs, revisions, Gmail communication and customer follow-up — without replacing Wix, MHD, bootmod3 or EcuTek.</p>
          <div className="previewActions">
            <Link href="/project/SP-1842" className="previewPrimary big">View Alex&apos;s Demo Tune <ArrowRight size={15}/></Link>
            <Link href="/" className="previewGhost big">Explore Dashboard</Link>
          </div>
          <div className="previewPills">
            <span>MHD</span><span>bootmod3</span><span>EcuTek</span><span>Wix</span><span>Gmail</span><span>Datazap</span>
          </div>
        </div>
        <div className="previewStage">
          <div className="stageGlow"/>
          <div className="stageCard">
            <div className="stageTop"><span>ACTIVE TUNE PROJECT</span><em>Needs Doug</em></div>
            <div className="stageIdentity"><div className="stageAvatar">AR</div><div><h2>Alex Rivera</h2><p>2021 BMW M340i • B58TU • MHD</p></div></div>
            <div className="stageStats"><div><span>Fuel</span><b>E40</b></div><div><span>Revision</span><b>Rev 4</b></div><div><span>Status</span><b>Log Uploaded</b></div></div>
            <div className="stageTask"><Activity size={16}/><div><span>NEXT ACTION</span><b>Review 2 new MHD logs</b></div></div>
            <div className="stageAutomation"><Settings size={15}/><div><b>Vehicle-aware automation</b><span>MHD stock file + B58TU parameter pack handled automatically.</span></div></div>
          </div>
        </div>
      </section>

      <section className="previewSection">
        <div className="previewSectionHead"><span className="previewEyebrow">WHAT&apos;S BEING BUILT</span><h2>Built for the tuner first.</h2><p>The dashboard is centered around one question: what needs Doug&apos;s attention right now?</p></div>
        <div className="previewFeatureGrid">{features.map(([Icon,title,text]) => <article key={title}><div className="featureIcon"><Icon size={17}/></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="previewAutomation">
        <div><span className="previewEyebrow">AUTOMATION EXAMPLE</span><h2>M340i + B58TU + MHD</h2><p>Once the vehicle and platform are known, Subpar OS can automatically ask for the right information and files before Doug ever touches the project.</p></div>
        <div className="automationFlow">
          <div><span>01</span><b>Vehicle identified</b><small>2021 M340i • B58TU</small></div>
          <ArrowRight size={15}/>
          <div><span>02</span><b>MHD detected</b><small>Correct workflow selected</small></div>
          <ArrowRight size={15}/>
          <div><span>03</span><b>Request stock file</b><small>Requirement tracked automatically</small></div>
          <ArrowRight size={15}/>
          <div><span>04</span><b>Send parameter pack</b><small>B58TU-specific logging setup</small></div>
        </div>
      </section>

      <section className="previewCta">
        <img src="/subpar-logo.png" alt="Subpar Tuning" />
        <div><span className="previewEyebrow">LIVE WORKING PREVIEW</span><h2>Open the first complete tune project.</h2><p>Alex&apos;s demo project is the feedback target for workflow, layout, information density and tuner actions.</p></div>
        <Link href="/project/SP-1842" className="previewPrimary big">Open Alex&apos;s Project <ArrowRight size={15}/></Link>
      </section>

      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#090a0a;color:#f4f6f4;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.previewRoot{min-height:100vh;background:radial-gradient(800px 420px at 72% 8%,rgba(49,147,79,.11),transparent 60%),linear-gradient(180deg,#090a0a,#0d0f0e)}.previewNav{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 5vw;border-bottom:1px solid #262a27;background:rgba(9,10,10,.84);backdrop-filter:blur(16px);position:sticky;top:0;z-index:10}.previewBrand{display:flex;align-items:center;gap:12px}.previewBrand img{width:46px;height:46px;border-radius:50%;background:#fff}.previewBrand b{display:block;font-size:13px;letter-spacing:.12em}.previewBrand span{display:block;color:#65bd7f;font-size:8px;letter-spacing:.15em;margin-top:4px}.previewNavActions,.previewActions{display:flex;gap:9px;align-items:center}.previewPrimary,.previewGhost{display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;border-radius:9px;font-size:10px;font-weight:800;padding:10px 13px}.previewPrimary{background:linear-gradient(180deg,#238149,#176b38);border:1px solid #2f9556;color:#fff;box-shadow:0 12px 30px rgba(23,107,56,.16)}.previewGhost{background:#151715;border:1px solid #303431;color:#d9ddda}.big{padding:12px 16px;font-size:11px}.previewHero{max-width:1450px;margin:0 auto;display:grid;grid-template-columns:1.03fr .97fr;gap:60px;align-items:center;padding:95px 5vw 82px}.previewHeroCopy h1{font-size:58px;line-height:.98;letter-spacing:-.055em;margin:13px 0 18px;max-width:720px}.previewHeroCopy>p{font-size:15px;line-height:1.75;color:#939b95;max-width:720px}.previewEyebrow{font-size:9px;letter-spacing:.18em;font-weight:900;color:#64bd7e}.previewActions{margin-top:28px}.previewPills{display:flex;flex-wrap:wrap;gap:7px;margin-top:25px}.previewPills span{font-size:8px;color:#89928b;border:1px solid #2c302d;background:#131513;border-radius:999px;padding:6px 9px}.previewStage{position:relative;min-height:460px;display:grid;place-items:center}.stageGlow{position:absolute;width:390px;height:390px;border-radius:50%;background:radial-gradient(circle,rgba(45,151,82,.16),transparent 68%);filter:blur(7px)}.stageCard{width:min(100%,560px);position:relative;background:linear-gradient(180deg,#171a18,#111312);border:1px solid #333934;border-radius:18px;padding:23px;box-shadow:0 36px 90px rgba(0,0,0,.5)}.stageTop{display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#6d766f;letter-spacing:.13em}.stageTop em{font-style:normal;color:#eb7068;background:#2a1514;border:1px solid #60302c;border-radius:999px;padding:5px 8px;letter-spacing:0}.stageIdentity{display:flex;align-items:center;gap:13px;padding:24px 0 19px;border-bottom:1px solid #2a2e2b}.stageAvatar{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#17341f;border:1px solid #36734a;color:#dff3e4;font-size:14px;font-weight:900}.stageIdentity h2{font-size:21px;margin:0}.stageIdentity p{font-size:9px;color:#747d76;margin:5px 0 0}.stageStats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}.stageStats div{background:#111311;border:1px solid #292e2a;border-radius:10px;padding:11px}.stageStats span{display:block;color:#677068;font-size:7px;text-transform:uppercase;letter-spacing:.1em}.stageStats b{display:block;font-size:10px;margin-top:4px}.stageTask,.stageAutomation{display:flex;align-items:center;gap:10px;border-radius:11px;padding:13px;margin-top:9px}.stageTask{border:1px solid #34523e;background:#142019;color:#6bc986}.stageAutomation{border:1px solid #2e3430;background:#141715;color:#88918a}.stageTask span{display:block;font-size:7px;letter-spacing:.12em}.stageTask b,.stageAutomation b{display:block;color:#ecf0ed;font-size:9px;margin-top:2px}.stageAutomation span{display:block;font-size:7px;color:#768078;margin-top:3px}.previewSection{max-width:1450px;margin:0 auto;padding:70px 5vw}.previewSectionHead h2,.previewAutomation h2,.previewCta h2{font-size:34px;letter-spacing:-.04em;margin:8px 0}.previewSectionHead p,.previewAutomation>div>p,.previewCta p{color:#838c85;font-size:11px;line-height:1.6;margin:0}.previewFeatureGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px}.previewFeatureGrid article{background:linear-gradient(180deg,#151715,#111211);border:1px solid #292d2a;border-radius:14px;padding:19px;min-height:160px}.featureIcon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#17251b;border:1px solid #2b4b34;color:#68c181}.previewFeatureGrid h3{font-size:12px;margin:14px 0 7px}.previewFeatureGrid p{font-size:9px;color:#7d867f;line-height:1.6;margin:0}.previewAutomation{max-width:1320px;margin:20px auto 75px;padding:27px;border:1px solid #2e342f;background:radial-gradient(500px 240px at 12% 10%,rgba(43,134,70,.08),transparent 60%),#121412;border-radius:18px}.automationFlow{display:flex;align-items:center;gap:9px;margin-top:24px}.automationFlow>div{flex:1;min-height:92px;background:#0f1110;border:1px solid #292d2a;border-radius:11px;padding:12px}.automationFlow>div>span{color:#65bd7f;font-size:8px}.automationFlow b{display:block;font-size:9px;margin-top:8px}.automationFlow small{display:block;color:#687169;font-size:7px;margin-top:4px}.automationFlow>svg{color:#4d5750;flex:none}.previewCta{max-width:1320px;margin:0 auto 80px;display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;padding:26px;border:1px solid #304034;background:#121814;border-radius:18px}.previewCta>img{width:64px;height:64px;border-radius:50%;background:#fff}.previewCta h2{font-size:24px}.previewCta p{max-width:700px}@media(max-width:1000px){.previewHero{grid-template-columns:1fr;padding-top:60px}.previewHeroCopy h1{font-size:46px}.previewFeatureGrid{grid-template-columns:repeat(2,1fr)}.automationFlow{display:grid;grid-template-columns:1fr 1fr}.automationFlow>svg{display:none}.previewCta{grid-template-columns:auto 1fr}.previewCta>.previewPrimary{grid-column:1/-1}}@media(max-width:680px){.previewNav{height:auto;padding:12px 16px;gap:12px}.previewNavActions .previewGhost{display:none}.previewHero{padding:50px 18px 55px}.previewHeroCopy h1{font-size:39px}.previewFeatureGrid{grid-template-columns:1fr}.previewSection{padding:55px 18px}.previewAutomation,.previewCta{margin-left:18px;margin-right:18px}.automationFlow{grid-template-columns:1fr}.previewCta{grid-template-columns:1fr;text-align:center}.previewCta>img{margin:auto}.previewActions{align-items:stretch;flex-direction:column}.previewActions a{width:100%}.previewBrand span{display:none}}
      `}</style>
    </main>
  );
}

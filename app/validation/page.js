import Link from "next/link";
import { ArrowLeft,CheckCircle2,Code2,ExternalLink,FileCheck2,GitBranch,PlayCircle,ShieldCheck,TerminalSquare } from "lucide-react";
import styles from "./validation.module.css";

const gates=[
  {icon:FileCheck2,title:"Repository invariants",command:"npm run validate:repo",items:["Exactly one migration per version 0001–0016","No migration gaps or duplicate numbers","Safe .env defaults keep every write/send gate OFF","Schema manifests agree on 0016","Activation + portal route protection exists","Archived final-tune download remains pinned and immutable","Service-only RPCs stay revoked from browser roles"]},
  {icon:Code2,title:"Production build",command:"npm run build",items:["Next.js production compile","Server/client module graph resolution","Route compilation","Static rendering and CSS module validation","No dependency on real Supabase/Wix/Gmail credentials"]},
  {icon:PlayCircle,title:"Demo runtime smoke",command:"npm run smoke:demo",items:["/api/health + /api/v1/readiness","Doug internal dashboard access in demo mode","SP-1842 repository resolution","Customer tune-history isolation path","Archived final download stays dry-run","Generic mutations remain dry-run","Activation Audit synthetic foundation passes"]},
];

export default function ValidationPage(){
  const commit=process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA||"local / unknown";
  const env=process.env.NEXT_PUBLIC_SUBPAR_ENV||"preview";
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/activation"><ArrowLeft size={14}/>Activation</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>QUALITY GATES</span></div></div>
      <span className={styles.internal}><ShieldCheck size={13}/>Internal</span>
    </header>

    <section className={styles.hero}>
      <div><span>CI / REGRESSION CONTROL · SCHEMA 0016</span><h1>Every commit proves the safe path still works.</h1><p>GitHub Actions now validates repository invariants, compiles the real Next.js production build, boots that build with every dangerous integration gate disabled, and exercises the core synthetic API flow.</p><div className={styles.meta}><b>{env}</b><b>{String(commit).slice(0,12)}</b><b>Node 22</b><b>zero live provider writes</b></div></div>
      <aside><GitBranch size={25}/><span>REQUIRED PIPELINE</span><b>Subpar OS CI</b><p>Repository → Build → Runtime Smoke</p><a href="https://github.com/jeffstinson/subpar/actions/workflows/subpar-ci.yml" target="_blank" rel="noreferrer">Open GitHub Actions <ExternalLink size={12}/></a></aside>
    </section>

    <section className={styles.grid}>{gates.map(({icon:Icon,title,command,items},index)=><article key={title}>
      <header><i>{index+1}</i><Icon size={18}/><div><span>GATE {index+1}</span><h2>{title}</h2></div></header>
      <code><TerminalSquare size={13}/>{command}</code>
      <div className={styles.items}>{items.map(item=><div key={item}><CheckCircle2 size={13}/><span>{item}</span></div>)}</div>
    </article>)}</section>

    <section className={styles.footer}>
      <div><span>WHY THIS EXISTS</span><h2>CI is now independent of Vercel deployment capacity.</h2><p>Even if Vercel rate-limits a deployment, GitHub Actions can still tell us whether the repository itself compiles and whether the safe demo runtime passes. A deployment is still not called live until the hosting status is separately confirmed.</p></div>
      <div className={styles.commands}><b>Local preflight</b><code>npm install</code><code>npm run validate:repo</code><code>npm run build</code><code>npm run start -- -p 3000</code><code>npm run smoke:demo</code></div>
    </section>
  </main>;
}

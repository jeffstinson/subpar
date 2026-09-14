import Link from "next/link";
import styles from "./project.module.css";

export default function ProjectPage({params}){
  const id=params?.id || "SP-1842";
  return <main className={styles.page}>
    <div className={styles.top}>
      <div>
        <Link className={styles.back} href="/">← Back to dashboard</Link>
        <div className={styles.eyebrow}>ACTIVE TUNE PROJECT • {id}</div>
        <h1 className={styles.title}>Alex Rivera — 2021 BMW M340i</h1>
        <div className={styles.sub}>B58TU • MHD • E40 • Rev 4 • Last activity 18 minutes ago</div>
      </div>
      <div className={styles.actions}>
        <button className={styles.btn}>Message customer</button>
        <button className={styles.btn}>Upload revision</button>
        <button className={`${styles.btn} ${styles.primary}`}>Mark log reviewed</button>
      </div>
    </div>

    <section className={styles.summary}>
      <div className={`${styles.card} ${styles.hero}`}>
        <div className={styles.heroTop}>
          <div className={styles.customer}>
            <div className={styles.avatar}>AR</div>
            <div><h2>Alex Rivera</h2><p>alex.rivera@gmail.com • Customer since 2025 • 2 vehicles</p></div>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>MHD</span><span className={`${styles.badge} ${styles.badgeBlue}`}>B58TU</span><span className={`${styles.badge} ${styles.badgeAmber}`}>E40</span><span className={`${styles.badge} ${styles.badgePurple}`}>Rev 4</span>
          </div>
        </div>
        <div className={styles.facts}>
          <div className={styles.fact}><span>Order</span><b>SP-1842</b></div>
          <div className={styles.fact}><span>VIN</span><b>WBA5U7C0…1284</b></div>
          <div className={styles.fact}><span>ECU / ROM</span><b>MG1CS003</b></div>
          <div className={styles.fact}><span>Fuel</span><b>E40 Flex</b></div>
          <div className={styles.fact}><span>Turbo</span><b>Stock</b></div>
          <div className={styles.fact}><span>HPFP</span><b>Dorch Stage 2</b></div>
          <div className={styles.fact}><span>Downpipe</span><b>High-flow</b></div>
          <div className={styles.fact}><span>Transmission</span><b>ZF8</b></div>
        </div>
      </div>
      <aside className={`${styles.card} ${styles.next}`}>
        <span>NEXT ACTION</span>
        <h3>Review 2 new MHD logs</h3>
        <p>Customer uploaded two fresh 3rd-gear pulls on Rev 4. Stock file and parameter pack are already complete.</p>
        <button className={`${styles.btn} ${styles.primary}`}>Open log review</button>
        <div className={styles.progress}><i/></div>
        <div className={styles.progressMeta}><span>Project progress</span><b>72%</b></div>
      </aside>
    </section>

    <div className={styles.layout}>
      <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Requirements & Intake</h3><p>Everything required before Doug can safely continue tuning.</p></div><span className={styles.badge}>4 / 5 complete</span></div>
          <div className={styles.body}><div className={styles.requirements}>
            <div className={styles.req}><span className={styles.dot}>✓</span><div><b>Vehicle intake</b><small>Hardware, fuel, transmission and goals received.</small></div><button>View</button></div>
            <div className={styles.req}><span className={styles.dot}>✓</span><div><b>MHD stock file</b><small>Uploaded Sep 12 • stock_backup.bin</small></div><button>Download</button></div>
            <div className={styles.req}><span className={styles.dot}>✓</span><div><b>Subpar B58TU MHD parameter pack</b><small>v3.2 sent automatically after stock file arrived.</small></div><button>View pack</button></div>
            <div className={styles.req}><span className={styles.dot}>✓</span><div><b>Baseline log</b><small>Received and reviewed before Rev 1.</small></div><button>Review</button></div>
            <div className={styles.req}><span className={`${styles.dot} ${styles.dotWait}`}>!</span><div><b>Current Rev 4 log review</b><small>2 new pulls waiting on Doug.</small></div><button>Review now</button></div>
          </div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Project Timeline</h3><p>Permanent history for this vehicle and tune.</p></div><span className={`${styles.badge} ${styles.badgeBlue}`}>18 events</span></div>
          <div className={styles.body}>
            <div className={styles.tabs}><span className={`${styles.tab} ${styles.active}`}>All</span><span className={styles.tab}>Revisions</span><span className={styles.tab}>Logs</span><span className={styles.tab}>Messages</span><span className={styles.tab}>Automation</span></div>
            <div className={styles.timeline}>
              <div className={styles.event}><i className={styles.eventDot}/><div><b>2 MHD logs uploaded</b><p>3rd gear pulls attached to Rev 4. HPFP and throttle channels present.</p></div><time>18m ago</time></div>
              <div className={styles.event}><i className={styles.eventDot}/><div><b>Customer message received</b><p>“Car feels much smoother on this revision.”</p></div><time>22m ago</time></div>
              <div className={styles.event}><i className={styles.eventDot}/><div><b>Rev 4 delivered</b><p>rev4_e40_m340i.bin sent with next-log instructions.</p></div><time>Yesterday</time></div>
              <div className={styles.event}><i className={styles.eventDot}/><div><b>Automation: requested new log</b><p>Triggered after Rev 4 delivery using B58TU + MHD + E40 workflow.</p></div><time>Yesterday</time></div>
              <div className={styles.event}><i className={styles.eventDot}/><div><b>Rev 3 reviewed</b><p>Boost and fuel pressure looked clean. Small timing cleanup requested.</p></div><time>Sep 11</time></div>
              <div className={styles.event}><i className={styles.eventDot}/><div><b>Parameter pack sent automatically</b><p>B58TU MHD Pack v3.2 attached after stock file requirement cleared.</p></div><time>Sep 9</time></div>
              <div className={styles.event}><i className={styles.eventDot}/><div><b>MHD stock file received</b><p>stock_backup.bin matched to VIN and archived permanently.</p></div><time>Sep 9</time></div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Latest Log Snapshot</h3><p>Rev 4 • 3rd gear • E40 • MHD CSV</p></div><button className={styles.btn}>Open Datazap ↗</button></div>
          <div className={styles.body}>
            <div className={styles.logs}>
              {[["Boost Target","24.0 psi",82],["Boost Actual","24.3 psi",84],["Lambda","0.81",78],["Timing Corr.","-1.5°",34],["HPFP Min","2,570 psi",88],["IAT Peak","118°F",62]].map(([a,b,w])=><div className={styles.metric} key={a}><span>{a}</span><b>{b}</b><div className={styles.bar}><i style={{width:`${w}%`}}/></div></div>)}
            </div>
            <div className={styles.note} style={{marginTop:12}}>Clean pull overall. No throttle closure. Small cylinder 4 correction around 5,700 RPM. Fuel pressure stays healthy through the hit.</div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Customer Communication</h3><p>Gmail thread stays attached to the project.</p></div><span className={styles.badge}>Synced</span></div>
          <div className={styles.body}>
            <div className={styles.message}><b>Alex Rivera</b><span>8:42 PM</span><p>Just uploaded two new logs. Car feels much smoother on this revision.</p></div>
            <div className={styles.message}><b>Doug</b><span>8:48 PM</span><p>Perfect. I have them attached to your tune now. I’ll review the pull and get back to you with the next step.</p></div>
            <div className={styles.composer}><input placeholder="Reply through Doug’s Gmail…"/><button>Send</button></div>
          </div>
        </section>
      </div>

      <aside className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Automations</h3><p>Rules active for this exact vehicle.</p></div><span className={styles.badge}>3 active</span></div>
          <div className={styles.body}><div className={styles.automation}>
            <div className={styles.rule}><div className={styles.ruleTop}><b>Request MHD stock file</b><small>Completed</small></div><div className={styles.flow}><span className={styles.chip}>MHD</span><span className={styles.arrow}>→</span><span className={styles.chip}>Stock file missing</span><span className={styles.arrow}>→</span><span className={styles.chip}>Email + portal task</span></div></div>
            <div className={styles.rule}><div className={styles.ruleTop}><b>Send B58TU parameter pack</b><small>Completed</small></div><div className={styles.flow}><span className={styles.chip}>Stock file received</span><span className={styles.arrow}>→</span><span className={styles.chip}>B58TU</span><span className={styles.arrow}>→</span><span className={styles.chip}>Pack v3.2</span></div></div>
            <div className={styles.rule}><div className={styles.ruleTop}><b>Request next log after revision</b><small>Active</small></div><div className={styles.flow}><span className={styles.chip}>Revision delivered</span><span className={styles.arrow}>→</span><span className={styles.chip}>Send instructions</span><span className={styles.arrow}>→</span><span className={styles.chip}>Await log</span></div></div>
          </div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Files</h3><p>Project-owned source and revision files.</p></div><button className={styles.btn}>+ Add</button></div>
          <div className={styles.body}><div className={styles.files}>
            <div className={styles.file}><div><b>stock_backup.bin</b><span>MHD stock file • Sep 9</span></div><em>Source</em></div>
            <div className={styles.file}><div><b>B58TU_MHD_Params_v3.2.pdf</b><span>Subpar parameter pack</span></div><em>Pack</em></div>
            <div className={styles.file}><div><b>alex_m340i_rev4_e40.bin</b><span>Delivered yesterday</span></div><em>Rev 4</em></div>
            <div className={styles.file}><div><b>rev4_pull_01.csv</b><span>MHD log • 18m ago</span></div><em>Log</em></div>
            <div className={styles.file}><div><b>rev4_pull_02.csv</b><span>MHD log • 18m ago</span></div><em>Log</em></div>
          </div></div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h3>Project Details</h3><p>Fast context without hunting.</p></div></div>
          <div className={styles.body}><div className={styles.sideList}>
            <div className={styles.sideItem}><span>Tune product</span><b>B58/B58TU Custom Tune</b></div>
            <div className={styles.sideItem}><span>Purchased via</span><b>Wix • Paid</b></div>
            <div className={styles.sideItem}><span>Assigned tuner</span><b>Doug Talmadge</b></div>
            <div className={styles.sideItem}><span>Current state</span><b>Log Uploaded → Needs Review</b></div>
            <div className={`${styles.sideItem} ${styles.callout}`}><span>Customer waiting</span><b>18 minutes</b></div>
          </div><div className={styles.footerNote}>Synthetic demo data for workflow/design feedback only.</div></div>
        </section>
      </aside>
    </div>
  </main>
}
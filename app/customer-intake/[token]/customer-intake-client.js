"use client";

import { useMemo,useState } from "react";
import { CheckCircle2, ChevronRight, Gauge, LockKeyhole, Send, TriangleAlert } from "lucide-react";
import { resolveVehicleIntelligence, vehicleIntelligenceCatalog } from "../../lib/vehicle-intelligence";
import styles from "./customer-intake.module.css";

const presets=vehicleIntelligenceCatalog.map(vehicle=>({
  key:vehicle.key,
  label:`${vehicle.make} ${vehicle.label} · ${vehicle.chassis.join("/")}`,
  make:vehicle.make,
  model:vehicle.model,
  chassis:vehicle.chassis[0],
  engines:vehicle.engineFamilies,
}));

export default function CustomerIntakeClient({token,intake}){
  const source=intake.vehiclePayload||{};
  const [form,setForm]=useState({year:source.year||"",make:source.make||"BMW",model:source.model||"",chassis:source.chassis||"",engine:source.engine||"",transmission:source.transmission||"",platform:source.platform||intake.platform||"",fuel:source.fuel||"",vin:source.vin||"",goals:source.goals||"",notes:source.notes||"",hardware:{turbo:source.hardware?.turbo||"",downpipe:source.hardware?.downpipe||"",fuelSystem:source.hardware?.fuelSystem||"",intake:source.hardware?.intake||"",other:source.hardware?.other||""}});
  const [preset,setPreset]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");
  const required=useMemo(()=>[form.year,form.make,form.model,form.chassis,form.engine,form.transmission,form.platform,form.fuel].filter(Boolean).length,[form]);
  const intelligence=useMemo(()=>resolveVehicleIntelligence(form),[form]);

  function change(key,value){setForm(current=>({...current,[key]:value}))}
  function hardware(key,value){setForm(current=>({...current,hardware:{...current.hardware,[key]:value}}))}
  function choose(value){
    setPreset(value);
    if(!value)return;
    const found=presets.find(item=>item.key===value);
    if(!found)return;
    setForm(current=>({...current,make:found.make,model:found.model,chassis:found.chassis,engine:found.engines.length===1?found.engines[0]:current.engine&&found.engines.includes(current.engine)?current.engine:found.engines[0]||""}));
  }

  async function submit(){
    setBusy(true);setError("");setResult(null);
    try{
      const response=await fetch(`/api/v1/intake/customer/${encodeURIComponent(token)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to submit intake");setResult(body);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  if(result?.evaluation?.complete)return <section className={styles.complete}><div className={styles.completeIcon}><CheckCircle2 size={28}/></div><span>INTAKE RECEIVED</span><h2>Doug has what he needs to review the car.</h2><p>Your vehicle information is now staged with order {intake.externalOrderId||intake.orderId}. Subpar Tuning will review exact ECU/ROM and hardware compatibility before a tune project is activated.</p><div><b>{form.year} {form.make} {form.model}</b><small>{form.chassis} · {form.engine} · {form.platform} · {form.fuel}</small></div>{result.dryRun&&<em>Preview mode — this demo did not store customer data.</em>}</section>;

  return <section className={styles.shell}>
    <aside className={styles.summary}><span>ORDER</span><h2>{intake.productName||"Custom Tune"}</h2><p>{intake.customer?.name}</p><div><b>{required}/8</b><small>required vehicle fields</small></div><ul><li><LockKeyhole size={13}/>Secure intake link</li><li><Gauge size={13}/>{intelligence.state==="workflow_ready"?"Vehicle-aware workflow found":"Doug will review this setup"}</li><li><CheckCircle2 size={13}/>Doug approves compatibility</li></ul></aside>
    <div className={styles.form}>
      <section><div className={styles.sectionHead}><div><span>01</span><div><b>Vehicle</b><p>Choose a common BMW/Supra chassis or enter it manually.</p></div></div></div><label className={styles.full}><span>COMMON BMW / SUPRA PRESET</span><select value={preset} onChange={e=>choose(e.target.value)}><option value="">Select vehicle…</option>{presets.map(item=><option value={item.key} key={item.key}>{item.label}</option>)}<option value="">My car isn’t listed — enter manually below</option></select></label><div className={styles.grid}><label><span>YEAR *</span><input type="number" value={form.year} onChange={e=>change("year",e.target.value)}/></label><label><span>MAKE *</span><input value={form.make} onChange={e=>change("make",e.target.value)}/></label><label><span>MODEL *</span><input value={form.model} onChange={e=>change("model",e.target.value)}/></label><label><span>CHASSIS *</span><input value={form.chassis} onChange={e=>change("chassis",e.target.value)} placeholder="G20, F82, G87…"/></label><label><span>ENGINE *</span><input value={form.engine} onChange={e=>change("engine",e.target.value)} placeholder="B58TU, S55, S58…"/></label><label><span>VIN</span><input value={form.vin} onChange={e=>change("vin",e.target.value)} placeholder="Optional at intake"/></label></div></section>
      <section><div className={styles.sectionHead}><div><span>02</span><div><b>Tuning setup</b><p>Platform, transmission and fuel target.</p></div></div></div><div className={styles.grid}><label><span>PLATFORM *</span><select value={form.platform} onChange={e=>change("platform",e.target.value)}><option value="">Select…</option><option>MHD</option><option>BM3</option><option>EcuTek</option><option>Other / unsure</option></select></label><label><span>TRANSMISSION *</span><select value={form.transmission} onChange={e=>change("transmission",e.target.value)}><option value="">Select…</option><option>ZF8</option><option>DCT</option><option>Manual</option><option>Other</option></select></label><label><span>FUEL / TARGET *</span><input value={form.fuel} onChange={e=>change("fuel",e.target.value)} placeholder="93, E30, E50, flex fuel…"/></label></div></section>
      <section><div className={styles.sectionHead}><div><span>03</span><div><b>Hardware</b><p>Give Doug the car as it actually sits today.</p></div></div></div><div className={styles.grid}><label><span>TURBO</span><input value={form.hardware.turbo} onChange={e=>hardware("turbo",e.target.value)} placeholder="Stock, Pure, DAW, custom…"/></label><label><span>DOWNPIPE</span><input value={form.hardware.downpipe} onChange={e=>hardware("downpipe",e.target.value)} placeholder="Stock / aftermarket"/></label><label><span>FUEL SYSTEM</span><input value={form.hardware.fuelSystem} onChange={e=>hardware("fuelSystem",e.target.value)} placeholder="Stock, HPFP, PI…"/></label><label><span>INTAKE</span><input value={form.hardware.intake} onChange={e=>hardware("intake",e.target.value)} placeholder="Stock / brand"/></label><label className={styles.full}><span>OTHER MODIFICATIONS</span><input value={form.hardware.other} onChange={e=>hardware("other",e.target.value)} placeholder="Intercooler, exhaust, sensors, meth, etc."/></label></div></section>
      <section><div className={styles.sectionHead}><div><span>04</span><div><b>Goals + notes</b><p>What should Doug know before opening the tune?</p></div></div></div><label className={styles.full}><span>GOALS</span><textarea rows={4} value={form.goals} onChange={e=>change("goals",e.target.value)} placeholder="Street manners, power goal, track use, spool preference, issues to address…"/></label><label className={styles.full}><span>ANYTHING ELSE</span><textarea rows={3} value={form.notes} onChange={e=>change("notes",e.target.value)}/></label></section>
      {error&&<div className={styles.error}><TriangleAlert size={14}/>{error}</div>}
      <div className={styles.submitBar}><div><span>{required===8?"Ready for Doug’s review":`${8-required} required field${8-required===1?"":"s"} remaining`}</span><small>{intelligence.state==="workflow_ready"?`${intelligence.engine} + ${intelligence.platform} workflow recognized. Exact ECU/ROM compatibility is still reviewed by Doug.`:"Submitting never auto-approves compatibility."}</small></div><button disabled={busy||required<8} onClick={submit}>{busy?"Submitting…":"Submit vehicle intake"}<Send size={14}/></button></div>
    </div>
  </section>;
}

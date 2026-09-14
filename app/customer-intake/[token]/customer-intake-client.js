"use client";

import { useMemo,useState } from "react";
import { CheckCircle2, ChevronRight, Gauge, LockKeyhole, Send, TriangleAlert } from "lucide-react";
import styles from "./customer-intake.module.css";

const presets=[
  {label:"BMW 340i · F30",make:"BMW",model:"340i",chassis:"F30",engine:"B58"},{label:"BMW M340i · G20",make:"BMW",model:"M340i",chassis:"G20",engine:"B58TU"},{label:"BMW M240i · F22",make:"BMW",model:"M240i",chassis:"F22",engine:"B58"},{label:"BMW M240i · G42",make:"BMW",model:"M240i",chassis:"G42",engine:"B58TU"},{label:"BMW M2 · F87",make:"BMW",model:"M2",chassis:"F87",engine:"N55"},{label:"BMW M2 Competition · F87",make:"BMW",model:"M2 Competition",chassis:"F87",engine:"S55"},{label:"BMW M2 · G87",make:"BMW",model:"M2",chassis:"G87",engine:"S58"},{label:"BMW M3 · F80",make:"BMW",model:"M3",chassis:"F80",engine:"S55"},{label:"BMW M3 · G80",make:"BMW",model:"M3",chassis:"G80",engine:"S58"},{label:"BMW M4 · F82",make:"BMW",model:"M4",chassis:"F82",engine:"S55"},{label:"BMW M4 · G82",make:"BMW",model:"M4",chassis:"G82",engine:"S58"},{label:"BMW 440i · F32",make:"BMW",model:"440i",chassis:"F32",engine:"B58"},{label:"BMW M440i · G22",make:"BMW",model:"M440i",chassis:"G22",engine:"B58TU"},{label:"BMW X3 M40i · G01",make:"BMW",model:"X3 M40i",chassis:"G01",engine:"B58TU"},{label:"BMW X3M · F97",make:"BMW",model:"X3M",chassis:"F97",engine:"S58"},{label:"BMW X5 xDrive40i · G05",make:"BMW",model:"X5 xDrive40i",chassis:"G05",engine:"B58TU"},{label:"BMW X5M · F95",make:"BMW",model:"X5M",chassis:"F95",engine:"S63"},{label:"Toyota GR Supra · A90/A91",make:"Toyota",model:"GR Supra 3.0",chassis:"A90/A91",engine:"B58"},
];

export default function CustomerIntakeClient({token,intake}){
  const source=intake.vehiclePayload||{};
  const [form,setForm]=useState({year:source.year||"",make:source.make||"BMW",model:source.model||"",chassis:source.chassis||"",engine:source.engine||"",transmission:source.transmission||"",platform:source.platform||intake.platform||"",fuel:source.fuel||"",vin:source.vin||"",goals:source.goals||"",notes:source.notes||"",hardware:{turbo:source.hardware?.turbo||"",downpipe:source.hardware?.downpipe||"",fuelSystem:source.hardware?.fuelSystem||"",intake:source.hardware?.intake||"",other:source.hardware?.other||""}});
  const [preset,setPreset]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");
  const required=useMemo(()=>[form.year,form.make,form.model,form.chassis,form.engine,form.transmission,form.platform,form.fuel].filter(Boolean).length,[form]);

  function change(key,value){setForm(current=>({...current,[key]:value}))}
  function hardware(key,value){setForm(current=>({...current,hardware:{...current.hardware,[key]:value}}))}
  function choose(value){setPreset(value);if(!value)return;const found=presets.find(item=>item.label===value);if(found)setForm(current=>({...current,...found}))}

  async function submit(){
    setBusy(true);setError("");setResult(null);
    try{
      const response=await fetch(`/api/v1/intake/customer/${encodeURIComponent(token)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to submit intake");setResult(body);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }

  if(result?.evaluation?.complete)return <section className={styles.complete}><div className={styles.completeIcon}><CheckCircle2 size={28}/></div><span>INTAKE RECEIVED</span><h2>Doug has what he needs to review the car.</h2><p>Your vehicle information is now staged with order {intake.externalOrderId||intake.orderId}. Subpar Tuning will review compatibility before a tune project is activated.</p><div><b>{form.year} {form.make} {form.model}</b><small>{form.chassis} · {form.engine} · {form.platform} · {form.fuel}</small></div>{result.dryRun&&<em>Preview mode — this demo did not store customer data.</em>}</section>;

  return <section className={styles.shell}>
    <aside className={styles.summary}><span>ORDER</span><h2>{intake.productName||"Custom Tune"}</h2><p>{intake.customer?.name}</p><div><b>{required}/8</b><small>required vehicle fields</small></div><ul><li><LockKeyhole size={13}/>Secure intake link</li><li><Gauge size={13}/>Vehicle-aware setup</li><li><CheckCircle2 size={13}/>Doug approves compatibility</li></ul></aside>
    <div className={styles.form}>
      <section><div className={styles.sectionHead}><div><span>01</span><div><b>Vehicle</b><p>Start with a common chassis or enter it manually.</p></div></div></div><label className={styles.full}><span>COMMON BMW / SUPRA PRESET</span><select value={preset} onChange={e=>choose(e.target.value)}><option value="">Select vehicle…</option>{presets.map(item=><option key={item.label}>{item.label}</option>)}<option value="">My car isn’t listed — enter manually below</option></select></label><div className={styles.grid}><label><span>YEAR *</span><input type="number" value={form.year} onChange={e=>change("year",e.target.value)}/></label><label><span>MAKE *</span><input value={form.make} onChange={e=>change("make",e.target.value)}/></label><label><span>MODEL *</span><input value={form.model} onChange={e=>change("model",e.target.value)}/></label><label><span>CHASSIS *</span><input value={form.chassis} onChange={e=>change("chassis",e.target.value)} placeholder="G20, F82, G87…"/></label><label><span>ENGINE *</span><input value={form.engine} onChange={e=>change("engine",e.target.value)} placeholder="B58TU, S55, S58…"/></label><label><span>VIN</span><input value={form.vin} onChange={e=>change("vin",e.target.value)} placeholder="Optional at intake"/></label></div></section>
      <section><div className={styles.sectionHead}><div><span>02</span><div><b>Tuning setup</b><p>Platform, transmission and fuel target.</p></div></div></div><div className={styles.grid}><label><span>PLATFORM *</span><select value={form.platform} onChange={e=>change("platform",e.target.value)}><option value="">Select…</option><option>MHD</option><option>BM3</option><option>EcuTek</option><option>Other / unsure</option></select></label><label><span>TRANSMISSION *</span><select value={form.transmission} onChange={e=>change("transmission",e.target.value)}><option value="">Select…</option><option>ZF8</option><option>DCT</option><option>Manual</option><option>Other</option></select></label><label><span>FUEL / TARGET *</span><input value={form.fuel} onChange={e=>change("fuel",e.target.value)} placeholder="93, E30, E50, flex fuel…"/></label></div></section>
      <section><div className={styles.sectionHead}><div><span>03</span><div><b>Hardware</b><p>Give Doug the car as it actually sits today.</p></div></div></div><div className={styles.grid}><label><span>TURBO</span><input value={form.hardware.turbo} onChange={e=>hardware("turbo",e.target.value)} placeholder="Stock, Pure, DAW, custom…"/></label><label><span>DOWNPIPE</span><input value={form.hardware.downpipe} onChange={e=>hardware("downpipe",e.target.value)} placeholder="Stock / aftermarket"/></label><label><span>FUEL SYSTEM</span><input value={form.hardware.fuelSystem} onChange={e=>hardware("fuelSystem",e.target.value)} placeholder="Stock, HPFP, PI…"/></label><label><span>INTAKE</span><input value={form.hardware.intake} onChange={e=>hardware("intake",e.target.value)} placeholder="Stock / brand"/></label><label className={styles.full}><span>OTHER MODIFICATIONS</span><input value={form.hardware.other} onChange={e=>hardware("other",e.target.value)} placeholder="Intercooler, exhaust, sensors, meth, etc."/></label></div></section>
      <section><div className={styles.sectionHead}><div><span>04</span><div><b>Goals + notes</b><p>What should Doug know before opening the tune?</p></div></div></div><label className={styles.full}><span>GOALS</span><textarea rows={4} value={form.goals} onChange={e=>change("goals",e.target.value)} placeholder="Street manners, power goal, track use, spool preference, issues to address…"/></label><label className={styles.full}><span>ANYTHING ELSE</span><textarea rows={3} value={form.notes} onChange={e=>change("notes",e.target.value)}/></label></section>
      {error&&<div className={styles.error}><TriangleAlert size={14}/>{error}</div>}
      <div className={styles.submitBar}><div><span>{required===8?"Ready for review":`${8-required} required field${8-required===1?"":"s"} remaining`}</span><small>Submitting does not automatically approve compatibility.</small></div><button disabled={busy||required<8} onClick={submit}>{busy?"Submitting…":"Submit vehicle intake"}<Send size={14}/></button></div>
    </div>
  </section>;
}

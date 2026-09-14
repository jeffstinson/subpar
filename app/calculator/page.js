"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Calculator, Car, CheckCircle2, ChevronDown, Droplets, Fuel,
  Gauge, Info, RotateCcw, ShieldCheck, SlidersHorizontal, TriangleAlert
} from "lucide-react";
import { calculateEthanolBlend, findFuelVehicle, fuelVehicleGroups } from "../lib/fuel-vehicles";
import styles from "./calculator.module.css";

const targets = [20, 30, 40, 50, 60, 70];
const gallonsToLiters = (gallons) => gallons * 3.78541;

export default function EthanolCalculatorPage() {
  const [vehicleId, setVehicleId] = useState("g20-m340i");
  const selected = useMemo(() => findFuelVehicle(vehicleId), [vehicleId]);
  const manual = vehicleId === "manual";
  const [manualTank, setManualTank] = useState(15.6);
  const tank = manual ? Math.max(0, Number(manualTank) || 0) : selected?.tank || 15.6;
  const [currentFuel, setCurrentFuel] = useState(6);
  const [currentE, setCurrentE] = useState(10);
  const [e85E, setE85E] = useState(80);
  const [pumpE, setPumpE] = useState(10);
  const [target, setTarget] = useState(40);

  const result = calculateEthanolBlend({
    tankCapacity: tank,
    currentFuel,
    currentEthanol: currentE,
    e85Ethanol: e85E,
    pumpEthanol: pumpE,
    targetEthanol: target,
  });

  function chooseVehicle(value) {
    setVehicleId(value);
    const next = findFuelVehicle(value);
    if (next) setCurrentFuel((fuel) => Math.min(Number(fuel) || 0, next.tank));
  }

  function setGaugeFraction(fraction) {
    setCurrentFuel(Number((tank * fraction).toFixed(2)));
  }

  function resetFuelInputs() {
    setCurrentFuel(Number((tank * 0.4).toFixed(2)));
    setCurrentE(10);
    setE85E(80);
    setPumpE(10);
    setTarget(40);
  }

  const fuelPct = tank ? Math.min(100, Math.max(0, (currentFuel / tank) * 100)) : 0;

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Dashboard</Link>
      <div className={styles.brand}><img src="/subpar-logo.png" alt="Subpar Tuning"/><div><b>SUBPAR OS</b><span>ETHANOL MIX TOOL</span></div></div>
      <div className={styles.mode}><span/> CHASSIS DATABASE</div>
    </header>

    <section className={styles.hero}>
      <div>
        <span className={styles.eyebrow}>SUBPAR TUNING • FUEL TOOL</span>
        <h1>Chassis-aware E85 calculator.</h1>
        <p>Pick the BMW or Supra chassis and Subpar OS loads its factory tank capacity automatically. Then enter what is actually in the tank and the measured ethanol content at the pump.</p>
      </div>
      <div className={styles.heroMark}><Droplets size={24}/><span>ETHANOL</span><b>MIX</b></div>
    </section>

    <section className={styles.layout}>
      <div className={styles.leftCol}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>STEP 1</span><h2>Select the vehicle</h2><p>Tank size follows the chassis selection.</p></div><Car size={20}/></div>
          <label className={styles.field}>
            <span>Vehicle / chassis</span>
            <div className={styles.selectWrap}>
              <select value={vehicleId} onChange={(e) => chooseVehicle(e.target.value)}>
                {fuelVehicleGroups.map((group) => <optgroup label={group.group} key={group.group}>{group.vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.label} • {vehicle.chassis}</option>)}</optgroup>)}
                <optgroup label="Other"><option value="manual">My car isn’t listed — manual input</option></optgroup>
              </select>
              <ChevronDown size={15}/>
            </div>
          </label>

          {manual ? <div className={styles.manualBox}>
            <div><SlidersHorizontal size={18}/><span><b>Manual vehicle</b><small>Enter the usable tank capacity for the car.</small></span></div>
            <label className={styles.field}><span>Tank capacity (gal)</span><input type="number" min="1" step="0.1" value={manualTank} onChange={(e) => { setManualTank(e.target.value); setCurrentFuel((fuel) => Math.min(Number(fuel) || 0, Number(e.target.value) || 0)); }}/></label>
          </div> : selected && <div className={styles.vehicleCard}>
            <div className={styles.vehicleIcon}><Car size={23}/></div>
            <div className={styles.vehicleCopy}><span>{selected.years}</span><h3>{selected.label}</h3><p>{selected.chassis} • {selected.engine}</p></div>
            <div className={styles.tankStat}><span>FACTORY TANK</span><b>{selected.tank.toFixed(1)}</b><small>gallons</small></div>
          </div>}

          <div className={styles.capacityStrip}>
            <div><Fuel size={16}/><span><small>Tank capacity</small><b>{tank.toFixed(1)} gal</b></span></div>
            <div><span><small>Metric</small><b>{gallonsToLiters(tank).toFixed(1)} L</b></span></div>
            <div><span><small>Fuel space</small><b>{result.remaining.toFixed(2)} gal</b></span></div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>STEP 2</span><h2>What’s in the tank now?</h2><p>Use the actual volume and ethanol content if you have them.</p></div><Gauge size={20}/></div>
          <div className={styles.fuelGauge}>
            <div className={styles.gaugeTrack}><i style={{width: `${fuelPct}%`}}/></div>
            <div className={styles.gaugeLabels}><span>Empty</span><b>{fuelPct.toFixed(0)}% full</b><span>{tank.toFixed(1)} gal</span></div>
          </div>
          <div className={styles.quickFuel}>{[[.25,"¼ tank"],[.5,"½ tank"],[.75,"¾ tank"],[1,"Full"]].map(([fraction,label]) => <button key={label} onClick={() => setGaugeFraction(fraction)}>{label}</button>)}</div>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Fuel currently in tank</span><div className={styles.unitInput}><input type="number" min="0" max={tank} step="0.1" value={currentFuel} onChange={(e) => setCurrentFuel(Math.min(tank, Math.max(0, Number(e.target.value) || 0)))}/><em>gal</em></div></label>
            <label className={styles.field}><span>Current ethanol content</span><div className={styles.unitInput}><input type="number" min="0" max="100" step="1" value={currentE} onChange={(e) => setCurrentE(e.target.value)}/><em>%</em></div></label>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>STEP 3</span><h2>Pump fuel & target</h2><p>E85 can vary considerably by station and season, so measured content stays editable.</p></div><Droplets size={20}/></div>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Actual E85 ethanol</span><div className={styles.unitInput}><input type="number" min="0" max="100" step="1" value={e85E} onChange={(e) => setE85E(e.target.value)}/><em>%</em></div></label>
            <label className={styles.field}><span>Pump-gas ethanol</span><div className={styles.unitInput}><input type="number" min="0" max="100" step="1" value={pumpE} onChange={(e) => setPumpE(e.target.value)}/><em>%</em></div></label>
          </div>
          <div className={styles.targetBlock}><span>Target blend</span><div className={styles.targetButtons}>{targets.map((value) => <button key={value} className={target === value ? styles.targetActive : ""} onClick={() => setTarget(value)}>E{value}</button>)}</div><label className={styles.customTarget}><span>Custom</span><div className={styles.unitInput}><input type="number" min="0" max="100" step="1" value={target} onChange={(e) => setTarget(Number(e.target.value) || 0)}/><em>%</em></div></label></div>
        </section>
      </div>

      <aside className={styles.rightCol}>
        <section className={`${styles.resultCard} ${!result.reachable ? styles.resultWarning : ""}`}>
          <span className={styles.eyebrow}>MIX TO FULL TANK</span>
          <div className={styles.resultTitle}><div><small>TARGET</small><h2>E{target}</h2></div><div className={styles.resultStatus}>{result.reachable ? <CheckCircle2 size={18}/> : <TriangleAlert size={18}/>}<span>{result.reachable ? "Achievable" : "Check blend"}</span></div></div>
          {result.reachable ? <>
            <div className={styles.mixHero}><div><span>ADD E85</span><b>{result.e85Gallons.toFixed(2)}</b><small>gal • {gallonsToLiters(result.e85Gallons).toFixed(1)} L</small></div><div className={styles.plus}>+</div><div><span>ADD PUMP GAS</span><b>{result.pumpGallons.toFixed(2)}</b><small>gal • {gallonsToLiters(result.pumpGallons).toFixed(1)} L</small></div></div>
            <div className={styles.finalBlend}><span>Estimated final blend</span><b>E{result.finalEthanol.toFixed(1)}</b></div>
          </> : <div className={styles.unreachable}><TriangleAlert size={20}/><div><b>That target cannot be reached by simply filling this tank to full with these two fuels.</b><p>{result.reason}</p></div></div>}
          <div className={styles.resultFacts}>
            <div><span>Current fuel</span><b>{Number(currentFuel || 0).toFixed(2)} gal</b></div>
            <div><span>Space available</span><b>{result.remaining.toFixed(2)} gal</b></div>
            <div><span>E85 at pump</span><b>E{Number(e85E || 0).toFixed(0)}</b></div>
            <div><span>Pump gas</span><b>E{Number(pumpE || 0).toFixed(0)}</b></div>
          </div>
          <button className={styles.reset} onClick={resetFuelInputs}><RotateCcw size={14}/> Reset fuel inputs</button>
        </section>

        <section className={styles.infoCard}><ShieldCheck size={19}/><div><b>Chassis-aware, not guesswork</b><p>The preset database uses published factory tank capacities for the listed BMW and Toyota chassis. If a tank, fuel cell, or usable capacity has been modified, use manual mode.</p></div></section>
        <section className={styles.infoCard}><Info size={19}/><div><b>Use measured ethanol content when possible</b><p>“E85” at the pump does not always contain 85% ethanol. The calculator intentionally keeps E85 and pump-gas ethanol percentages editable.</p></div></section>
      </aside>
    </section>
  </main>;
}

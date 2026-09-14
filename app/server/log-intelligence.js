import { getDataMode } from "./env";
import { getSupabaseServerClient } from "./supabase-server";
import { normalizeEngine } from "../lib/vehicle-intelligence";

const DEFAULT_ALIASES={
  rpm:["rpm","engine speed","engine_speed"],
  boostTargetPsi:["boost target","boost target psi","boost_target","target boost","boost request"],
  boostActualPsi:["boost","boost actual","boost actual psi","boost_actual","boost pressure","manifold pressure"],
  throttlePct:["throttle","throttle position","throttle angle","throttle %"],
  lambda:["lambda","lambda actual","afr lambda","lambda bank 1"],
  hpfpPsi:["rail pressure","hpfp","high pressure fuel","fuel pressure high","fuel pressure"],
  lpfpPsi:["low pressure fuel","lpfp","fuel pressure low"],
  iatF:["iat","intake air temp","intake air temperature","charge air temp"],
  wgdcPct:["wgdc","wastegate duty","wastegate dc"],
  ethanolPct:["ethanol","ethanol content","flex fuel ethanol"],
  timingCorr1:["timing correction 1","ign correction 1","cyl 1 timing correction"],
  timingCorr2:["timing correction 2","ign correction 2","cyl 2 timing correction"],
  timingCorr3:["timing correction 3","ign correction 3","cyl 3 timing correction"],
  timingCorr4:["timing correction 4","ign correction 4","cyl 4 timing correction"],
  timingCorr5:["timing correction 5","ign correction 5","cyl 5 timing correction"],
  timingCorr6:["timing correction 6","ign correction 6","cyl 6 timing correction"],
  speed:["speed","vehicle speed","mph"],
  gear:["gear","current gear"],
};

const DEFAULT_REQUIRED=["rpm","boostTargetPsi","boostActualPsi","throttlePct","lambda","hpfpPsi","iatF"];
const DEFAULT_THRESHOLDS={wotThrottle:80,reviewThrottleClosureBelow:70,reviewBoostErrorPsi:3,reviewTimingCorrectionDeg:3,reviewIatF:140};

function platformKey(value){const compact=String(value||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");if(compact==="BOOTMOD3"||compact==="BM3")return "BM3";if(compact==="ECUTEK")return "EcuTek";if(compact==="MHD")return "MHD";return String(value||"").trim()}
function normalizedHeader(value){return String(value||"").toLowerCase().replace(/[\[\](){}]/g," ").replace(/[%°]/g," ").replace(/[_\-\/]+/g," ").replace(/\s+/g," ").trim()}
function numeric(value){const text=String(value??"").trim().replace(/,/g,"");if(!text)return null;const number=Number(text);return Number.isFinite(number)?number:null}
function round(value,digits=2){if(!Number.isFinite(value))return null;const p=10**digits;return Math.round(value*p)/p}
function min(values){const clean=values.filter(Number.isFinite);return clean.length?Math.min(...clean):null}
function max(values){const clean=values.filter(Number.isFinite);return clean.length?Math.max(...clean):null}
function avg(values){const clean=values.filter(Number.isFinite);return clean.length?clean.reduce((a,b)=>a+b,0)/clean.length:null}

export function parseCsv(text,{maxRows=25000}={}){
  const source=String(text||"").replace(/^\uFEFF/,"");
  if(!source.trim())throw new Error("CSV is empty");
  const rows=[];let row=[];let field="";let quoted=false;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(quoted){
      if(char==='"'&&source[i+1]==='"'){field+='"';i++;continue}
      if(char==='"'){quoted=false;continue}
      field+=char;continue;
    }
    if(char==='"'){quoted=true;continue}
    if(char===","){row.push(field);field="";continue}
    if(char==='\n'||char==='\r'){
      if(char==='\r'&&source[i+1]==='\n')i++;
      row.push(field);field="";
      if(row.some(cell=>String(cell).trim()!==""))rows.push(row);
      row=[];
      if(rows.length>maxRows+1)throw new Error(`CSV exceeds ${maxRows.toLocaleString()} data rows`);
      continue;
    }
    field+=char;
  }
  row.push(field);if(row.some(cell=>String(cell).trim()!==""))rows.push(row);
  if(rows.length<2)throw new Error("CSV needs a header and at least one data row");
  const headers=rows[0].map(value=>String(value||"").trim());
  const data=rows.slice(1).map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??""])));
  return {headers,rows:data,rowCount:data.length};
}

function aliasScore(source,alias){
  const a=normalizedHeader(source),b=normalizedHeader(alias);if(!a||!b)return 0;if(a===b)return 100;if(a.startsWith(`${b} `)||a.endsWith(` ${b}`))return 86;if(a.includes(b))return 72;return 0;
}

export function mapChannels(headers,aliases=DEFAULT_ALIASES){
  const mapping={};const details={};const used=new Set();
  for(const [canonical,candidates] of Object.entries(aliases||{})){
    let best=null;
    for(const header of headers){
      if(used.has(header))continue;
      for(const alias of candidates||[]){const score=aliasScore(header,alias);if(score&&(!best||score>best.score))best={header,alias,score}}
    }
    if(best){mapping[canonical]=best.header;details[canonical]=best;used.add(best.header)}
  }
  return {mapping,details,unmappedHeaders:headers.filter(header=>!used.has(header))};
}

async function parserProfile(platform,engine){
  const normalizedPlatform=platformKey(platform);const normalizedEngine=normalizeEngine(engine);
  if(getDataMode()==="supabase"){
    const supabase=getSupabaseServerClient();
    const {data,error}=await supabase.from("log_parser_profiles").select("profile_key,platform,engine_family,version,column_aliases,required_channels,thresholds,notes").eq("active",true).eq("platform",normalizedPlatform).eq("engine_family",normalizedEngine).order("version",{ascending:false}).limit(1);
    if(error)throw new Error(`Unable to load log parser profile: ${error.message}`);
    if(data?.[0])return {...data[0],columnAliases:data[0].column_aliases||{},requiredChannels:data[0].required_channels||DEFAULT_REQUIRED};
  }
  return {profile_key:`${normalizedPlatform.toLowerCase()}-${normalizedEngine.toLowerCase()}-fallback`,platform:normalizedPlatform,engine_family:normalizedEngine,version:1,columnAliases:DEFAULT_ALIASES,requiredChannels:DEFAULT_REQUIRED,thresholds:DEFAULT_THRESHOLDS,notes:"Demo fallback parser profile."};
}

function canonicalRows(rows,mapping){
  return rows.map((row,index)=>{const item={_index:index};for(const [canonical,header] of Object.entries(mapping))item[canonical]=numeric(row[header]);return item});
}

function timingValues(row){return [1,2,3,4,5,6].map(i=>row[`timingCorr${i}`]).filter(Number.isFinite)}

function analyze(rows,mapping,required,thresholds){
  const canonical=canonicalRows(rows,mapping);const foundRequired=required.filter(key=>mapping[key]);const missingRequired=required.filter(key=>!mapping[key]);
  const confidence=required.length?round(foundRequired.length/required.length*100,1):100;
  const rpmValues=canonical.map(r=>r.rpm),throttleValues=canonical.map(r=>r.throttlePct),boostActual=canonical.map(r=>r.boostActualPsi),boostTarget=canonical.map(r=>r.boostTargetPsi),lambdaValues=canonical.map(r=>r.lambda),hpfpValues=canonical.map(r=>r.hpfpPsi),lpfpValues=canonical.map(r=>r.lpfpPsi),iatValues=canonical.map(r=>r.iatF),wgdcValues=canonical.map(r=>r.wgdcPct),ethanolValues=canonical.map(r=>r.ethanolPct);
  const wotThrottle=Number(thresholds.wotThrottle)||80;
  const wot=canonical.filter(r=>(r.throttlePct??0)>=wotThrottle&&(r.rpm??0)>=2500);
  const boostErrors=wot.map(r=>Number.isFinite(r.boostActualPsi)&&Number.isFinite(r.boostTargetPsi)?r.boostActualPsi-r.boostTargetPsi:null).filter(Number.isFinite);
  const timingCorrections=wot.flatMap(timingValues);
  const throttleClosures=[];
  for(let i=1;i<canonical.length;i++){
    const prev=canonical[i-1],row=canonical[i];
    if((prev.throttlePct??0)>=wotThrottle&&(prev.rpm??0)>=2500&&(row.throttlePct??100)<(Number(thresholds.reviewThrottleClosureBelow)||70)&&Number.isFinite(row.boostTargetPsi)&&row.boostTargetPsi>5){throttleClosures.push({index:i,rpm:row.rpm,throttle:row.throttlePct,boostTarget:row.boostTargetPsi,boostActual:row.boostActualPsi})}
  }
  const metrics={
    rows:canonical.length,wotRows:wot.length,rpmMin:round(min(rpmValues),0),rpmMax:round(max(rpmValues),0),throttleMaxPct:round(max(throttleValues),1),
    boostTargetMaxPsi:round(max(boostTarget),2),boostActualMaxPsi:round(max(boostActual),2),boostErrorAvgPsi:round(avg(boostErrors),2),boostErrorMaxAbsPsi:round(max(boostErrors.map(Math.abs)),2),
    lambdaMin:round(min(lambdaValues),3),lambdaAvgWot:round(avg(wot.map(r=>r.lambda)),3),hpfpMinPsi:round(min(wot.map(r=>r.hpfpPsi)),0),lpfpMinPsi:round(min(wot.map(r=>r.lpfpPsi)),1),iatPeakF:round(max(iatValues),1),wgdcPeakPct:round(max(wgdcValues),1),ethanolAvgPct:round(avg(ethanolValues),1),
    timingCorrectionWorstDeg:round(min(timingCorrections),2),timingCorrectionMaxAbsDeg:round(max(timingCorrections.map(Math.abs)),2),throttleClosureCount:throttleClosures.length,
  };
  const flags=[];
  if(missingRequired.length)flags.push({severity:"mapping",code:"missing_channels",title:`${missingRequired.length} required channel${missingRequired.length===1?"":"s"} not mapped`,detail:missingRequired.join(", ")});
  if(Number.isFinite(metrics.boostErrorMaxAbsPsi)&&metrics.boostErrorMaxAbsPsi>(Number(thresholds.reviewBoostErrorPsi)||3))flags.push({severity:"review",code:"boost_error",title:"Boost tracking deviation needs review",detail:`Peak absolute target error ${metrics.boostErrorMaxAbsPsi} psi.`});
  if(metrics.throttleClosureCount>0)flags.push({severity:"review",code:"throttle_closure",title:"Potential throttle closure detected",detail:`${metrics.throttleClosureCount} row${metrics.throttleClosureCount===1?"":"s"} met the review heuristic.`});
  if(Number.isFinite(metrics.timingCorrectionMaxAbsDeg)&&metrics.timingCorrectionMaxAbsDeg>(Number(thresholds.reviewTimingCorrectionDeg)||3))flags.push({severity:"review",code:"timing_correction",title:"Timing correction exceeds review threshold",detail:`Largest absolute mapped correction ${metrics.timingCorrectionMaxAbsDeg}°.`});
  if(Number.isFinite(metrics.iatPeakF)&&metrics.iatPeakF>(Number(thresholds.reviewIatF)||140))flags.push({severity:"context",code:"iat_high",title:"High intake-air temperature context",detail:`Peak mapped IAT ${metrics.iatPeakF}°F.`});
  if(!wot.length)flags.push({severity:"mapping",code:"no_wot_segment",title:"No WOT review segment identified",detail:"Parser did not find rows above the configured throttle/RPM heuristic."});
  return {confidence,foundRequired,missingRequired,metrics,flags,throttleClosures,canonical};
}

export async function analyzeLogCsv({csvText,platform="MHD",engine="B58TU",fileName="upload.csv"}={}){
  const profile=await parserProfile(platform,engine);const parsed=parseCsv(csvText);const aliases={...DEFAULT_ALIASES,...(profile.columnAliases||{})};const mapped=mapChannels(parsed.headers,aliases);const thresholds={...DEFAULT_THRESHOLDS,...(profile.thresholds||{})};const analysis=analyze(parsed.rows,mapped.mapping,profile.requiredChannels||DEFAULT_REQUIRED,thresholds);
  return {
    fileName,platform:platformKey(platform),engine:normalizeEngine(engine),parserVersion:`${profile.profile_key}@${profile.version}`,profileKey:profile.profile_key,rowCount:parsed.rowCount,headers:parsed.headers,
    channelMap:mapped.mapping,channelDetails:mapped.details,unmappedHeaders:mapped.unmappedHeaders,confidence:analysis.confidence,missingRequired:analysis.missingRequired,metrics:analysis.metrics,flags:analysis.flags,
    summary:{headline:analysis.flags.some(flag=>flag.severity==="review")?"Review flags found":"No review flags from configured heuristics",note:"This parser accelerates review; it does not determine whether a calibration is safe or approved. Doug remains the decision-maker."},
    thresholds,profileNotes:profile.notes||null,
  };
}

export function demoMhdCsv(){
  const lines=["RPM,Boost Target psi,Boost Actual psi,Throttle Position,Lambda,Rail Pressure,IAT,WGDC,Ethanol Content,Timing Correction 1,Timing Correction 2,Timing Correction 3,Timing Correction 4,Timing Correction 5,Timing Correction 6"];
  for(let i=0;i<32;i++){
    const rpm=2500+i*140;const target=14+Math.min(i,14)*.72;const actual=target+(i===17?3.6:Math.sin(i/3)*.45);const throttle=i===22?63:94;const lambda=.86-Math.min(i,12)*.004;const rail=2900-Math.max(0,i-15)*18;const iat=96+i*.7;const wgdc=48+Math.min(i,18)*1.4;const ethanol=39.5;const c4=i===23?-3.4:-.4;
    lines.push([rpm,target.toFixed(2),actual.toFixed(2),throttle,lambda.toFixed(3),rail.toFixed(0),iat.toFixed(1),wgdc.toFixed(1),ethanol,-.2,-.1,-.3,c4,-.2,-.1].join(","));
  }
  return lines.join("\n");
}

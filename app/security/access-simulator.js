"use client";

import { useMemo, useState } from "react";
import { Check, LockKeyhole, ShieldCheck, UserRound, Users, Wrench } from "lucide-react";

const roles = [
  { key: "doug", role: "owner", label: "Doug / Owner", icon: ShieldCheck },
  { key: "tuner", role: "tuner", label: "Tuner", icon: Wrench },
  { key: "staff", role: "staff", label: "Staff", icon: Users },
  { key: "alex", role: "customer", label: "Alex / Customer", icon: UserRound },
];

export default function AccessSimulator({ matrix }) {
  const [selected, setSelected] = useState("doug");
  const [lastTest, setLastTest] = useState(null);
  const active = roles.find(item => item.key === selected) || roles[0];

  const rows = useMemo(() => matrix.map(item => ({
    ...item,
    allowed: Boolean(item.roles?.[active.role]),
  })), [matrix, active.role]);

  async function test(permission) {
    setLastTest({ permission, loading: true });
    const response = await fetch("/api/v1/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ principal: active.key, permission }),
    });
    const data = await response.json();
    setLastTest({ permission, loading: false, allowed: Boolean(data.allowed), role: data.principal?.role || active.role });
  }

  return <div>
    <div className="secRoleTabs">{roles.map(item => {
      const Icon = item.icon;
      return <button key={item.key} className={selected === item.key ? "on" : ""} onClick={() => { setSelected(item.key); setLastTest(null); }}><Icon size={15}/><span>{item.label}</span></button>;
    })}</div>

    <div className="secPermissionList">{rows.map(item => <button key={item.permission} className={item.allowed ? "allowed" : "denied"} onClick={() => test(item.permission)}>
      <span className="secPermissionIcon">{item.allowed ? <Check size={13}/> : <LockKeyhole size={13}/>}</span>
      <span><b>{item.permission}</b><small>{item.allowed ? `Allowed for ${active.label}` : `Denied for ${active.label}`}</small></span>
      <em>Test</em>
    </button>)}</div>

    {lastTest && <div className={`secTestResult ${lastTest.allowed ? "pass" : "deny"}`}>
      <span>{lastTest.loading ? "CHECKING" : lastTest.allowed ? "ALLOWED" : "DENIED"}</span>
      <b>{lastTest.permission}</b>
      <small>{lastTest.loading ? "Calling the access-control API…" : `Server decision for ${lastTest.role}.`}</small>
    </div>}
  </div>;
}

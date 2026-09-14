"use client";

import { useEffect } from "react";

const routeMap = new Map([
  ["E85 Calculator", "/calculator"],
  ["System Audit", "/audit"],
  ["Integrations", "/integration-lab"],
  ["Messages", "/messages"],
  ["Message customer", "/messages"],
  ["New Orders", "/intake-queue"],
  ["Datalog Reviews", "/log-lab"],
  ["Vehicle Intelligence", "/intelligence"],
]);

export default function RouteBridge() {
  useEffect(() => {
    function handleClick(event) {
      const button = event.target?.closest?.("button");
      if (!button) return;
      const path = routeMap.get(button.textContent?.trim());
      if (!path) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.href = path;
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

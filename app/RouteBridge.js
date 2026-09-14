"use client";

import { useEffect } from "react";

export default function RouteBridge() {
  useEffect(() => {
    function handleClick(event) {
      const button = event.target?.closest?.("button");
      if (!button) return;
      if (button.textContent?.trim() !== "E85 Calculator") return;
      event.preventDefault();
      event.stopPropagation();
      window.location.href = "/calculator";
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

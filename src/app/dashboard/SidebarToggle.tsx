"use client";

import { useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

function setCollapsed(v: boolean) {
  document.querySelector(".app-shell")?.classList.toggle("collapsed", v);
  try {
    localStorage.setItem("pq_sidebar", v ? "1" : "0");
  } catch {}
}

export default function SidebarToggle({
  variant,
}: {
  variant: "inside" | "open";
}) {
  useEffect(() => {
    try {
      if (localStorage.getItem("pq_sidebar") === "1") {
        document.querySelector(".app-shell")?.classList.add("collapsed");
      }
    } catch {}
  }, []);

  // only the button inside the sidebar is used now
  if (variant === "open") return null;

  return (
    <button
      type="button"
      className="collapse-btn"
      onClick={() => {
        const shell = document.querySelector(".app-shell");
        setCollapsed(!shell?.classList.contains("collapsed"));
      }}
      title="Collapse / expand sidebar"
      aria-label="Collapse or expand sidebar"
    >
      <PanelLeftClose className="ic-close" size={18} />
      <PanelLeftOpen className="ic-open" size={18} />
    </button>
  );
}

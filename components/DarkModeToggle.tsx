"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") { document.documentElement.classList.add("dark"); setDark(true); }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else       { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }

  return (
    <button onClick={toggle} style={{
      width: "28px", height: "28px", borderRadius: "6px",
      background: "var(--bg-card)", border: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", color: "var(--fg-muted)", transition: "all 0.15s",
    }}>
      {dark ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );
}

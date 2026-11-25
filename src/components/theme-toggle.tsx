"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { UserPreferences } from "@/lib/types";

export function ThemeToggle({ initial }: { initial: UserPreferences["theme"] }) {
  const [theme, setTheme] = useState(initial);

  useEffect(() => {
    const stored = window.localStorage.getItem("sd-theme");
    const current = stored === "light" || stored === "dark" ? stored : initial;
    setTheme(current);
    document.documentElement.dataset.theme = current;
  }, [initial]);

  async function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("sd-theme", next);
    await fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme: next }) });
  }

  return (
    <button onClick={toggle} aria-label="Alternar tema" className="btn btn-ghost size-9 !p-0">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

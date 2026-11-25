"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power } from "lucide-react";
import type { SourceStatusVM } from "@/lib/views";

export function SourceToggle({ storeId, enabled }: { storeId: string; enabled: boolean }) {
  const [value, setValue] = useState(enabled);
  const router = useRouter();
  async function toggle() {
    const next = !value;
    setValue(next);
    await fetch("/api/sources", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ storeId, enabled: next }) });
    router.refresh();
  }
  return <button onClick={toggle} className="btn btn-ghost !p-2" title={value ? "Desativar fonte" : "Ativar fonte"}><Power size={15} className={value ? "text-[var(--positive)]" : "muted"} /></button>;
}

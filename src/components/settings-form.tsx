"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { UserPreferences } from "@/lib/types";

export function SettingsForm({ preferences }: { preferences: UserPreferences }) {
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/preferences", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        theme: form.get("theme"),
        scanIntervalMinutes: Number(form.get("scanIntervalMinutes")),
        notificationsEnabled: form.get("notificationsEnabled") === "on",
        affiliateDisclosure: form.get("affiliateDisclosure") === "on",
      }),
    });
    setSaved(true);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5 md:p-6">
      <div><label className="label-field">Tema</label><select className="input-field" name="theme" defaultValue={preferences.theme}><option value="dark">Escuro</option><option value="light">Claro</option></select></div>
      <div><label className="label-field">Frequência das varreduras (minutos)</label><select className="input-field" name="scanIntervalMinutes" defaultValue={preferences.scan_interval_minutes}><option value="60">60</option><option value="240">240</option><option value="720">720</option><option value="1440">1440</option></select></div>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="notificationsEnabled" defaultChecked={preferences.notifications_enabled} /> Alertas de queda de preço e troca da melhor oferta</label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="affiliateDisclosure" defaultChecked={preferences.affiliate_disclosure} /> Exibir aviso sobre links de afiliados, quando aplicável</label>
      <div className="flex items-center gap-3"><button className="btn btn-primary"><Save size={15} /> Salvar preferências</button>{saved && <span className="text-xs text-[var(--positive)]">Salvo</span>}</div>
    </form>
  );
}

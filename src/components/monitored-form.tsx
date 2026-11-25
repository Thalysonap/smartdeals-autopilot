"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Radar } from "lucide-react";

export function MonitoredForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const attributesRaw = String(form.get("attributes") ?? "");
    let attributes = {};
    try { attributes = attributesRaw.trim() ? JSON.parse(attributesRaw) : {}; }
    catch { setError("Características devem ser um JSON válido"); setLoading(false); return; }
    const response = await fetch("/api/monitored-products", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"), brand: form.get("brand") || null, model: form.get("model") || null,
        version: form.get("version") || null, capacity: form.get("capacity") || null,
        category: form.get("category") || null, attributes, intervalMinutes: Number(form.get("intervalMinutes")),
      }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Falha ao cadastrar"); setLoading(false); return; }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="card mb-6 p-5 md:p-6">
      <button onClick={() => setOpen(!open)} className="btn btn-primary"><Plus size={16} /> Novo produto monitorado</button>
      {open && (
        <form onSubmit={onSubmit} className="animate-in mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2"><label className="label-field">Produto (ex.: PlayStation 5 Slim 1TB com leitor de disco)</label><input className="input-field" name="name" required minLength={3} /></div>
          <div><label className="label-field">Marca</label><input className="input-field" name="brand" placeholder="Sony" /></div>
          <div><label className="label-field">Modelo</label><input className="input-field" name="model" placeholder="CFI-2114B" /></div>
          <div><label className="label-field">Versão</label><input className="input-field" name="version" /></div>
          <div><label className="label-field">Capacidade</label><input className="input-field" name="capacity" placeholder="1TB" /></div>
          <div><label className="label-field">Categoria</label><input className="input-field" name="category" placeholder="Games" /></div>
          <div><label className="label-field">Frequência (minutos)</label><select className="input-field" name="intervalMinutes" defaultValue="240"><option value="60">60</option><option value="240">240</option><option value="720">720</option><option value="1440">1440</option></select></div>
          <div className="md:col-span-2"><label className="label-field">Características adicionais (JSON)</label><textarea className="input-field" name="attributes" rows={2} placeholder='{"cor":"branco"}' /></div>
          {error && <p className="text-xs text-[var(--danger)] md:col-span-3">{error}</p>}
          <div className="flex items-center gap-3 md:col-span-3">
            <button className="btn btn-primary" disabled={loading}><Radar size={16} /> {loading ? "Cadastrando..." : "Iniciar descoberta automática"}</button>
            <span className="muted text-[11px]">Você não precisa informar lojas ou URLs.</span>
          </div>
        </form>
      )}
    </div>
  );
}

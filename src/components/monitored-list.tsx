"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { dateTime } from "@/lib/format";
import type { MonitoredProduct } from "@/lib/types";

export function MonitoredList({ products }: { products: MonitoredProduct[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function action(id: string, body: Record<string, unknown>, method = "PATCH") {
    setBusy(id);
    await fetch(`/api/monitored-products/${id}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    router.refresh();
  }

  async function scan(id: string) {
    setBusy(id);
    await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ monitoredId: id }) });
    setBusy(null);
    router.refresh();
  }

  if (!products.length) return <div className="card p-10 text-center muted text-sm">Nenhum produto monitorado. Use o formulário acima para começar.</div>;

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {products.map((product) => (
        <div key={product.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="truncate font-semibold">{product.name}</h3><p className="muted mt-1 text-xs">{[product.brand, product.model, product.capacity, product.category].filter(Boolean).join(" · ") || "Sem especificações adicionais"}</p></div>
            <span className={`badge ${product.status === "active" ? "text-[var(--positive)]" : "text-[var(--warning)]"}`}>{product.status === "active" ? "Ativo" : "Pausado"}</span>
          </div>
          <div className="muted mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
            <span>Última varredura: {dateTime(product.last_run_at)}</span>
            <span>Próxima: {dateTime(product.next_run_at)}</span>
            <span>Intervalo: {product.interval_minutes} min</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => scan(product.id)} disabled={busy === product.id} className="btn btn-ghost !py-2 text-xs"><RefreshCw size={14} /> Buscar agora</button>
            <button onClick={() => action(product.id, { status: product.status === "active" ? "paused" : "active" })} disabled={busy === product.id} className="btn btn-ghost !py-2 text-xs">
              {product.status === "active" ? <Pause size={14} /> : <Play size={14} />} {product.status === "active" ? "Pausar" : "Retomar"}
            </button>
            <button onClick={() => action(product.id, {}, "DELETE")} disabled={busy === product.id} className="btn btn-ghost !py-2 text-xs text-[var(--danger)]"><Trash2 size={14} /> Remover</button>
          </div>
        </div>
      ))}
    </div>
  );
}

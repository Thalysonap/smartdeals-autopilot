import { History, RefreshCw, TriangleAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { brl, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [cartHistory, runs, logs, monitored] = await Promise.all([
    repository.listCartHistory(user.id, 100),
    repository.listRuns(user.id, 50),
    repository.listLogs(undefined, 100),
    repository.listMonitored(user.id),
  ]);
  const ids = new Set(monitored.map((item) => item.id));
  const offers = (await repository.listOffers([], 2000)).filter((offer) => offer.monitored_product_id && ids.has(offer.monitored_product_id));
  const priceHistory = await Promise.all(offers.slice(0, 60).map(async (offer) => ({
    offer,
    entries: await repository.listPriceHistory(offer.id, 20),
  })));

  return (
    <div className="animate-in space-y-6">
      <div><p className="muted text-xs uppercase tracking-[.18em]">Rastreabilidade</p><h1 className="page-title mt-1">Histórico</h1><p className="muted mt-2 text-sm">Todas as pesquisas, alterações de preço e trocas da oferta vencedora ficam registradas — inclusive após substituições.</p></div>

      <section className="card p-5 md:p-6">
        <h2 className="section-title mb-4 flex items-center gap-2"><History size={18} /> Carrinho e oferta vencedora</h2>
        {cartHistory.length === 0 ? <p className="muted text-sm">Nenhuma alteração registrada.</p> : (
          <div className="space-y-2">
            {cartHistory.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)]/60 px-4 py-3 text-xs">
                <span><strong>{entry.action}</strong> · {brl(entry.price)}{entry.previous_offer_id ? " · substituiu oferta anterior" : ""}<span className="muted block">{entry.reason}</span></span>
                <span className="muted">{dateTime(entry.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5 md:p-6">
          <h2 className="section-title mb-4 flex items-center gap-2"><RefreshCw size={18} /> Pesquisas realizadas</h2>
          {runs.length === 0 ? <p className="muted text-sm">Nenhuma pesquisa registrada.</p> : (
            <div className="space-y-2 text-xs">
              {runs.map((run) => (
                <div key={run.id} className="flex justify-between gap-3 rounded-lg bg-[var(--surface-2)]/60 px-3 py-2">
                  <span>{run.status} · {run.offers_found} ofertas · {run.stores_consulted} fontes · {run.stores_failed} falhas{run.error ? ` · ${run.error}` : ""}</span>
                  <span className="muted shrink-0">{dateTime(run.started_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card p-5 md:p-6">
          <h2 className="section-title mb-4 flex items-center gap-2"><TriangleAlert size={18} /> Erros de integração</h2>
          {logs.filter((log) => log.status !== "ok").length === 0 ? <p className="muted text-sm">Nenhum erro registrado.</p> : (
            <div className="space-y-2 text-xs">
              {logs.filter((log) => log.status !== "ok").slice(0, 25).map((log) => (
                <div key={log.id} className="flex justify-between gap-3 rounded-lg bg-[var(--surface-2)]/60 px-3 py-2">
                  <span><strong>{log.store_id}</strong> · {log.status} · {log.error ?? "—"}</span>
                  <span className="muted shrink-0">{dateTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card p-5 md:p-6">
        <h2 className="section-title mb-4">Histórico de preços por oferta</h2>
        {priceHistory.every((group) => group.entries.length === 0) ? <p className="muted text-sm">Nenhum preço coletado ainda.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {priceHistory.filter((group) => group.entries.length > 0).slice(0, 30).map(({ offer, entries }) => (
              <div key={offer.id} className="rounded-xl border border-[var(--border)] p-4">
                <p className="truncate text-xs font-semibold">{offer.title}</p>
                <div className="muted mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  {entries.slice(-8).map((entry) => <span key={entry.id}>{dateTime(entry.collected_at)}: {brl(entry.price)}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

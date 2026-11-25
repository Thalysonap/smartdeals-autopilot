import Link from "next/link";
import { Activity, Bot, CircleDollarSign, Clock3, ExternalLink, Radar, ShoppingCart, Sparkles, TriangleAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboard } from "@/lib/views";
import { brl, dateTime, relative } from "@/lib/format";

export const dynamic = "force-dynamic";

const stateLabels = {
  active: { label: "Agente ativo", color: "var(--positive)" },
  paused: { label: "Agente pausado", color: "var(--warning)" },
  scanning: { label: "Pesquisa em andamento", color: "var(--accent)" },
  idle: { label: "Sem monitoramentos ativos", color: "var(--muted)" },
} as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await getDashboard(user.id);
  const state = stateLabels[data.agentState];
  const stats = [
    { label: "Produtos monitorados", value: data.monitoredCount, icon: Radar },
    { label: "Ofertas no carrinho", value: data.cartCount, icon: ShoppingCart },
    { label: "Oportunidades válidas", value: data.eligibleCount, icon: Sparkles },
    { label: "Economia potencial", value: brl(data.potentialSavings), icon: CircleDollarSign },
  ];

  return (
    <div className="animate-in space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="muted text-xs uppercase tracking-[.18em]">Visão geral</p>
          <h1 className="page-title mt-1">Seu agente de ofertas</h1>
          <p className="muted mt-2 max-w-2xl text-sm">O SmartDeals pesquisa, valida e mantém no carrinho apenas a melhor oferta válida de cada produto monitorado. Nenhuma compra é realizada automaticamente.</p>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--surface-2)]"><Bot size={18} /></span>
          <div><p className="text-[10px] uppercase tracking-wider muted">Estado do agente</p><p className="text-sm font-semibold" style={{ color: state.color }}>{state.label}</p></div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="mb-4 flex items-center justify-between"><span className="muted text-xs">{label}</span><Icon size={17} className="text-[var(--accent)]" /></div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="section-title">Carrinho automático</h2><Link href="/cart" className="text-xs text-[var(--accent)]">Ver tudo →</Link></div>
          {data.cart.length === 0 ? (
            <div className="muted grid place-items-center gap-3 py-12 text-center text-sm">
              <ShoppingCart size={28} />
              <p>Nenhuma oferta vencedora ainda.</p>
              <Link href="/monitored" className="btn btn-primary">Cadastrar produto</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.cart.slice(0, 4).map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{item.productName}</p><p className="muted text-xs">{item.storeName} · atualizado {relative(item.updated_at)}</p></div>
                  <div className="flex items-center gap-3"><strong className="text-[var(--accent)]">{brl(item.total_price ?? item.price)}</strong><a href={item.offerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !p-2" aria-label="Abrir na loja"><ExternalLink size={15} /></a></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5 md:p-6">
          <h2 className="section-title mb-5">Saúde do agente</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="muted">Última varredura</span><span>{relative(data.lastScan)}</span></div>
            <div className="flex justify-between"><span className="muted">Próxima varredura</span><span>{data.nextScan ? dateTime(data.nextScan) : "—"}</span></div>
            <div className="flex justify-between"><span className="muted">Fontes operacionais</span><span>{data.activeSources}</span></div>
            <div className="flex justify-between"><span className="muted">Fontes com falha</span><span className={data.failedSources ? "text-[var(--danger)]" : ""}>{data.failedSources}</span></div>
          </div>
          {data.failedSources > 0 && <p className="mt-5 flex gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-xs"><TriangleAlert size={15} className="shrink-0" /> Fontes bloqueadas não interrompem as demais. Detalhes em Fontes de pesquisa.</p>}
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between"><h2 className="section-title">Oportunidades recentes</h2><Link href="/opportunities" className="text-xs text-[var(--accent)]">Explorar →</Link></div>
        {data.recentOffers.length === 0 ? <p className="muted py-10 text-center text-sm">Ainda não há ofertas coletadas. Cadastre um produto para iniciar a descoberta.</p> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.recentOffers.map((item) => (
              <div key={item.offer.id} className="rounded-xl border border-[var(--border)] p-4">
                <p className="truncate text-xs font-semibold">{item.offer.title}</p>
                <p className="muted mt-1 text-[10px]">{item.storeName} · {relative(item.offer.collected_at)}</p>
                <p className="mt-3 text-lg font-bold">{brl(item.offer.total_price ?? item.offer.price)}</p>
                <span className={`badge mt-2 ${item.eligible ? "text-[var(--positive)]" : "text-[var(--warning)]"}`}>{item.eligible ? "Elegível" : "Não elegível"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 md:p-6">
        <h2 className="section-title mb-4">Execuções recentes</h2>
        {data.runs.length === 0 ? <p className="muted text-sm">Nenhuma varredura registrada.</p> : (
          <div className="space-y-2">
            {data.runs.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)]/60 px-4 py-3 text-xs">
                <span className="flex items-center gap-2"><Activity size={14} /> {run.status} · {run.offers_found} ofertas · {run.stores_failed} falha(s)</span>
                <span className="muted">{dateTime(run.started_at)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="muted mt-4 flex items-center gap-2 text-[11px]"><Clock3 size={13} /> A interface carrega independentemente da conclusão das varreduras.</div>
      </section>
    </div>
  );
}

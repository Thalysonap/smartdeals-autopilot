import Link from "next/link";
import { ExternalLink, Filter, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunities } from "@/lib/views";
import { brl, relative } from "@/lib/format";
import { PriceChart } from "@/components/price-chart";
import type { OpportunityVM } from "@/lib/views";

export const dynamic = "force-dynamic";

type Search = { product?: string; category?: string; store?: string; minPrice?: string; maxPrice?: string; minReliability?: string; availability?: string };

function OpportunityCard({ item }: { item: OpportunityVM }) {
  const score = item.reliability?.score ?? null;
  return (
    <article className="card animate-in overflow-hidden p-5">
      <div className="flex gap-4">
        {item.offer.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.offer.image_url} alt="" className="size-20 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] object-contain" />
        ) : <div className="grid size-20 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-2xl">📦</div>}
        <div className="min-w-0 flex-1">
          <p className="muted truncate text-[10px] uppercase tracking-wider">{item.productName} · {item.category ?? "sem categoria"}</p>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold">{item.offer.title}</h2>
          <p className="muted mt-1 text-[11px]">{item.storeName} · vendedor {item.offer.seller_name ?? "não informado"}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`badge ${item.eligible ? "text-[var(--positive)]" : "text-[var(--warning)]"}`}>{item.eligible ? "Elegível" : "Não elegível automaticamente"}</span>
        {item.stale && <span className="badge text-[var(--warning)]">Desatualizada</span>}
        <span className="badge" title="Confiança calculada com dados disponíveis">Confiança: {score === null ? "não verificada" : `${score}/100`}</span>
        <span className="badge">{item.offer.availability}</span>
        <span className="badge">Frete: {item.offer.shipping_price === null ? "não verificado" : brl(item.offer.shipping_price)}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div><p className="muted text-[11px]">Preço total</p><p className="text-xl font-bold">{brl(item.offer.total_price ?? item.offer.price)}</p><p className="muted mt-1 text-[10px]">Verificado {relative(item.offer.validated_at ?? item.offer.collected_at)}</p></div>
        <a href={item.offer.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-2 text-xs">Ver oferta <ExternalLink size={14} /></a>
      </div>
      {item.reliability && item.reliability.criteria.length > 0 && (
        <details className="mt-4 border-t border-[var(--border)] pt-3">
          <summary className="cursor-pointer text-xs text-[var(--accent)]">Critérios de confiabilidade</summary>
          <ul className="muted mt-2 space-y-1 text-[11px]">
            {item.reliability.criteria.map((criterion) => <li key={criterion.key}>{criterion.label}: {criterion.impact > 0 ? "+" : ""}{criterion.impact} — {criterion.detail}</li>)}
          </ul>
        </details>
      )}
      <details className="mt-3 border-t border-[var(--border)] pt-3">
        <summary className="cursor-pointer text-xs text-[var(--accent)]">Histórico de preço</summary>
        <PriceChart history={item.priceHistory} />
      </details>
    </article>
  );
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const filters = await searchParams;
  const opportunities = await getOpportunities(user.id);
  const stores = Array.from(new Set(opportunities.map((item) => item.storeName))).sort();
  const filtered = opportunities.filter((item) => {
    if (filters.product && !item.productName.toLowerCase().includes(filters.product.toLowerCase())) return false;
    if (filters.category && !(item.category ?? "").toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.store && item.storeName !== filters.store) return false;
    if (filters.minPrice && (item.offer.total_price ?? item.offer.price) < Number(filters.minPrice)) return false;
    if (filters.maxPrice && (item.offer.total_price ?? item.offer.price) > Number(filters.maxPrice)) return false;
    if (filters.minReliability && (item.reliability?.score ?? 0) < Number(filters.minReliability)) return false;
    if (filters.availability && item.offer.availability !== filters.availability) return false;
    return true;
  });

  return (
    <div className="animate-in space-y-6">
      <div><p className="muted text-xs uppercase tracking-[.18em]">Descoberta contínua</p><h1 className="page-title mt-1">Oportunidades</h1><p className="muted mt-2 text-sm">Ofertas reais coletadas das fontes disponíveis, ordenadas pela melhor combinação entre economia, segurança e atualidade.</p></div>
      <form className="card grid gap-3 p-4 md:grid-cols-4" action="/opportunities" method="get">
        <input className="input-field" name="product" placeholder="Produto" defaultValue={filters.product} />
        <input className="input-field" name="category" placeholder="Categoria" defaultValue={filters.category} />
        <select className="input-field" name="store" defaultValue={filters.store ?? ""}><option value="">Todas as lojas</option>{stores.map((store) => <option key={store}>{store}</option>)}</select>
        <select className="input-field" name="availability" defaultValue={filters.availability ?? ""}><option value="">Qualquer disponibilidade</option><option value="in_stock">Em estoque</option><option value="out_of_stock">Esgotado</option><option value="unknown">Não verificado</option></select>
        <input className="input-field" type="number" min="0" name="minPrice" placeholder="Preço mín." defaultValue={filters.minPrice} />
        <input className="input-field" type="number" min="0" name="maxPrice" placeholder="Preço máx." defaultValue={filters.maxPrice} />
        <select className="input-field" name="minReliability" defaultValue={filters.minReliability ?? ""}><option value="">Qualquer confiança</option><option value="40">40+</option><option value="60">60+</option><option value="80">80+</option></select>
        <button className="btn btn-primary"><Filter size={15} /> Filtrar</button>
      </form>
      {filtered.length === 0 ? (
        <div className="card grid place-items-center gap-3 py-16 text-center"><Sparkles size={28} className="muted" /><p className="muted text-sm">Nenhuma oportunidade corresponde aos filtros.</p><Link href="/monitored" className="btn btn-ghost">Monitorar produtos</Link></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{filtered.map((item) => <OpportunityCard key={item.offer.id} item={item} />)}</div>
      )}
    </div>
  );
}

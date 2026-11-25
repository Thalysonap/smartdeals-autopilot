import Link from "next/link";
import { ExternalLink, LockKeyhole, ShoppingCart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { brl, dateTime, relative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const cart = await repository.listCart(user.id);
  const stores = await repository.listStores();
  const details = await Promise.all(cart.map(async (item) => {
    const offer = await repository.getOffer(item.offer_id);
    const assessment = await repository.getAssessment(item.offer_id);
    const product = await repository.getMonitored(item.monitored_product_id, user.id);
    return { item, offer, assessment, product };
  }));

  return (
    <div className="animate-in space-y-6">
      <div>
        <p className="muted text-xs uppercase tracking-[.18em]">Seleção automática</p>
        <h1 className="page-title mt-1">Meu carrinho</h1>
        <p className="muted mt-2 max-w-2xl text-sm">Uma única oferta vencedora por produto monitorado. Sempre que uma opção melhor e confiável aparece, o sistema substitui e registra a mudança.</p>
      </div>
      <div className="card flex items-start gap-3 border-[var(--accent)]/30 p-4 text-xs">
        <LockKeyhole size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
        <p>Carrinho interno: o SmartDeals nunca realiza compras, pagamentos ou finaliza pedidos. O botão abre a oferta diretamente na loja.</p>
      </div>
      {details.length === 0 ? (
        <div className="card grid place-items-center gap-3 py-16 text-center"><ShoppingCart size={30} className="muted" /><p className="muted text-sm">Seu carrinho está vazio.</p><Link href="/monitored" className="btn btn-primary">Monitorar um produto</Link></div>
      ) : (
        <div className="space-y-4">
          {details.map(({ item, offer, assessment, product }) => (
            <article key={item.id} className="card grid gap-5 p-5 md:grid-cols-[140px_1fr_auto] md:p-6">
              {offer?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={offer.image_url} alt="" className="h-32 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] object-contain" />
              ) : <div className="grid h-32 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-3xl">📦</div>}
              <div className="min-w-0">
                <p className="muted text-[11px] uppercase tracking-wider">{product?.name ?? "Produto monitorado"}</p>
                <h2 className="mt-1 line-clamp-2 font-semibold">{offer?.title ?? "Oferta indisponível"}</h2>
                <div className="muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <span>Loja: {stores.find((s) => s.id === item.store_id)?.name ?? item.store_id}</span>
                  <span>Vendedor: {offer?.seller_name ?? "não informado"}</span>
                  <span>Coletado: {dateTime(offer?.collected_at)}</span>
                  <span>Atualizado: {relative(item.updated_at)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge text-[var(--positive)]">Melhor oferta válida</span>
                  <span className="badge">Confiança: {assessment?.score === null || !assessment ? "não verificada" : `${assessment.score}/100`}</span>
                  <span className="badge">Frete: {offer?.shipping_price === null || offer?.shipping_price === undefined ? "não verificado" : brl(offer.shipping_price)}</span>
                  <span className={`badge ${offer?.availability === "in_stock" ? "text-[var(--positive)]" : ""}`}>{offer?.availability ?? "unknown"}</span>
                </div>
                <p className="muted mt-3 text-[11px]">Critérios: {item.reason}</p>
              </div>
              <div className="flex flex-row items-center justify-between gap-4 md:flex-col md:items-end md:justify-center">
                <div className="text-right"><p className="muted text-[11px]">Preço total</p><p className="text-2xl font-bold text-[var(--accent)]">{brl(item.total_price ?? item.price)}</p></div>
                {offer && <a href={offer.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Abrir na loja <ExternalLink size={15} /></a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

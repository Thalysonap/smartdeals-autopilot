import { repository, now } from "../lib/repository";
import type { Offer } from "../lib/types";
import { getAdapter } from "../integrations/registry";
import { updateCartForProduct } from "./cart-engine";

export interface RefreshResult { checked: number; updated: number; failed: number }

export async function refreshOffers(options: { limit?: number; maxAgeMinutes?: number } = {}): Promise<RefreshResult> {
  const maxAgeMinutes = options.maxAgeMinutes ?? 120;
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();
  const offers = await repository.listOffers([{ column: "updated_at", op: "lte", value: cutoff }], options.limit ?? 40);
  const result: RefreshResult = { checked: 0, updated: 0, failed: 0 };
  const affected = new Set<string>();

  for (const offer of offers) {
    const adapter = getAdapter(offer.store_id);
    if (!adapter?.capabilities.details || !adapter.getProductDetails) continue;
    result.checked += 1;
    try {
      const candidate = await adapter.getProductDetails(offer.url, AbortSignal.timeout(20000));
      if (!candidate || !candidate.price) { result.failed += 1; continue; }
      const previous: Offer = offer;
      const shipping = candidate.shipping_price;
      await repository.upsertOffer({
        monitored_product_id: offer.monitored_product_id,
        product_id: offer.product_id,
        variant_id: offer.variant_id,
        store_id: offer.store_id,
        seller_name: candidate.seller_name ?? offer.seller_name,
        seller_rating: candidate.seller_rating ?? offer.seller_rating,
        title: candidate.title || offer.title,
        url: offer.url,
        image_url: candidate.image_url ?? offer.image_url,
        price: candidate.price,
        currency: "BRL",
        shipping_price: shipping,
        total_price: shipping === null ? null : Math.round((candidate.price + shipping) * 100) / 100,
        availability: candidate.availability,
        condition: candidate.condition,
        brand: candidate.brand ?? offer.brand,
        model: candidate.model ?? offer.model,
        gtin: candidate.gtin ?? offer.gtin,
        sku: candidate.sku ?? offer.sku,
        attributes: candidate.attributes,
        source: candidate.source,
        collected_at: candidate.collected_at,
        validated_at: now(),
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        match_class: offer.match_class,
        match_reasons: offer.match_reasons,
      });
      if (previous.price !== candidate.price || previous.availability !== candidate.availability) {
        const current = (await repository.listOffers([{ column: "store_id", op: "eq", value: offer.store_id }, { column: "url", op: "eq", value: offer.url }], 1))[0];
        if (current) {
          await repository.insertPriceHistory({
            offer_id: current.id, price: current.price, shipping_price: current.shipping_price,
            availability: current.availability, collected_at: current.collected_at, source: current.source,
          });
        }
        result.updated += 1;
      }
      if (offer.monitored_product_id) affected.add(offer.monitored_product_id);
    } catch {
      result.failed += 1;
    }
  }

  for (const monitoredId of affected) await updateCartForProduct(monitoredId);
  return result;
}

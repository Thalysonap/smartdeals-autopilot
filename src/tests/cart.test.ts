import { describe, expect, it } from "vitest";
import { repository, now } from "../lib/repository";
import { updateCartForProduct } from "../engines/cart-engine";
import { getOpportunities } from "../lib/views";
import type { Offer } from "../lib/types";

async function makeOffer(monitoredId: string, price: number, url: string): Promise<Offer> {
  const timestamp = now();
  return repository.upsertOffer({
    monitored_product_id: monitoredId, product_id: null, variant_id: null, store_id: "kabum",
    seller_name: "Oficial", seller_rating: 4.8, title: "PlayStation 5 Slim 1TB com leitor", url,
    image_url: null, price, currency: "BRL", shipping_price: 0, total_price: price,
    availability: "in_stock", condition: "new", brand: "sony", model: "2114b", gtin: null, sku: null,
    attributes: {}, source: "structured_data", collected_at: timestamp, validated_at: timestamp,
    expires_at: null, match_class: "exact", match_reasons: [],
  });
}

describe("carrinho automático", () => {
  it("mantém uma única oferta vencedora e preserva o histórico ao substituir", async () => {
    const user = await repository.createUser({ email: "cart@test.local", name: "Cart", passwordHash: null });
    const monitored = await repository.createMonitored({
      user_id: user.id, name: "PlayStation 5 Slim 1TB com leitor", brand: "Sony", model: "CFI-2114B",
      version: null, capacity: "1TB", category: "Games", attributes: {}, status: "active", interval_minutes: 240,
    });
    await repository.upsertStore({ id: "kabum", name: "KaBuM!", domain: "www.kabum.com.br", homepage: "https://www.kabum.com.br/", reliability_base: 80 });
    const first = await makeOffer(monitored.id, 2100, "https://www.kabum.com.br/produto/1");
    const firstResult = await updateCartForProduct(monitored.id);
    expect(firstResult.action).toBe("added");

    const better = await makeOffer(monitored.id, 1799, "https://www.kabum.com.br/produto/2");
    const secondResult = await updateCartForProduct(monitored.id);
    expect(secondResult.action).toBe("replaced");
    expect(secondResult.offerId).toBe(better.id);

    const cart = await repository.listCart(user.id);
    expect(cart).toHaveLength(1);
    expect(cart[0].offer_id).toBe(better.id);
    const history = await repository.listCartHistory(user.id);
    expect(history.map((item) => item.action)).toEqual(expect.arrayContaining(["added", "replaced"]));
    expect(history.some((item) => item.previous_offer_id === first.id)).toBe(true);

    const opportunities = await getOpportunities(user.id);
    expect(opportunities.length).toBeGreaterThan(0);
  });
});

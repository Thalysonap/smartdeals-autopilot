import { describe, expect, it } from "vitest";
import { validateOffer } from "../engines/validation";
import { evaluateReliability } from "../engines/reliability";
import { rankOffers } from "../engines/best-offer";
import type { Offer } from "../lib/types";

function offer(overrides: Partial<Offer> = {}): Offer {
  const timestamp = new Date().toISOString();
  return {
    id: "o1", monitored_product_id: "m1", product_id: "p1", variant_id: null, store_id: "kabum",
    seller_name: "Loja oficial", seller_rating: 4.7, title: "PlayStation 5 Slim 1TB", url: "https://www.kabum.com.br/produto/1",
    image_url: null, price: 1899, currency: "BRL", shipping_price: 0, total_price: 1899,
    availability: "in_stock", condition: "new", brand: "sony", model: "2114b", gtin: null, sku: null,
    attributes: {}, source: "structured_data", collected_at: timestamp, validated_at: timestamp,
    expires_at: null, match_class: "exact", match_reasons: [], created_at: timestamp, updated_at: timestamp,
    ...overrides,
  };
}

describe("validação de ofertas", () => {
  it("aceita frete desconhecido mas sinaliza que não é grátis", () => {
    const result = validateOffer(offer({ shipping_price: null, total_price: null }));
    expect(result.valid).toBe(true);
    expect(result.shippingKnown).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/Frete não verificado/);
  });

  it("rejeita esgotadas, expiradas e desatualizadas", () => {
    expect(validateOffer(offer({ availability: "out_of_stock" })).valid).toBe(false);
    expect(validateOffer(offer({ expires_at: new Date(Date.now() - 1000).toISOString() })).valid).toBe(false);
    expect(validateOffer(offer({ collected_at: new Date(Date.now() - 48 * 3600_000).toISOString() })).stale).toBe(true);
  });
});

describe("confiabilidade", () => {
  it("mostra critérios e pontuação quando há dados suficientes", () => {
    const result = evaluateReliability(offer(), { storeReliabilityBase: 70 });
    expect(result.status).toBe("verified");
    expect(result.score).toBeGreaterThan(50);
    expect(result.criteria.length).toBeGreaterThanOrEqual(5);
  });

  it("marca como não verificada quando faltam sinais", () => {
    const result = evaluateReliability(offer({ availability: "unknown", seller_rating: null, match_class: null }));
    expect(result.status).toBe("unverified");
    expect(result.score).toBeNull();
  });
});

describe("seleção da melhor oferta", () => {
  it("não deixa uma oferta barata e arriscada vencer automaticamente", () => {
    const safe = offer({ id: "safe", price: 1899, total_price: 1899 });
    const risky = offer({ id: "risky", price: 900, total_price: 900, seller_rating: null, store_id: "desconhecida", match_class: "probable", availability: "unknown" });
    const result = rankOffers({ offers: [risky, safe], monitoredName: "PS5", storeReliability: { kabum: 80, desconhecida: 30 }, historyByOffer: {} });
    expect(result.winner?.offer.id).toBe("safe");
    expect(result.eligible.some((item) => item.offer.id === "risky")).toBe(false);
  });

  it("considera frete e histórico na pontuação", () => {
    const withShipping = offer({ id: "a", price: 1800, shipping_price: 99, total_price: 1899 });
    const withoutShipping = offer({ id: "b", price: 1750, shipping_price: null, total_price: null });
    const result = rankOffers({ offers: [withShipping, withoutShipping], monitoredName: "PS5", storeReliability: { kabum: 70 }, historyByOffer: {} });
    expect(result.winner?.offer.id).toBe("a");
    expect(result.evaluations.find((item) => item.offer.id === "b")?.rankingReasons.join(" ")).toMatch(/Frete não verificado/);
  });
});

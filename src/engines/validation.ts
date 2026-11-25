import type { Offer } from "../lib/types";

export interface ValidationOptions {
  maxAgeHours?: number;
  now?: Date;
}

export interface ValidationResult { valid: boolean; reasons: string[]; stale: boolean; shippingKnown: boolean }

export function validateOffer(offer: Offer, options: ValidationOptions = {}): ValidationResult {
  const maxAgeHours = options.maxAgeHours ?? 24;
  const reference = (options.now ?? new Date()).getTime();
  const reasons: string[] = [];
  const collected = new Date(offer.collected_at).getTime();
  const stale = !Number.isFinite(collected) || reference - collected > maxAgeHours * 3600_000;
  const shippingKnown = typeof offer.shipping_price === "number" && Number.isFinite(offer.shipping_price);
  if (!offer.url || !/^https?:\/\//i.test(offer.url)) reasons.push("URL inválida ou ausente");
  if (!Number.isFinite(offer.price) || offer.price <= 0) reasons.push("Preço ausente ou inválido");
  if (offer.availability === "out_of_stock") reasons.push("Produto indisponível");
  if (offer.expires_at && new Date(offer.expires_at).getTime() < reference) reasons.push("Oferta expirada");
  if (stale) reasons.push(`Coleta desatualizada (mais de ${maxAgeHours}h)`);
  if (offer.match_class === "incompatible") reasons.push("Produto incompatível com o monitoramento");
  if (offer.match_class === "uncertain") reasons.push("Correspondência incerta com o produto monitorado");
  if (!shippingKnown) reasons.push("Frete não verificado (não considerado grátis)");
  return { valid: reasons.filter((r) => !r.startsWith("Frete não")).length === 0, reasons, stale, shippingKnown };
}

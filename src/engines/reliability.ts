import type { Offer, ReliabilityAssessment } from "../lib/types";

export interface ReliabilityOptions {
  storeReliabilityBase?: number | null;
  now?: Date;
}

export interface ReliabilityResult {
  score: number | null;
  status: "verified" | "unverified";
  criteria: ReliabilityAssessment["criteria"];
}

export function evaluateReliability(offer: Offer, options: ReliabilityOptions = {}): ReliabilityResult {
  const criteria: ReliabilityAssessment["criteria"] = [];
  let score = 45;
  let signals = 0;
  const add = (key: string, label: string, impact: number, detail: string, verified: boolean) => {
    score += impact;
    if (verified) signals += 1;
    criteria.push({ key, label, impact, detail });
  };

  const storeBase = options.storeReliabilityBase;
  if (typeof storeBase === "number") {
    add("store", "Histórico da loja", Math.round((storeBase - 50) / 5), `Baseline configurado da loja: ${storeBase}/100 (heurística interna)`, true);
  } else {
    add("store", "Histórico da loja", -3, "Loja sem histórico verificado", false);
  }

  if (typeof offer.seller_rating === "number" && offer.seller_rating >= 0) {
    const impact = Math.max(-10, Math.min(10, Math.round((offer.seller_rating - 4) * 10)));
    add("seller", "Reputação do vendedor", impact, `Avaliação verificada na fonte: ${offer.seller_rating.toFixed(1)}`, true);
  } else {
    add("seller", "Reputação do vendedor", -2, `Vendedor ${offer.seller_name ?? "não informado"} sem avaliação verificável`, false);
  }

  const availabilityImpact = offer.availability === "in_stock" ? 8 : offer.availability === "out_of_stock" ? -25 : -3;
  add("availability", "Disponibilidade", availabilityImpact, `Disponibilidade declarada pela fonte: ${offer.availability}`, offer.availability !== "unknown");

  const ageHours = (options.now ?? new Date()).getTime() - new Date(offer.collected_at).getTime();
  const age = ageHours / 3600_000;
  if (age <= 6) add("freshness", "Atualidade da coleta", 10, `Coletada há ${Math.max(0, Math.round(age))}h`, true);
  else if (age <= 24) add("freshness", "Atualidade da coleta", 4, `Coletada há ${Math.round(age)}h`, true);
  else add("freshness", "Atualidade da coleta", -15, `Coletada há ${Math.round(age)}h`, true);

  const matchImpact = offer.match_class === "exact" ? 10 : offer.match_class === "probable" ? 3 : offer.match_class === "uncertain" ? -15 : -20;
  add("match", "Correspondência do produto", matchImpact, `Classificação: ${offer.match_class ?? "não avaliada"}`, Boolean(offer.match_class));

  const sourceImpact = offer.source === "api" || offer.source === "structured_data" ? 6 : offer.source === "html" ? 2 : -2;
  add("source", "Origem da informação", sourceImpact, `Origem: ${offer.source}`, true);

  const secure = /^https:\/\//i.test(offer.url);
  add("link", "Integridade do link", secure ? 4 : -10, secure ? "Link HTTPS válido" : "Link sem HTTPS", true);

  add("shipping", "Frete informado", typeof offer.shipping_price === "number" ? 3 : -2,
    typeof offer.shipping_price === "number" ? `Frete informado: R$ ${offer.shipping_price.toFixed(2)}` : "Frete não verificado", false);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const verified = signals >= 3 && offer.availability !== "unknown";
  return {
    score: verified ? score : null,
    status: verified ? "verified" : "unverified",
    criteria,
  };
}

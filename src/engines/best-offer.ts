import type { Offer, OfferEvaluation, OfferPriceHistory, ReliabilityAssessment } from "../lib/types";
import { evaluateReliability } from "./reliability";
import { validateOffer } from "./validation";
import type { MatchResult } from "./matching";

export interface RankingInput {
  offers: Offer[];
  monitoredName: string;
  storeReliability: Record<string, number>;
  historyByOffer: Record<string, OfferPriceHistory[]>;
  matches?: Record<string, MatchResult>;
  maxAgeHours?: number;
  now?: Date;
}

export interface RankingResult {
  evaluations: OfferEvaluation[];
  eligible: OfferEvaluation[];
  winner: OfferEvaluation | null;
  rejected: Array<{ offerId: string; reasons: string[] }>;
}

export function rankOffers(input: RankingInput): RankingResult {
  const now = input.now ?? new Date();
  const evaluations: OfferEvaluation[] = [];
  const rejected: RankingResult["rejected"] = [];

  for (const offer of input.offers) {
    const validation = validateOffer(offer, { maxAgeHours: input.maxAgeHours, now });
    const match = input.matches?.[offer.id] ?? {
      classification: offer.match_class ?? "uncertain", score: 0, reasons: offer.match_reasons ?? [],
    };
    const reliability = evaluateReliability(offer, { storeReliabilityBase: input.storeReliability[offer.store_id] ?? null, now });
    if (!validation.valid || match.classification === "incompatible" || match.classification === "uncertain") {
      rejected.push({ offerId: offer.id, reasons: [...validation.reasons, ...match.reasons] });
      continue;
    }

    const shippingKnown = validation.shippingKnown;
    const effectivePrice = shippingKnown ? (offer.total_price ?? offer.price) : offer.price * 1.06;
    const reasons = [
      `Preço considerado: R$ ${effectivePrice.toFixed(2)}`,
      shippingKnown ? "Frete verificado" : "Frete não verificado: aplicado ajuste conservador de 6%",
      `Confiança: ${reliability.score === null ? "não verificada" : `${reliability.score}/100`}`,
      `Correspondência: ${match.classification}`,
    ];

    const history = input.historyByOffer[offer.id] ?? [];
    const pastPrices = history.map((h) => h.price).filter((p) => p > 0);
    const lowest = pastPrices.length ? Math.min(...pastPrices) : offer.price;
    const historyBonus = offer.price <= lowest * 1.01 ? 10 : offer.price > lowest * 1.2 ? -8 : 0;
    if (historyBonus) reasons.push(historyBonus > 0 ? "Preço no menor nível do histórico" : "Preço acima do histórico recente");

    const relativePrice = 1 / (1 + effectivePrice / 1000);
    const breakdown = {
      price: Math.round(relativePrice * 50),
      reliability: Math.round((reliability.score ?? 40) * 0.35),
      freshness: Math.round(Math.max(0, 15 - ((now.getTime() - new Date(offer.collected_at).getTime()) / 3600_000)) * 1),
      history: historyBonus,
    };
    const score = Math.max(0, Math.min(100, breakdown.price + breakdown.reliability + breakdown.freshness + breakdown.history));
    reasons.push(`Pontuação: preço ${breakdown.price} + confiança ${breakdown.reliability} + atualidade ${breakdown.freshness} + histórico ${breakdown.history}`);

    evaluations.push({
      offer,
      match: { classification: match.classification, score: match.score, reasons: match.reasons },
      validation,
      reliability: {
        score: reliability.score,
        status: reliability.status,
        criteria: reliability.criteria as ReliabilityAssessment["criteria"],
      },
      score,
      rankingReasons: reasons,
    });
  }

  evaluations.sort((a, b) => b.score - a.score || a.offer.price - b.offer.price);
  const eligible = evaluations.filter((e) => e.reliability.score !== null && e.reliability.score >= 40 && e.validation.valid);
  return {
    evaluations,
    eligible,
    winner: eligible[0] ?? null,
    rejected,
  };
}

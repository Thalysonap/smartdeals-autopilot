import type { MatchClass, MonitoredProduct, Offer, ProductCandidate } from "../lib/types";
import { extractSpecs, normalizeText, type Specs } from "./normalization";

const STOPWORDS = new Set([
  "console", "produto", "original", "com", "com", "de", "do", "da", "para", "the", "with", "novo",
  "lancamento", "lançamento", "edition", "edicao", "versao", "ssd", "gb", "tb", "unidade", "kit",
]);

function monitoredSpecs(monitored: MonitoredProduct): Specs {
  const specs = extractSpecs(monitored.name, {
    ...(monitored.attributes ?? {}),
    ...(monitored.brand ? { brand: normalizeText(monitored.brand) } : {}),
    ...(monitored.model ? { model: normalizeText(monitored.model) } : {}),
    ...(monitored.capacity ? { capacity: normalizeText(monitored.capacity) } : {}),
    ...(monitored.version ? { version: normalizeText(monitored.version) } : {}),
  });
  if (monitored.version) specs.version = normalizeText(monitored.version);
  return specs;
}

function conflict(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  return normalizeText(a) !== normalizeText(b);
}

export interface MatchResult { classification: MatchClass; score: number; reasons: string[] }

export function matchSpecs(expected: Specs, observed: Specs): MatchResult {
  const reasons: string[] = [];
  const hardFields: Array<[string, string]> = [
    ["capacity", "Capacidade diferente"],
    ["edition", "Edição diferente (digital/com leitor)"],
    ["memory", "Tipo de memória diferente (DDR4/DDR5)"],
    ["form_factor", "Geração/fator de forma diferente"],
    ["brand", "Marca diferente"],
    ["model", "Modelo diferente"],
  ];
  for (const [field, label] of hardFields) {
    if (expected[field] !== undefined && observed[field] !== undefined && conflict(expected[field], observed[field])) {
      reasons.push(label);
      return { classification: "incompatible", score: 0, reasons };
    }
  }
  if (expected.condition === "new" && observed.condition === "used") {
    reasons.push("Produto usado não equivale a produto novo");
    return { classification: "incompatible", score: 0, reasons };
  }

  const expectedTokens = normalizeText(String(expected.sourceTitle ?? "")).split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const observedTokens = new Set(normalizeText(String(observed.sourceTitle ?? "")).split(" "));
  const covered = expectedTokens.filter((t) => observedTokens.has(t)).length;
  const coverage = expectedTokens.length ? covered / expectedTokens.length : 0;
  const brandOk = !expected.brand || !observed.brand || !conflict(expected.brand, observed.brand);
  const modelOk = !expected.model || !observed.model || !conflict(expected.model, observed.model);
  const capacityOk = !expected.capacity || !observed.capacity || !conflict(expected.capacity, observed.capacity);
  const editionOk = !expected.edition || !observed.edition || !conflict(expected.edition, observed.edition);
  let score = coverage * 0.55 + (brandOk ? 0.15 : 0) + (modelOk ? 0.15 : 0) + (capacityOk ? 0.08 : 0) + (editionOk ? 0.07 : 0);
  if (expected.version && !String(observed.sourceTitle ?? "").toLowerCase().includes(String(expected.version))) {
    score -= 0.12;
    reasons.push("Versão informada não confirmada na oferta");
  }
  score = Math.max(0, Math.min(1, score));
  if (coverage > 0) reasons.push(`${covered} de ${expectedTokens.length} termos do produto presentes na oferta`);
  if (brandOk && expected.brand) reasons.push("Marca compatível");
  if (modelOk && expected.model) reasons.push("Modelo compatível");
  if (capacityOk && expected.capacity) reasons.push("Capacidade compatível");

  let classification: MatchClass = "incompatible";
  if (score >= 0.85) classification = "exact";
  else if (score >= 0.65) classification = "probable";
  else if (score >= 0.4) classification = "uncertain";
  return { classification, score: Math.round(score * 100) / 100, reasons };
}

export function matchCandidate(candidate: ProductCandidate, monitored: MonitoredProduct): MatchResult {
  const observed = { ...candidate.attributes, sourceTitle: candidate.title };
  const expected = { ...monitoredSpecs(monitored), sourceTitle: monitored.name };
  return matchSpecs(expected, observed);
}

export function matchOffer(offer: Offer, monitored: MonitoredProduct): MatchResult {
  return matchSpecs(
    { ...monitoredSpecs(monitored), sourceTitle: monitored.name },
    { ...offer.attributes, ...(offer.brand ? { brand: offer.brand } : {}), ...(offer.model ? { model: offer.model } : {}), sourceTitle: offer.title },
  );
}

import type { Condition, DataSource, ProductCandidate } from "../lib/types";

export type Specs = Record<string, string | number | boolean>;

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseBRLPrice(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) && input > 0 ? input : null;
  if (!input) return null;
  const match = String(input).match(/\d[\d.,]*/);
  if (!match) return null;
  let raw = match[0];
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  if (lastComma > -1) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > -1 && raw.length - lastDot === 3 && raw.indexOf(".") !== lastDot) {
    raw = raw.replace(/\./g, "");
  } else if (lastDot > -1 && raw.length - lastDot === 3 && raw.indexOf(".") === lastDot) {
    const digits = raw.slice(lastDot + 1);
    raw = /^\d{3}$/.test(digits) && raw.length > 4 ? raw : raw.replace(".", ".");
  }
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

const BRANDS = [
  "playstation", "sony", "xbox", "microsoft", "nintendo", "samsung", "apple", "motorola", "xiaomi",
  "lenovo", "asus", "acer", "dell", "hp", "nvidia", "amd", "intel", "amd", "kingston", "corsair",
  "logitech", "redragon", "hyperx", "lg", "philips", "toshiba", "western digital", "seagate", "positivo",
];

const CAPACITY_RE = /\b(\d+(?:[.,]\d+)?)\s?(tb|gb|mb)\b/i;
const MODEL_RES: RegExp[] = [
  /\bcfi[-\s]?(\d{4}[a-z]?)\b/i,
  /\brtx\s?(\d{4})\b/i,
  /\bgtx\s?(\d{4})\b/i,
  /\biphone\s?(\d{1,2}(?:\s?pro|\s?plus|\s?mini)?)\b/i,
  /\bgalaxy\s?s(\d{1,2})\b/i,
  /\bryzen\s?(\d{4})\b/i,
  /\bcore\s?i(\d)\b/i,
];

export function extractSpecs(title: string, extra: Specs = {}): Specs {
  const text = normalizeText(title);
  const specs: Specs = { ...extra };
  for (const brand of BRANDS) {
    if (text.includes(brand)) { specs.brand = brand; break; }
  }
  const capacity = text.match(CAPACITY_RE);
  if (capacity) specs.capacity = `${capacity[1].replace(",", ".")}${capacity[2].toLowerCase()}`;
  for (const re of MODEL_RES) {
    const found = text.match(re);
    if (found) { specs.model = normalizeText(found[1]); break; }
  }
  if (/\bdigital\b|\bedicao digital\b|versao digital/.test(text)) specs.edition = "digital";
  else if (/\bleitor de disco\b|\bcom leitor\b|\bcom disco\b|\bdisc edition\b/.test(text)) specs.edition = "disc";
  if (/\bslim\b/.test(text)) specs.form_factor = "slim";
  if (/\bpro\b/.test(text)) specs.form_factor = "pro";
  if (/\bddr4\b/.test(text)) specs.memory = "ddr4";
  if (/\bddr5\b/.test(text)) specs.memory = "ddr5";
  if (/\bused\b|\busado\b|\brecondicionado\b|\brefurbished\b/.test(text)) specs.condition = "used";
  else if (/\bnovo\b|\bnew\b/.test(text)) specs.condition = "new";
  const colors: Record<string, string> = { branco: "white", preto: "black", azul: "blue", vermelho: "red", prata: "silver", cinza: "gray" };
  for (const [pt, en] of Object.entries(colors)) {
    if (text.includes(pt)) { specs.color = en; break; }
  }
  return specs;
}

export function toCandidate(input: {
  externalId: string; title: string; url: string; imageUrl?: string | null;
  price: string | number | null; currency?: "BRL"; shippingPrice?: string | number | null;
  availability?: ProductCandidate["availability"]; condition?: Condition;
  brand?: string | null; model?: string | null; gtin?: string | null; sku?: string | null;
  sellerName?: string | null; sellerRating?: number | null;
  attributes?: Specs; source: DataSource; collectedAt?: string;
}): ProductCandidate | null {
  const price = parseBRLPrice(input.price);
  if (!price || !input.url || !input.title) return null;
  const specs = extractSpecs(input.title, input.attributes ?? {});
  return {
    external_id: input.externalId,
    title: input.title.trim(),
    url: input.url,
    image_url: input.imageUrl ?? null,
    price,
    currency: "BRL",
    shipping_price: parseBRLPrice(input.shippingPrice),
    availability: input.availability ?? "unknown",
    condition: input.condition ?? (specs.condition === "used" ? "used" : "new"),
    brand: input.brand ?? (typeof specs.brand === "string" ? specs.brand : null),
    model: input.model ?? (typeof specs.model === "string" ? specs.model : null),
    gtin: input.gtin ?? null,
    sku: input.sku ?? null,
    seller_name: input.sellerName ?? null,
    seller_rating: input.sellerRating ?? null,
    attributes: specs,
    source: input.source,
    collected_at: input.collectedAt ?? new Date().toISOString(),
  };
}

export function canonicalKey(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.search = "";
    url.hash = "";
    return `${url.hostname}${url.pathname}`.toLowerCase();
  } catch { return rawUrl.toLowerCase(); }
}

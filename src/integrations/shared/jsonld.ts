import * as cheerio from "cheerio";
import { toCandidate } from "../../engines/normalization";
import type { DataSource, ProductCandidate } from "../../lib/types";

interface JsonLdOffer { price?: string | number; priceCurrency?: string; availability?: string; url?: string; seller?: { name?: string } }
interface JsonLdProduct {
  "@type"?: string | string[];
  name?: string; image?: string | string[]; sku?: string; gtin?: string | string[];
  brand?: { name?: string } | string; offers?: JsonLdOffer | JsonLdOffer[];
  description?: string;
}

export function readJsonLd(html: string): unknown[] {
  const $ = cheerio.load(html);
  const output: unknown[] = [];
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const raw = ($(element).html() ?? "").trim();
    if (!raw) continue;
    try { output.push(JSON.parse(raw)); } catch { /* bloco inválido é ignorado */ }
  }
  return output;
}

function flatten<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseJsonLdProducts(html: string, storeUrl: (url: string) => string, source: DataSource): ProductCandidate[] {
  const blocks = readJsonLd(html);
  const output: ProductCandidate[] = [];
  for (const block of blocks) {
    const nodes = Array.isArray(block) ? block : [block];
    for (const node of nodes) {
      const candidates = flatten(node as JsonLdProduct).filter((p) => {
        const type = p?.["@type"];
        return type === "Product" || (Array.isArray(type) && type.includes("Product"));
      });
      for (const product of candidates) {
        const offers = flatten(product.offers);
        for (const offer of offers) {
          const url = offer.url ? storeUrl(offer.url) : "";
          const candidate = toCandidate({
            externalId: String(product.sku ?? product.gtin ?? url),
            title: product.name ?? "",
            url,
            imageUrl: Array.isArray(product.image) ? product.image[0] : product.image,
            price: offer.price ?? null,
            shippingPrice: null,
            availability: /OutOfStock/i.test(offer.availability ?? "") ? "out_of_stock" : /InStock/i.test(offer.availability ?? "") ? "in_stock" : "unknown",
            condition: "new",
            brand: typeof product.brand === "string" ? product.brand : product.brand?.name ?? null,
            sku: product.sku ?? null,
            gtin: Array.isArray(product.gtin) ? product.gtin[0] ?? null : product.gtin ?? null,
            sellerName: offer.seller?.name ?? null,
            source,
          });
          if (candidate) output.push(candidate);
        }
      }
    }
  }
  return output;
}

export function extractBalancedArray(text: string, start: number): string | null {
  if (text[start] !== "[") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function absoluteUrl(raw: string | null | undefined, base: string): string | null {
  if (!raw) return null;
  try { return new URL(raw.startsWith("//") ? `https:${raw}` : raw, base).toString(); } catch { return null; }
}

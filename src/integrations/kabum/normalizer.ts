import { toCandidate } from "../../engines/normalization";
import type { ProductCandidate } from "../../lib/types";
import { absoluteUrl, parseJsonLdProducts } from "../shared/jsonld";

interface KabumRawProduct {
  sku?: string;
  name?: string;
  image?: string;
  url?: string;
  price?: number | string;
  availability?: string;
  brand?: string;
  sellerName?: string;
}

export function normalizeKabumProduct(raw: KabumRawProduct, baseUrl: string): ProductCandidate | null {
  return toCandidate({
    externalId: String(raw.sku ?? raw.url ?? raw.name ?? ""),
    title: raw.name ?? "",
    url: absoluteUrl(raw.url, baseUrl) ?? "",
    imageUrl: absoluteUrl(raw.image, baseUrl),
    price: raw.price ?? null,
    shippingPrice: null,
    availability: /OutOfStock/i.test(raw.availability ?? "") ? "out_of_stock" : /InStock/i.test(raw.availability ?? "") ? "in_stock" : "unknown",
    brand: raw.brand ?? null,
    sku: raw.sku ?? null,
    sellerName: raw.sellerName ?? null,
    source: "structured_data",
  });
}

export function parseKabumSearch(html: string, baseUrl: string): ProductCandidate[] {
  const fromJsonLd = parseJsonLdProducts(html, (url) => absoluteUrl(url, baseUrl) ?? url, "structured_data");
  if (fromJsonLd.length) return fromJsonLd;
  const marker = html.indexOf('"friendlyName"');
  if (marker === -1) return [];
  const raw: KabumRawProduct[] = [];
  const namePattern = /"name":"([^"]{4,200})"/g;
  let match: RegExpExecArray | null;
  while ((match = namePattern.exec(html.slice(marker))) !== null) {
    raw.push({ name: match[1].replace(/\\u0026/g, "&") });
  }
  return raw.slice(0, 30).map((item) => normalizeKabumProduct(item, baseUrl)).filter((item): item is ProductCandidate => Boolean(item));
}

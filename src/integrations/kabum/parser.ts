import type { ProductCandidate } from "../../lib/types";
import { normalizeKabumProduct, parseKabumSearch } from "./normalizer";
import { parseJsonLdProducts } from "../shared/jsonld";

export function parseKabumSearchPage(html: string, baseUrl: string): ProductCandidate[] {
  return parseKabumSearch(html, baseUrl);
}

export function parseKabumProductPage(html: string, baseUrl: string): ProductCandidate | null {
  return parseJsonLdProducts(html, (url) => new URL(url, baseUrl).toString(), "structured_data")[0] ?? normalizeKabumProduct({}, baseUrl);
}

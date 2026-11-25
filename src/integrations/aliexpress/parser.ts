import type { ProductCandidate } from "../../lib/types";
import { normalizeAliExpressItem, parseAliExpressProduct, parseAliExpressSearch } from "./normalizer";
import { absoluteUrl, readJsonLd } from "../shared/jsonld";

export function parseAliExpressSearchPage(html: string): ProductCandidate[] {
  const fromCards = parseAliExpressSearch(html);
  if (fromCards.length) return fromCards;
  const fromJsonLd = readJsonLd(html).flatMap((block) => {
    const itemList = (block as { itemListElement?: Array<{ url?: string }> }).itemListElement;
    return (itemList ?? []).map((entry) => (entry.url ? normalizeAliExpressItem({ redirectedId: entry.url.match(/item\/(\d+)/)?.[1] }) : null));
  });
  return fromJsonLd.filter((item): item is ProductCandidate => Boolean(item));
}

export function parseAliExpressProductPage(html: string, baseUrl: string): ProductCandidate | null {
  return parseAliExpressProduct(html, baseUrl);
}

export { absoluteUrl };

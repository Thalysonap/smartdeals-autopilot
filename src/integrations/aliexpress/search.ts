import type { ProductCandidate } from "../../lib/types";
import { normalizeText } from "../../engines/normalization";
import { fetchPublicPage } from "../http";
import { parseAliExpressSearchPage } from "./parser";

export async function searchAliExpress(query: string, signal?: AbortSignal): Promise<ProductCandidate[]> {
  const slug = normalizeText(query).replace(/\s+/g, "-") || "product";
  const url = `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(slug)}.html`;
  const result = await fetchPublicPage(url, { storeId: "aliexpress", method: "html", operation: "search", signal });
  const candidates = parseAliExpressSearchPage(result.text);
  await result.reportItems(candidates.length);
  return candidates;
}

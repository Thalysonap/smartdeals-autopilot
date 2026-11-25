import type { ProductCandidate } from "../../lib/types";
import { assertPublicUrl, fetchPublicPage } from "../http";
import { parseAliExpressProductPage } from "./parser";

export async function getAliExpressProduct(url: string, signal?: AbortSignal): Promise<ProductCandidate | null> {
  const parsed = assertPublicUrl(url);
  if (!/aliexpress\.com$/.test(parsed.hostname)) return null;
  const result = await fetchPublicPage(parsed.toString(), { storeId: "aliexpress", method: "structured_data", operation: "details", signal });
  return parseAliExpressProductPage(result.text, result.finalUrl);
}

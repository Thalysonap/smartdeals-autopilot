import type { ProductCandidate } from "../../lib/types";
import { fetchPublicPage } from "../http";
import { parseKabumSearchPage } from "./parser";

export async function searchKabum(query: string, signal?: AbortSignal): Promise<ProductCandidate[]> {
  const url = `https://www.kabum.com.br/busca/${encodeURIComponent(query.trim())}`;
  const result = await fetchPublicPage(url, { storeId: "kabum", method: "structured_data", operation: "search", signal });
  const candidates = parseKabumSearchPage(result.text, result.finalUrl);
  await result.reportItems(candidates.length);
  return candidates;
}

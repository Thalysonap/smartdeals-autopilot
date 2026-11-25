import type { ProductCandidate } from "../../lib/types";
import { fetchPublicPage } from "../http";
import { parseMercadoLivreSearch } from "./parser";

export async function searchMercadoLivre(query: string, signal?: AbortSignal): Promise<ProductCandidate[]> {
  const token = process.env.MERCADO_LIVRE_ACCESS_TOKEN;
  const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "20");
  if (token) url.searchParams.set("access_token", token);
  const result = await fetchPublicPage(url.toString(), { storeId: "mercado-livre", method: "api", operation: "search", signal });
  const candidates = parseMercadoLivreSearch(JSON.parse(result.text));
  await result.reportItems(candidates.length);
  return candidates;
}

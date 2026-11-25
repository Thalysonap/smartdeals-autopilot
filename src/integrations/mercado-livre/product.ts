import type { ProductCandidate } from "../../lib/types";
import { fetchPublicPage } from "../http";
import { normalizeMercadoLivreResult } from "./normalizer";

export async function getMercadoLivreProduct(url: string, signal?: AbortSignal): Promise<ProductCandidate | null> {
  const parsed = new URL(url);
  if (!/mercadolivre\.com\.br$|mercadolibre\.com\.ar$/.test(parsed.hostname)) return null;
  const itemId = parsed.pathname.match(/(?:MLB|MLA)(\d+)-/)?.[1];
  if (!itemId) return null;
  const token = process.env.MERCADO_LIVRE_ACCESS_TOKEN;
  const apiUrl = new URL(`https://api.mercadolibre.com/items/MLB${itemId}`);
  if (token) apiUrl.searchParams.set("access_token", token);
  const result = await fetchPublicPage(apiUrl.toString(), { storeId: "mercado-livre", method: "api", operation: "details", signal });
  return normalizeMercadoLivreResult(JSON.parse(result.text) as never);
}

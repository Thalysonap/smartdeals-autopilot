import type { ProductCandidate } from "../../lib/types";
import { assertPublicUrl, fetchPublicPage } from "../http";
import { parseKabumProductPage } from "./parser";

export async function getKabumProduct(url: string, signal?: AbortSignal): Promise<ProductCandidate | null> {
  const parsed = assertPublicUrl(url);
  if (parsed.hostname !== "www.kabum.com.br" && parsed.hostname !== "kabum.com.br") return null;
  const result = await fetchPublicPage(parsed.toString(), { storeId: "kabum", method: "structured_data", operation: "details", signal });
  return parseKabumProductPage(result.text, result.finalUrl);
}

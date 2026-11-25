import { toCandidate } from "../../engines/normalization";
import type { ProductCandidate } from "../../lib/types";

interface MeliResult {
  id?: string;
  title?: string;
  permalink?: string;
  thumbnail?: string;
  price?: number;
  currency_id?: string;
  condition?: string;
  available_quantity?: number;
  seller?: { nickname?: string; reputation?: { level_id?: string } };
  shipping?: { free_shipping?: boolean };
  attributes?: Array<{ id?: string; name?: string; value_name?: string }>;
}

export function normalizeMercadoLivreResult(item: MeliResult): ProductCandidate | null {
  const specs: Record<string, string | number | boolean> = {};
  for (const attribute of item.attributes ?? []) {
    if (attribute.id && attribute.value_name) specs[attribute.id] = attribute.value_name;
  }
  return toCandidate({
    externalId: String(item.id ?? ""),
    title: item.title ?? "",
    url: item.permalink ?? "",
    imageUrl: item.thumbnail ?? null,
    price: item.price ?? null,
    shippingPrice: item.shipping?.free_shipping === true ? 0 : null,
    availability: (item.available_quantity ?? 0) > 0 ? "in_stock" : "out_of_stock",
    condition: item.condition === "used" ? "used" : item.condition === "new" ? "new" : "unknown",
    sellerName: item.seller?.nickname ?? null,
    attributes: specs,
    source: "api",
  });
}

export function parseMercadoLivreResponse(payload: unknown): ProductCandidate[] {
  const results = (payload as { results?: MeliResult[] })?.results ?? [];
  return results.map(normalizeMercadoLivreResult).filter((item): item is ProductCandidate => Boolean(item));
}

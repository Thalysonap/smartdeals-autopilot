import { toCandidate } from "../../engines/normalization";
import type { ProductCandidate } from "../../lib/types";
import { absoluteUrl, extractBalancedArray, parseJsonLdProducts } from "../shared/jsonld";

interface AliExpressItem {
  productId?: string;
  redirectedId?: string;
  title?: { displayTitle?: string };
  image?: { imgUrl?: string };
  prices?: { salePrice?: { minPrice?: number }; originalPrice?: { minPrice?: number } };
  store?: { name?: string; storeId?: string };
  evaluation?: { starRating?: number };
  trade?: { tradeDesc?: string };
}

export function normalizeAliExpressItem(item: AliExpressItem): ProductCandidate | null {
  const id = item.productId ?? item.redirectedId;
  if (!id) return null;
  return toCandidate({
    externalId: id,
    title: item.title?.displayTitle ?? "",
    url: `https://www.aliexpress.com/item/${id}.html`,
    imageUrl: absoluteUrl(item.image?.imgUrl, "https://www.aliexpress.com/"),
    price: item.prices?.salePrice?.minPrice ?? item.prices?.originalPrice?.minPrice ?? null,
    shippingPrice: null,
    availability: /sold out|esgotado/i.test(item.title?.displayTitle ?? "") ? "out_of_stock" : "in_stock",
    condition: "new",
    sellerName: item.store?.name ?? null,
    source: "html",
  });
}

export function parseAliExpressSearch(html: string): ProductCandidate[] {
  const marker = html.indexOf('"itemList":{"content":[');
  if (marker === -1) return [];
  const arrayStart = html.indexOf("[", marker);
  const rawArray = extractBalancedArray(html, arrayStart);
  if (!rawArray) return [];
  try {
    const items = JSON.parse(rawArray) as AliExpressItem[];
    return items.map(normalizeAliExpressItem).filter((item): item is ProductCandidate => Boolean(item));
  } catch { return []; }
}

export function parseAliExpressProduct(html: string, baseUrl: string): ProductCandidate | null {
  return parseJsonLdProducts(html, (url) => absoluteUrl(url, baseUrl) ?? url, "structured_data")[0] ?? null;
}

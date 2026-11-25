import { toCandidate } from "../../engines/normalization";
import type { ProductCandidate } from "../../lib/types";
import { createHttpStoreAdapter } from "../shared/http-store";
import { extractBalancedArray } from "../shared/jsonld";

const LIMITATION = "Página pública de busca exige verificação (CAPTCHA) neste ambiente; nenhum mecanismo de burla é utilizado.";

interface ShopeeItem { itemid?: number; name?: string; currency?: string; price?: number; image?: string }

function parse(html: string): ProductCandidate[] {
  const marker = html.indexOf('"item_list":[');
  if (marker === -1) return [];
  const raw = extractBalancedArray(html, html.indexOf("[", marker));
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as ShopeeItem[];
    return items.map((item) => toCandidate({
      externalId: String(item.itemid ?? ""),
      title: item.name ?? "",
      url: `https://shopee.com.br/produto/${item.itemid}`,
      imageUrl: item.image ? `https://down-br.img.susercontent.com/file/${item.image}` : null,
      price: item.price ? (item.price / 100000).toFixed(2) : null,
      source: "html",
    })).filter((item): item is NonNullable<typeof item> => Boolean(item));
  } catch { return []; }
}

const Adapter = createHttpStoreAdapter({
  storeId: "shopee",
  method: "html",
  limitation: LIMITATION,
  homepage: "https://shopee.com.br/",
  buildSearchUrl: (q) => `https://shopee.com.br/search?keyword=${encodeURIComponent(q)}`,
  parse,
});

export const shopeeAdapter = new Adapter();

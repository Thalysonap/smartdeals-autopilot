import { parseDomCards } from "../shared/dom";
import { createHttpStoreAdapter } from "../shared/http-store";
import { parseJsonLdProducts } from "../shared/jsonld";

const LIMITATION = "Loja retornou HTTP 403 neste ambiente; conector implementado, mas não validado.";

function parse(html: string, baseUrl: string) {
  const structured = parseJsonLdProducts(html, (url) => new URL(url, baseUrl).toString(), "structured_data");
  if (structured.length) return structured;
  return parseDomCards(html, baseUrl, {
    card: "[data-testid='product-card'], li[data-testid]",
    title: "[data-testid='product-card-name'], h2, h3",
    price: "[data-testid='product-card-price'], .price",
    link: "a",
    image: "img",
  }, "html");
}

const Adapter = createHttpStoreAdapter({
  storeId: "magalu",
  method: "structured_data",
  limitation: LIMITATION,
  homepage: "https://www.magazineluiza.com.br/",
  buildSearchUrl: (q) => `https://www.magazineluiza.com.br/busca/${encodeURIComponent(q)}/`,
  parse,
});

export const magaluAdapter = new Adapter();

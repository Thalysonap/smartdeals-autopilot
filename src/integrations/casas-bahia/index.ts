import { parseDomCards } from "../shared/dom";
import { createHttpStoreAdapter } from "../shared/http-store";
import { parseJsonLdProducts } from "../shared/jsonld";

const LIMITATION = "Loja retornou HTTP 403 neste ambiente; conector implementado, mas não validado.";

function parse(html: string, baseUrl: string) {
  const structured = parseJsonLdProducts(html, (url) => new URL(url, baseUrl).toString(), "structured_data");
  if (structured.length) return structured;
  return parseDomCards(html, baseUrl, {
    card: "[data-testid='product-card'], .product-card",
    title: "h2, h3, .product-card__title",
    price: "[data-testid='price'], .price",
    link: "a",
    image: "img",
  }, "html");
}

const Adapter = createHttpStoreAdapter({
  storeId: "casas-bahia",
  method: "html",
  limitation: LIMITATION,
  homepage: "https://www.casasbahia.com.br/",
  buildSearchUrl: (q) => `https://www.casasbahia.com.br/busca/${encodeURIComponent(q)}`,
  parse,
});

export const casasBahiaAdapter = new Adapter();

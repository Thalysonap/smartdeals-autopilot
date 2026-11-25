import { parseDomCards } from "../shared/dom";
import { createHttpStoreAdapter } from "../shared/http-store";
import { parseJsonLdProducts } from "../shared/jsonld";

const LIMITATION = "Conexão recusada pelo servidor neste ambiente; conector implementado, mas não validado.";

function parse(html: string, baseUrl: string) {
  const structured = parseJsonLdProducts(html, (url) => new URL(url, baseUrl).toString(), "structured_data");
  if (structured.length) return structured;
  return parseDomCards(html, baseUrl, {
    card: "[data-testid='product-card'], .product-box",
    title: "h2, h3, .product-name",
    price: ".product-price, [data-testid='price'], .price",
    link: "a",
    image: "img",
  }, "html");
}

const Adapter = createHttpStoreAdapter({
  storeId: "pichau",
  method: "html",
  limitation: LIMITATION,
  homepage: "https://www.pichau.com.br/",
  buildSearchUrl: (q) => `https://www.pichau.com.br/busca?termo=${encodeURIComponent(q)}`,
  parse,
});

export const pichauAdapter = new Adapter();

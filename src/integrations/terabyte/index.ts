import { parseDomCards } from "../shared/dom";
import { createHttpStoreAdapter } from "../shared/http-store";
import { parseJsonLdProducts } from "../shared/jsonld";

const LIMITATION = "Consultas reais retornaram HTTP 403 neste ambiente; conector implementado, mas não validado.";

function parse(html: string, baseUrl: string) {
  const structured = parseJsonLdProducts(html, (url) => new URL(url, baseUrl).toString(), "structured_data");
  if (structured.length) return structured;
  return parseDomCards(html, baseUrl, {
    card: ".product__name, .product-item",
    title: ".product__name, h3, h2",
    price: ".product__price, .price, .product-item__price",
    link: "a",
    image: "img",
  }, "html");
}

const Adapter = createHttpStoreAdapter({
  storeId: "terabyte",
  method: "html",
  limitation: LIMITATION,
  homepage: "https://www.terabyteshop.com.br/",
  buildSearchUrl: (q) => `https://www.terabyteshop.com.br/busca?b=0&id=0&busca=${encodeURIComponent(q)}`,
  parse,
});

export const terabyteAdapter = new Adapter();

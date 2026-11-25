import { parseDomCards } from "../shared/dom";
import { createHttpStoreAdapter } from "../shared/http-store";
import { parseJsonLdProducts } from "../shared/jsonld";

const LIMITATION = "Busca pública retornou HTTP 503 (página de erro) neste ambiente; conector implementado, mas não validado.";

function parse(html: string, baseUrl: string) {
  const structured = parseJsonLdProducts(html, (url) => new URL(url, baseUrl).toString(), "structured_data");
  if (structured.length) return structured;
  return parseDomCards(html, baseUrl, {
    card: "[data-component-type='s-search-result']",
    title: "h2 span, .a-size-medium",
    price: ".a-price .a-offscreen, .a-price-whole",
    link: "a.a-link-normal",
    image: "img.s-image",
  }, "html");
}

const Adapter = createHttpStoreAdapter({
  storeId: "amazon",
  method: "html",
  limitation: LIMITATION,
  homepage: "https://www.amazon.com.br/",
  buildSearchUrl: (q) => `https://www.amazon.com.br/s?k=${encodeURIComponent(q)}`,
  parse,
});

export const amazonAdapter = new Adapter();

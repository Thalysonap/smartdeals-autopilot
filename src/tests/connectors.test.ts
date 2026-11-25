import { describe, expect, it } from "vitest";
import { parseKabumSearchPage } from "../integrations/kabum/parser";
import { parseAliExpressSearchPage } from "../integrations/aliexpress/parser";
import { parseMercadoLivreSearch } from "../integrations/mercado-livre/parser";

const kabumFixture = `<html><script type="application/ld+json">[{"@context":"https://schema.org","@type":"Product","name":"Console Sony PlayStation 5 Slim 1TB com leitor de disco - CFI 2114B","image":"https://images.kabum.com.br/produtos/fotos/1050570/ps5.jpg","sku":"1050570","brand":{"@type":"Brand","name":"Sony"},"offers":{"@type":"Offer","url":"https://www.kabum.com.br/produto/1050570/console-ps5","priceCurrency":"BRL","price":4699,"availability":"https://schema.org/InStock"}}]</script></html>`;

const aliexpressFixture = `<html><script>window._dida_config_._init_data_= { data: {"itemList":{"content":[{"productId":"1005007515607443","title":{"displayTitle":"Console PlayStation 5 Slim 1TB"},"image":{"imgUrl":"//ae-pic-a1.aliexpress-media.com/kf/ps5.jpg"},"prices":{"salePrice":{"minPrice":2899.9},"originalPrice":{"minPrice":3199}}}]}}};</script></html>`;

describe("parsers de fontes reais", () => {
  it("extrai produtos do JSON-LD do KaBuM", () => {
    const candidates = parseKabumSearchPage(kabumFixture, "https://www.kabum.com.br/busca/ps5");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].price).toBe(4699);
    expect(candidates[0].availability).toBe("in_stock");
    expect(candidates[0].title).toContain("PlayStation");
  });

  it("extrai produtos dos dados embutidos do AliExpress", () => {
    const candidates = parseAliExpressSearchPage(aliexpressFixture);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].price).toBe(2899.9);
    expect(candidates[0].url).toContain("1005007515607443");
  });

  it("extrai resultados da API do Mercado Livre", () => {
    const candidates = parseMercadoLivreSearch({ results: [{ id: "MLB1", title: "PS5 Slim 1TB", permalink: "https://produto.mercadolivre.com.br/MLB1-ps5", thumbnail: "https://a.jpg", price: 3999, available_quantity: 2, condition: "new" }] });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].price).toBe(3999);
  });
});

describe.skipIf(process.env.RUN_LIVE_TESTS !== "1")("coleta real (RUN_LIVE_TESTS=1)", () => {
  it("KaBuM retorna candidatos reais", async () => {
    const { searchKabum } = await import("../integrations/kabum/search");
    const candidates = await searchKabum("playstation 5 slim 1tb");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((item) => item.price > 0)).toBe(true);
  }, 60000);

  it("AliExpress retorna candidatos reais", async () => {
    const { searchAliExpress } = await import("../integrations/aliexpress/search");
    const candidates = await searchAliExpress("playstation 5 slim");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((item) => item.price > 0)).toBe(true);
  }, 60000);
});

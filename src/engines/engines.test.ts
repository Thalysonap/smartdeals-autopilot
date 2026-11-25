import { describe, expect, it } from "vitest";
import { extractSpecs, normalizeText, parseBRLPrice, toCandidate } from "../engines/normalization";
import { matchCandidate } from "../engines/matching";
import type { MonitoredProduct } from "../lib/types";

function monitored(name: string, overrides: Partial<MonitoredProduct> = {}): MonitoredProduct {
  const timestamp = new Date().toISOString();
  return {
    id: "m1", user_id: "u1", name, brand: null, model: null, version: null, capacity: null,
    category: null, attributes: {}, status: "active", interval_minutes: 240,
    created_at: timestamp, updated_at: timestamp, last_run_at: null, next_run_at: null, ...overrides,
  };
}

function candidate(title: string) {
  const result = toCandidate({ externalId: "1", title, url: "https://loja.test/p/1", price: "1.899,90", source: "html" });
  if (!result) throw new Error("candidate inválido");
  return result;
}

describe("normalização", () => {
  it("converte preços brasileiros com vírgula e pontos de milhar", () => {
    expect(parseBRLPrice("R$ 1.899,90")).toBe(1899.9);
    expect(parseBRLPrice("R$ 48,08")).toBe(48.08);
    expect(parseBRLPrice(1299.5)).toBe(1299.5);
    expect(parseBRLPrice("indisponível")).toBeNull();
  });

  it("extrai edição, capacidade e tipo de memória", () => {
    const specs = extractSpecs("PlayStation 5 Slim 1TB com leitor de disco, CFI-2114B");
    expect(specs.capacity).toBe("1tb");
    expect(specs.edition).toBe("disc");
    expect(specs.form_factor).toBe("slim");
    expect(specs.model).toContain("2114b");
    expect(normalizeText("Edição Digital")).toBe("edicao digital");
    expect(extractSpecs("Memória DDR5 16GB").memory).toBe("ddr5");
  });
});

describe("correspondência de produtos", () => {
  it("considera nomes diferentes com mesmo modelo como provável/exata", () => {
    const result = matchCandidate(candidate("Console Sony PlayStation 5 Slim 1TB com leitor CFI-2114B"), monitored("PlayStation 5 Slim 1TB com leitor de disco CFI-2114B"));
    expect(["exact", "probable"]).toContain(result.classification);
  });

  it("rejeita versão digital versus com leitor", () => {
    const result = matchCandidate(candidate("PS5 Slim Edição Digital 1TB"), monitored("PS5 Slim 1TB com leitor de disco"));
    expect(result.classification).toBe("incompatible");
    expect(result.reasons.join(" ")).toMatch(/Edição/);
  });

  it("rejeita DDR4 versus DDR5 e capacidades diferentes", () => {
    expect(matchCandidate(candidate("Memória DDR4 16GB"), monitored("Memória DDR5 16GB")).classification).toBe("incompatible");
    expect(matchCandidate(candidate("iPhone 15 128GB"), monitored("iPhone 15 256GB")).classification).toBe("incompatible");
  });

  it("rejeita usado quando o monitoramento exige novo", () => {
    const offered = candidate("PlayStation 5 Slim 1TB com leitor usado");
    expect(matchCandidate(offered, monitored("PlayStation 5 Slim 1TB com leitor", { attributes: { condition: "new" } })).classification).toBe("incompatible");
  });
});

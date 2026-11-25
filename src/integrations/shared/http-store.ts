import { BaseStoreAdapter } from "../types/store-adapter";
import { fetchPublicPage } from "../http";
import type { AdapterMethod, Capabilities, ProductCandidate } from "../../lib/types";

export interface HttpStoreConfig {
  storeId: string;
  method: AdapterMethod;
  limitation: string;
  homepage: string;
  buildSearchUrl: (query: string) => string;
  parse: (html: string, baseUrl: string) => ProductCandidate[];
  capabilities?: Partial<Capabilities>;
}

export function createHttpStoreAdapter(config: HttpStoreConfig) {
  return class HttpStoreAdapter extends BaseStoreAdapter {
    readonly storeId = config.storeId;
    readonly method = config.method;
    readonly limitation = config.limitation;
    readonly capabilities: Capabilities = { search: true, details: false, offers: true, health: true, ...config.capabilities };

    constructor() { super(config.homepage); }

    async searchProducts(query: string, signal?: AbortSignal): Promise<ProductCandidate[]> {
      const result = await fetchPublicPage(config.buildSearchUrl(query), {
        storeId: config.storeId, method: config.method, operation: "search", signal,
      });
      const candidates = config.parse(result.text, result.finalUrl);
      await result.reportItems(candidates.length);
      return candidates;
    }
  };
}

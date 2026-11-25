import { BaseStoreAdapter } from "../types/store-adapter";
import type { Capabilities, ProductCandidate } from "../../lib/types";
import { getAliExpressProduct } from "./product";
import { searchAliExpress } from "./search";

export class AliExpressAdapter extends BaseStoreAdapter {
  readonly storeId = "aliexpress";
  readonly method = "html" as const;
  readonly capabilities: Capabilities = { search: true, details: true, offers: true, health: true };

  constructor() { super("https://www.aliexpress.com/"); }

  searchProducts(query: string, signal?: AbortSignal): Promise<ProductCandidate[]> { return searchAliExpress(query, signal); }
  getProductDetails(url: string, signal?: AbortSignal): Promise<ProductCandidate | null> { return getAliExpressProduct(url, signal); }
}

export const aliExpressAdapter = new AliExpressAdapter();

import { BaseStoreAdapter } from "../types/store-adapter";
import type { Capabilities, ProductCandidate } from "../../lib/types";
import { getKabumProduct } from "./product";
import { searchKabum } from "./search";

export class KabumAdapter extends BaseStoreAdapter {
  readonly storeId = "kabum";
  readonly method = "structured_data" as const;
  readonly capabilities: Capabilities = { search: true, details: true, offers: true, health: true };

  constructor() { super("https://www.kabum.com.br/"); }

  searchProducts(query: string, signal?: AbortSignal): Promise<ProductCandidate[]> { return searchKabum(query, signal); }
  getProductDetails(url: string, signal?: AbortSignal): Promise<ProductCandidate | null> { return getKabumProduct(url, signal); }
}

export const kabumAdapter = new KabumAdapter();

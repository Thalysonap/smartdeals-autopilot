import { BaseStoreAdapter } from "../types/store-adapter";
import type { Capabilities, ProductCandidate } from "../../lib/types";
import { getMercadoLivreProduct } from "./product";
import { searchMercadoLivre } from "./search";

export const MERCADO_LIVRE_LIMITATION =
  "API pública sem credencial autorizada retornou 403 neste ambiente; páginas públicas exibem verificação de tráfego. Requer credencial própria.";

export class MercadoLivreAdapter extends BaseStoreAdapter {
  readonly storeId = "mercado-livre";
  readonly method = "api" as const;
  readonly capabilities: Capabilities = { search: true, details: true, offers: true, health: true };
  readonly limitation = MERCADO_LIVRE_LIMITATION;

  constructor() { super("https://www.mercadolivre.com.br/"); }

  searchProducts(query: string, signal?: AbortSignal): Promise<ProductCandidate[]> { return searchMercadoLivre(query, signal); }
  getProductDetails(url: string, signal?: AbortSignal): Promise<ProductCandidate | null> { return getMercadoLivreProduct(url, signal); }
}

export const mercadoLivreAdapter = new MercadoLivreAdapter();

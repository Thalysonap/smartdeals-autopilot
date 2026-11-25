import { fetchPublicPage } from "../http";
import { repository } from "../../lib/repository";
import type { AdapterHealth, AdapterMethod, Capabilities, StoreAdapter } from "../../lib/types";

export type { StoreAdapter, Capabilities, AdapterHealth, AdapterMethod } from "../../lib/types";

export abstract class BaseStoreAdapter implements StoreAdapter {
  abstract readonly storeId: string;
  abstract readonly method: AdapterMethod;
  readonly capabilities: Capabilities = { search: true, details: false, offers: true, health: true };
  readonly limitation: string | null = null;
  protected readonly homepage: string;

  constructor(homepage: string) { this.homepage = homepage; }

  abstract searchProducts(query: string, signal?: AbortSignal): Promise<import("../../lib/types").ProductCandidate[]>;

  async getProductDetails(_url: string, _signal?: AbortSignal): Promise<import("../../lib/types").ProductCandidate | null> {
    return null;
  }

  async healthCheck(signal?: AbortSignal): Promise<AdapterHealth> {
    const started = Date.now();
    try {
      const result = await fetchPublicPage(this.homepage, { storeId: this.storeId, method: this.method, operation: "details", signal });
      const integration = (await repository.listIntegrations()).find((row) => row.store_id === this.storeId);
      const operational = result.ok && Boolean(integration?.validated && integration.enabled);
      return {
        store_id: this.storeId,
        method: this.method,
        reachable: true,
        operational,
        detail: integration?.limitation ?? (operational ? "Consulta real validada" : "Fonte acessível, mas sem consulta real validada"),
        http_status: result.status,
        duration_ms: Date.now() - started,
        checked_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        store_id: this.storeId,
        method: this.method,
        reachable: false,
        operational: false,
        detail: error instanceof Error ? error.message.slice(0, 200) : "erro desconhecido",
        http_status: null,
        duration_ms: Date.now() - started,
        checked_at: new Date().toISOString(),
      };
    }
  }
}

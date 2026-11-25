import { repository } from "../lib/repository";
import type { StoreAdapter } from "../lib/types";
import { aliExpressAdapter } from "./aliexpress";
import { americanasAdapter } from "./americanas";
import { amazonAdapter } from "./amazon";
import { casasBahiaAdapter } from "./casas-bahia";
import { kabumAdapter } from "./kabum";
import { mercadoLivreAdapter } from "./mercado-livre";
import { magaluAdapter } from "./magalu";
import { pichauAdapter } from "./pichau";
import { shopeeAdapter } from "./shopee";
import { terabyteAdapter } from "./terabyte";

export const adapters: StoreAdapter[] = [
  kabumAdapter,
  mercadoLivreAdapter,
  terabyteAdapter,
  pichauAdapter,
  amazonAdapter,
  shopeeAdapter,
  magaluAdapter,
  aliExpressAdapter,
  americanasAdapter,
  casasBahiaAdapter,
];

const domains: Record<string, string> = {
  kabum: "www.kabum.com.br",
  "mercado-livre": "www.mercadolivre.com.br",
  terabyte: "www.terabyteshop.com.br",
  pichau: "www.pichau.com.br",
  amazon: "www.amazon.com.br",
  shopee: "shopee.com.br",
  magalu: "www.magazineluiza.com.br",
  aliexpress: "www.aliexpress.com",
  americanas: "www.americanas.com.br",
  "casas-bahia": "www.casasbahia.com.br",
};

const names: Record<string, string> = {
  kabum: "KaBuM!",
  "mercado-livre": "Mercado Livre",
  terabyte: "TerabyteShop",
  pichau: "Pichau",
  amazon: "Amazon",
  shopee: "Shopee",
  magalu: "Magazine Luiza",
  aliexpress: "AliExpress",
  americanas: "Americanas",
  "casas-bahia": "Casas Bahia",
};

export function getAdapter(storeId: string): StoreAdapter | undefined {
  return adapters.find((adapter) => adapter.storeId === storeId);
}

export async function ensureStoresSeeded(): Promise<void> {
  for (const adapter of adapters) {
    const domain = domains[adapter.storeId];
    await repository.upsertStore({
      id: adapter.storeId,
      name: names[adapter.storeId] ?? adapter.storeId,
      domain,
      homepage: `https://${domain}/`,
      reliability_base: 60,
    });
    const existing = (await repository.listIntegrations()).find((row) => row.store_id === adapter.storeId);
    await repository.upsertIntegration({
      store_id: adapter.storeId,
      method: adapter.method,
      enabled: existing?.enabled ?? true,
      validated: existing?.validated ?? false,
      capabilities: Object.entries(adapter.capabilities).filter(([, value]) => value).map(([key]) => key),
      limitation: adapter.limitation,
    });
  }
}

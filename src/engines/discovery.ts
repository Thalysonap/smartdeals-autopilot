import { repository, now } from "../lib/repository";
import type { DiscoveryRun, MatchClass, MonitoredProduct, ProductCandidate } from "../lib/types";
import { adapters, ensureStoresSeeded, getAdapter } from "../integrations/registry";
import { matchCandidate } from "./matching";
import { canonicalKey, normalizeText } from "./normalization";
import { updateCartForProduct } from "./cart-engine";
import { createNotification } from "./notifications";
import { evaluateReliability } from "./reliability";

export function buildQuery(monitored: MonitoredProduct): string {
  const parts = [monitored.name, monitored.brand, monitored.model, monitored.version, monitored.capacity].filter(Boolean);
  return normalizeText(parts.join(" ")).slice(0, 180) || monitored.name;
}

export interface DiscoveryOutcome {
  run: DiscoveryRun;
  offersFound: number;
  sourcesOk: number;
  sourcesFailed: number;
}

export async function discoverForProduct(monitoredId: string, options: { maxStores?: number } = {}): Promise<DiscoveryOutcome> {
  const monitored = await repository.getMonitored(monitoredId);
  if (!monitored) throw new Error("Produto monitorado não encontrado");
  await ensureStoresSeeded();
  const preferences = await repository.getPreferences(monitored.user_id);
  const integrations = await repository.listIntegrations();
  const enabled = adapters.filter((adapter) => {
    const integration = integrations.find((row) => row.store_id === adapter.storeId);
    return integration?.enabled !== false && adapter.capabilities.search;
  }).slice(0, options.maxStores ?? preferences.max_stores_per_scan);

  const run = await repository.createRun({
    user_id: monitored.user_id,
    monitored_product_id: monitored.id,
    status: "running",
    started_at: now(),
    finished_at: null,
    stores_consulted: 0,
    stores_failed: 0,
    offers_found: 0,
    error: null,
  });

  let offersFound = 0;
  let sourcesOk = 0;
  let sourcesFailed = 0;
  const query = buildQuery(monitored);
  const seen = new Set<string>();

  for (const adapter of enabled) {
    const started = Date.now();
    try {
      const candidates = await adapter.searchProducts(query, AbortSignal.timeout(25000));
      const unique = candidates.filter((candidate) => {
        const key = `${adapter.storeId}:${canonicalKey(candidate.url)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      for (const candidate of unique) await persistCandidate(candidate, monitored, adapter.storeId);
      offersFound += unique.length;
      sourcesOk += 1;
      if (unique.length > 0) await repository.markIntegrationValidated(adapter.storeId, true, null);
      await repository.insertResult({
        run_id: run.id, store_id: adapter.storeId,
        status: unique.length ? "ok" : "no_results", offers_found: unique.length,
        message: unique.length ? null : "Consulta concluída sem resultados compatíveis",
        duration_ms: Date.now() - started, created_at: now(),
      });
    } catch (error) {
      sourcesFailed += 1;
      const message = error instanceof Error ? error.message : "erro desconhecido";
      await repository.insertResult({
        run_id: run.id, store_id: adapter.storeId, status: /bloquead|captcha|403|429|robots/i.test(message) ? "blocked" : "error",
        offers_found: 0, message: message.slice(0, 300), duration_ms: Date.now() - started, created_at: now(),
      });
    }
  }

  const status = sourcesOk > 0 ? (sourcesFailed > 0 ? "partial" : "completed") : "failed";
  const finished = await repository.updateRun(run.id, {
    status, finished_at: now(), stores_consulted: enabled.length, stores_failed: sourcesFailed, offers_found: offersFound,
    error: sourcesOk === 0 ? "Nenhuma fonte respondeu com sucesso" : null,
  });
  await repository.updateMonitored(monitored.id, {
    last_run_at: now(),
    next_run_at: new Date(Date.now() + monitored.interval_minutes * 60_000).toISOString(),
  });
  if (offersFound > 0) {
    await createNotification({
      userId: monitored.user_id, type: "offer_found", title: "Novas ofertas encontradas",
      body: `${offersFound} oferta(s) encontrada(s) para ${monitored.name} em ${sourcesOk} fonte(s).`,
      offerId: null,
    });
  }
  await updateCartForProduct(monitored.id);
  return { run: finished, offersFound, sourcesOk, sourcesFailed };
}

export async function persistCandidate(candidate: ProductCandidate, monitored: MonitoredProduct, storeId: string): Promise<void> {
  const match = matchCandidate(candidate, monitored);
  const product = await repository.upsertProduct({
    canonical_name: candidate.title.slice(0, 240),
    brand: candidate.brand,
    model: candidate.model,
    gtin: candidate.gtin,
    sku: candidate.sku ?? candidate.external_id,
    category: monitored.category,
    attributes: candidate.attributes,
  });
  const variant = await repository.createVariant({
    product_id: product.id,
    name: candidate.title.slice(0, 240),
    capacity: typeof candidate.attributes.capacity === "string" ? candidate.attributes.capacity : monitored.capacity,
    color: typeof candidate.attributes.color === "string" ? candidate.attributes.color : null,
    condition: candidate.condition,
    attributes: candidate.attributes,
  });
  const timestamp = candidate.collected_at || now();
  const existingOffers = await repository.listOffers([
    { column: "store_id", op: "eq", value: storeId },
    { column: "url", op: "eq", value: candidate.url },
  ], 1);
  const existing = existingOffers[0];
  const shipping = candidate.shipping_price;
  const offer = await repository.upsertOffer({
    monitored_product_id: monitored.id,
    product_id: product.id,
    variant_id: variant.id,
    store_id: storeId,
    seller_name: candidate.seller_name,
    seller_rating: candidate.seller_rating,
    title: candidate.title,
    url: candidate.url,
    image_url: candidate.image_url,
    price: candidate.price,
    currency: "BRL",
    shipping_price: shipping,
    total_price: shipping === null ? null : Math.round((candidate.price + shipping) * 100) / 100,
    availability: candidate.availability,
    condition: candidate.condition,
    brand: candidate.brand,
    model: candidate.model,
    gtin: candidate.gtin,
    sku: candidate.sku,
    attributes: candidate.attributes,
    source: candidate.source,
    collected_at: timestamp,
    validated_at: now(),
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    match_class: match.classification as MatchClass,
    match_reasons: match.reasons,
  });
  if (!existing || existing.price !== offer.price || existing.availability !== offer.availability) {
    await repository.insertPriceHistory({
      offer_id: offer.id, price: offer.price, shipping_price: offer.shipping_price,
      availability: offer.availability, collected_at: offer.collected_at, source: offer.source,
    });
  }
  await repository.saveAssessment({
    offer_id: offer.id,
    ...evaluateReliability(offer, { storeReliabilityBase: 60 }),
  });
}

import { repository } from "./repository";
import { rankOffers } from "../engines/best-offer";
import type { CartItem, DiscoveryRun, Offer, OfferPriceHistory, ReliabilityAssessment, StoreIntegration } from "./types";

export interface OpportunityVM {
  offer: Offer;
  storeName: string;
  productName: string;
  category: string | null;
  reliability: ReliabilityAssessment | null;
  priceHistory: OfferPriceHistory[];
  stale: boolean;
  score: number;
  eligible: boolean;
}

export async function getOpportunities(userId: string): Promise<OpportunityVM[]> {
  const monitored = await repository.listMonitored(userId);
  const ids = monitored.map((item) => item.id);
  if (!ids.length) return [];
  const offers = (await repository.listOffers([], 2000)).filter((offer) => offer.monitored_product_id && ids.includes(offer.monitored_product_id));
  const stores = await repository.listStores();
  const storeReliability = Object.fromEntries(stores.map((store) => [store.id, store.reliability_base]));
  const storeNames = Object.fromEntries(stores.map((store) => [store.id, store.name]));
  const history = await Promise.all(offers.map((offer) => repository.listPriceHistory(offer.id, 60)));
  const historyByOffer = Object.fromEntries(offers.map((offer, index) => [offer.id, history[index]]));
  const assessments = await Promise.all(offers.map((offer) => repository.getAssessment(offer.id)));
  const assessmentByOffer = Object.fromEntries(offers.map((offer, index) => [offer.id, assessments[index]]));
  const evaluationsByProduct = new Map<string, ReturnType<typeof rankOffers>>();
  for (const product of monitored) {
    const productOffers = offers.filter((offer) => offer.monitored_product_id === product.id);
    if (productOffers.length) {
      evaluationsByProduct.set(product.id, rankOffers({ offers: productOffers, monitoredName: product.name, storeReliability, historyByOffer }));
    }
  }
  const scored = new Map<string, { score: number; eligible: boolean }>();
  for (const result of evaluationsByProduct.values()) {
    for (const evaluation of result.evaluations) scored.set(evaluation.offer.id, { score: evaluation.score, eligible: true });
    for (const rejected of result.rejected) scored.set(rejected.offerId, { score: 0, eligible: false });
  }
  return offers.map((offer) => ({
    offer,
    storeName: storeNames[offer.store_id] ?? offer.store_id,
    productName: monitored.find((item) => item.id === offer.monitored_product_id)?.name ?? "Produto",
    category: monitored.find((item) => item.id === offer.monitored_product_id)?.category ?? null,
    reliability: assessmentByOffer[offer.id] ?? null,
    priceHistory: historyByOffer[offer.id] ?? [],
    stale: Date.now() - new Date(offer.collected_at).getTime() > 24 * 3600_000,
    score: scored.get(offer.id)?.score ?? 0,
    eligible: scored.get(offer.id)?.eligible ?? false,
  })).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

export interface SourceStatusVM extends StoreIntegration {
  storeName: string;
  lastQuery: string | null;
  productsFound: number;
  failureRate: number;
  avgResponseMs: number;
  lastError: string | null;
  totalQueries: number;
}

export async function getSourceStatuses(): Promise<SourceStatusVM[]> {
  const integrations = await repository.listIntegrations();
  const stores = await repository.listStores();
  const logs = await repository.listLogs(undefined, 500);
  return integrations.map((integration) => {
    const own = logs.filter((log) => log.store_id === integration.store_id && log.operation !== "robots");
    const failures = own.filter((log) => log.status !== "ok").length;
    return {
      ...integration,
      enabled: Boolean(integration.enabled),
      validated: Boolean(integration.validated),
      storeName: stores.find((store) => store.id === integration.store_id)?.name ?? integration.store_id,
      lastQuery: own[0]?.created_at ?? null,
      productsFound: own.reduce((sum, log) => sum + log.items_found, 0),
      failureRate: own.length ? Math.round((failures / own.length) * 100) : 100,
      avgResponseMs: own.length ? Math.round(own.reduce((sum, log) => sum + log.duration_ms, 0) / own.length) : 0,
      lastError: own[0]?.error ?? null,
      totalQueries: own.length,
    };
  });
}

export interface DashboardVM {
  monitoredCount: number;
  cartCount: number;
  opportunityCount: number;
  eligibleCount: number;
  potentialSavings: number;
  lastScan: string | null;
  nextScan: string | null;
  activeSources: number;
  failedSources: number;
  agentState: "active" | "paused" | "scanning" | "idle";
  runs: DiscoveryRun[];
  cart: Array<CartItem & { productName: string; storeName: string; offerUrl: string }>;
  recentOffers: OpportunityVM[];
}

export async function getDashboard(userId: string): Promise<DashboardVM> {
  const monitored = await repository.listMonitored(userId);
  const cart = await repository.listCart(userId);
  const opportunities = await getOpportunities(userId);
  const stores = await repository.listStores();
  const runs = await repository.listRuns(userId, 8);
  const sources = await getSourceStatuses();
  const jobs = await repository.listJobs(30);
  const scanning = jobs.some((job) => job.status === "running");
  const active = monitored.filter((item) => item.status === "active");
  const cartDetailed = await Promise.all(cart.map(async (item) => {
    const offer = await repository.getOffer(item.offer_id);
    return {
      ...item,
      productName: monitored.find((m) => m.id === item.monitored_product_id)?.name ?? "Produto",
      storeName: stores.find((store) => store.id === item.store_id)?.name ?? item.store_id,
      offerUrl: offer?.url ?? "#",
    };
  }));
  const savings = cartDetailed.reduce((sum, item) => {
    const history = opportunities.find((o) => o.offer.id === item.offer_id)?.priceHistory ?? [];
    const max = history.length ? Math.max(...history.map((h) => h.price)) : item.price;
    return sum + Math.max(0, max - item.price);
  }, 0);
  const agentState = scanning ? "scanning" : active.length === 0 ? "idle" : monitored.every((m) => m.status === "paused") ? "paused" : "active";
  return {
    monitoredCount: monitored.length,
    cartCount: cart.length,
    opportunityCount: opportunities.length,
    eligibleCount: opportunities.filter((o) => o.eligible).length,
    potentialSavings: Math.round(savings * 100) / 100,
    lastScan: runs[0]?.finished_at ?? null,
    nextScan: active.length ? active.reduce((min, item) => !min || (item.next_run_at ?? "") < min ? item.next_run_at : min, null as string | null) : null,
    activeSources: sources.filter((s) => s.enabled && s.validated).length,
    failedSources: sources.filter((s) => s.failureRate > 50 && s.totalQueries > 0).length,
    agentState,
    runs,
    cart: cartDetailed,
    recentOffers: opportunities.slice(0, 6),
  };
}

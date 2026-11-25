export type ISODate = string;

export type Availability = "in_stock" | "out_of_stock" | "unknown";
export type Condition = "new" | "used" | "refurbished" | "unknown";
export type MatchClass = "exact" | "probable" | "uncertain" | "incompatible";
export type DataSource = "api" | "feed" | "html" | "structured_data" | "browser" | "search_engine";
export type AdapterMethod = DataSource;
export type JobStatus = "pending" | "running" | "completed" | "failed" | "dead";
export type JobType = "discovery" | "monitor" | "revalidate";

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: ISODate;
}

export interface UserPreferences {
  user_id: string;
  theme: "dark" | "light";
  language: "pt-BR";
  scan_interval_minutes: number;
  max_stores_per_scan: number;
  notifications_enabled: boolean;
  affiliate_disclosure: boolean;
  updated_at: ISODate;
}

export interface MonitoredProduct {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  capacity: string | null;
  category: string | null;
  attributes: Record<string, string | number | boolean>;
  status: "active" | "paused";
  interval_minutes: number;
  created_at: ISODate;
  updated_at: ISODate;
  last_run_at: ISODate | null;
  next_run_at: ISODate | null;
}

export interface Product {
  id: string;
  canonical_name: string;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  sku: string | null;
  category: string | null;
  attributes: Record<string, string | number | boolean>;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  capacity: string | null;
  color: string | null;
  condition: Condition;
  attributes: Record<string, string | number | boolean>;
  created_at: ISODate;
}

export interface Store {
  id: string;
  name: string;
  domain: string;
  homepage: string;
  reliability_base: number;
  created_at: ISODate;
}

export interface StoreIntegration {
  store_id: string;
  method: AdapterMethod;
  enabled: boolean;
  validated: boolean;
  capabilities: string[];
  limitation: string | null;
  updated_at: ISODate;
}

export interface Offer {
  id: string;
  monitored_product_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  store_id: string;
  seller_name: string | null;
  seller_rating: number | null;
  title: string;
  url: string;
  image_url: string | null;
  price: number;
  currency: "BRL";
  shipping_price: number | null;
  total_price: number | null;
  availability: Availability;
  condition: Condition;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  sku: string | null;
  attributes: Record<string, string | number | boolean>;
  source: DataSource;
  collected_at: ISODate;
  validated_at: ISODate | null;
  expires_at: ISODate | null;
  match_class: MatchClass | null;
  match_reasons: string[];
  created_at: ISODate;
  updated_at: ISODate;
}

export interface OfferPriceHistory {
  id: string;
  offer_id: string;
  price: number;
  shipping_price: number | null;
  availability: Availability;
  collected_at: ISODate;
  source: DataSource;
}

export interface DiscoveryRun {
  id: string;
  user_id: string;
  monitored_product_id: string | null;
  status: "running" | "completed" | "failed" | "partial";
  started_at: ISODate;
  finished_at: ISODate | null;
  stores_consulted: number;
  stores_failed: number;
  offers_found: number;
  error: string | null;
}

export interface DiscoveryResult {
  id: string;
  run_id: string;
  store_id: string;
  status: "ok" | "blocked" | "error" | "no_results";
  offers_found: number;
  message: string | null;
  duration_ms: number;
  created_at: ISODate;
}

export interface CartItem {
  id: string;
  user_id: string;
  monitored_product_id: string;
  offer_id: string;
  price: number;
  shipping_price: number | null;
  total_price: number | null;
  store_id: string;
  reason: string;
  score: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface CartHistory {
  id: string;
  cart_item_id: string | null;
  user_id: string;
  monitored_product_id: string;
  offer_id: string;
  action: "added" | "replaced" | "price_updated" | "removed";
  previous_offer_id: string | null;
  price: number;
  total_price: number | null;
  reason: string;
  created_at: ISODate;
}

export interface ReliabilityAssessment {
  id: string;
  offer_id: string;
  score: number | null;
  status: "verified" | "unverified";
  criteria: Array<{ key: string; label: string; impact: number; detail: string }>;
  created_at: ISODate;
}

export interface BackgroundJob {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  run_at: ISODate;
  locked_at: ISODate | null;
  locked_by: string | null;
  last_error: string | null;
  created_at: ISODate;
  finished_at: ISODate | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "price_drop" | "winner_changed" | "store_error" | "offer_found";
  title: string;
  body: string;
  offer_id: string | null;
  read_at: ISODate | null;
  created_at: ISODate;
}

export interface IntegrationLog {
  id: string;
  store_id: string;
  method: AdapterMethod;
  operation: "search" | "details" | "health" | "robots";
  status: "ok" | "blocked" | "error";
  http_status: number | null;
  duration_ms: number;
  items_found: number;
  error: string | null;
  created_at: ISODate;
}

export interface ProductCandidate {
  external_id: string;
  title: string;
  url: string;
  image_url: string | null;
  price: number;
  currency: "BRL";
  shipping_price: number | null;
  availability: Availability;
  condition: Condition;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  sku: string | null;
  seller_name: string | null;
  seller_rating: number | null;
  attributes: Record<string, string | number | boolean>;
  source: DataSource;
  collected_at: ISODate;
}

export interface AdapterHealth {
  store_id: string;
  method: AdapterMethod;
  reachable: boolean;
  operational: boolean;
  detail: string;
  http_status: number | null;
  duration_ms: number;
  checked_at: ISODate;
}

export interface Capabilities {
  search: boolean;
  details: boolean;
  offers: boolean;
  health: boolean;
}

export interface StoreAdapter {
  readonly storeId: string;
  readonly method: AdapterMethod;
  readonly capabilities: Capabilities;
  readonly limitation: string | null;
  searchProducts(query: string, signal?: AbortSignal): Promise<ProductCandidate[]>;
  getProductDetails?(url: string, signal?: AbortSignal): Promise<ProductCandidate | null>;
  healthCheck(signal?: AbortSignal): Promise<AdapterHealth>;
}

export interface OfferEvaluation {
  offer: Offer;
  match: { classification: MatchClass; score: number; reasons: string[] };
  validation: { valid: boolean; reasons: string[] };
  reliability: { score: number | null; status: "verified" | "unverified"; criteria: ReliabilityAssessment["criteria"] };
  score: number;
  rankingReasons: string[];
}

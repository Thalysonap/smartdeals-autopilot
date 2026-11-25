export const sqliteSchema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark',
  language TEXT NOT NULL DEFAULT 'pt-BR',
  scan_interval_minutes INTEGER NOT NULL DEFAULT 240,
  max_stores_per_scan INTEGER NOT NULL DEFAULT 8,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  affiliate_disclosure INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS monitored_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  version TEXT,
  capacity TEXT,
  category TEXT,
  attributes TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  interval_minutes INTEGER NOT NULL DEFAULT 240,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_run_at TEXT,
  next_run_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_monitored_user_status ON monitored_products(user_id, status);
CREATE INDEX IF NOT EXISTS idx_monitored_next_run ON monitored_products(next_run_at);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  gtin TEXT,
  sku TEXT,
  category TEXT,
  attributes TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_identity ON products(coalesce(gtin, ''), coalesce(sku, ''), lower(canonical_name));
CREATE INDEX IF NOT EXISTS idx_products_model ON products(lower(coalesce(model, '')));
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity TEXT,
  color TEXT,
  condition TEXT NOT NULL DEFAULT 'unknown',
  attributes TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  homepage TEXT NOT NULL,
  reliability_base INTEGER NOT NULL DEFAULT 65,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS store_integrations (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  validated INTEGER NOT NULL DEFAULT 0,
  capabilities TEXT NOT NULL DEFAULT '[]',
  limitation TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  monitored_product_id TEXT REFERENCES monitored_products(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  seller_name TEXT,
  seller_rating REAL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  shipping_price REAL,
  total_price REAL,
  availability TEXT NOT NULL DEFAULT 'unknown',
  condition TEXT NOT NULL DEFAULT 'unknown',
  brand TEXT,
  model TEXT,
  gtin TEXT,
  sku TEXT,
  attributes TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  validated_at TEXT,
  expires_at TEXT,
  match_class TEXT,
  match_reasons TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_dedupe ON offers(store_id, url, seller_name);
CREATE INDEX IF NOT EXISTS idx_offers_monitored ON offers(monitored_product_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_store ON offers(store_id);
CREATE TABLE IF NOT EXISTS offer_price_history (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  shipping_price REAL,
  availability TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  source TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_history_offer ON offer_price_history(offer_id, collected_at);
CREATE TABLE IF NOT EXISTS discovery_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monitored_product_id TEXT REFERENCES monitored_products(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  stores_consulted INTEGER NOT NULL DEFAULT 0,
  stores_failed INTEGER NOT NULL DEFAULT 0,
  offers_found INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_user ON discovery_runs(user_id, started_at DESC);
CREATE TABLE IF NOT EXISTS discovery_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  status TEXT NOT NULL,
  offers_found INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monitored_product_id TEXT NOT NULL UNIQUE REFERENCES monitored_products(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL REFERENCES offers(id),
  price REAL NOT NULL,
  shipping_price REAL,
  total_price REAL,
  store_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  score REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cart_history (
  id TEXT PRIMARY KEY,
  cart_item_id TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monitored_product_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_offer_id TEXT,
  price REAL NOT NULL,
  total_price REAL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cart_history_user ON cart_history(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS reliability_assessments (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  score REAL,
  status TEXT NOT NULL,
  criteria TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS background_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_at TEXT NOT NULL,
  locked_at TEXT,
  locked_by TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_claim ON background_jobs(status, run_at);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  offer_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS integration_logs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  method TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  http_status INTEGER,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  items_found INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_integration_logs_store ON integration_logs(store_id, created_at DESC);
`;

export const sqliteTables = [
  "users", "auth_sessions", "password_resets", "user_preferences", "monitored_products", "products",
  "product_variants", "stores", "store_integrations", "offers", "offer_price_history",
  "discovery_runs", "discovery_results", "cart_items", "cart_history",
  "reliability_assessments", "background_jobs", "notifications", "integration_logs",
] as const;

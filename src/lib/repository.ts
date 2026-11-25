import { randomUUID } from "node:crypto";
import { getBackend, newId, type Backend, type Filter, type Row } from "./db/backend";
import type {
  BackgroundJob, CartHistory, CartItem, DiscoveryResult, DiscoveryRun, IntegrationLog,
  MonitoredProduct, Notification, Offer, OfferPriceHistory, Product, ProductVariant,
  ReliabilityAssessment, Store, StoreIntegration, User, UserPreferences, ISODate,
} from "./types";

export function now(): ISODate { return new Date().toISOString(); }

export class Repository {
  constructor(private readonly db: Backend = getBackend()) {}

  async createUser(input: { email: string; name: string; passwordHash: string | null }): Promise<User> {
    const user: User = { id: newId(), email: input.email.toLowerCase(), name: input.name, created_at: now() };
    await this.db.insert("users", { ...user, password_hash: input.passwordHash });
    await this.db.insert("user_preferences", {
      user_id: user.id, theme: "dark", language: "pt-BR", scan_interval_minutes: 240,
      max_stores_per_scan: 8, notifications_enabled: 1, affiliate_disclosure: 1, updated_at: now(),
    });
    return user;
  }

  async getUserByEmail(email: string): Promise<(User & { password_hash: string | null }) | null> {
    const rows = await this.db.select<User & { password_hash: string | null }>("users", [{ column: "email", op: "eq", value: email.toLowerCase() }], { limit: 1 });
    return rows[0] ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = await this.db.select<User>("users", [{ column: "id", op: "eq", value: id }], { limit: 1 });
    return rows[0] ?? null;
  }

  async createSession(userId: string, tokenHash: string, expiresAt: ISODate): Promise<void> {
    await this.db.insert("auth_sessions", { token_hash: tokenHash, user_id: userId, expires_at: expiresAt, created_at: now() });
  }

  async getSession(tokenHash: string): Promise<{ user_id: string; expires_at: ISODate } | null> {
    const rows = await this.db.select<{ user_id: string; expires_at: ISODate }>("auth_sessions", [{ column: "token_hash", op: "eq", value: tokenHash }], { limit: 1 });
    return rows[0] ?? null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.db.removeWhere("auth_sessions", [{ column: "token_hash", op: "eq", value: tokenHash }]);
  }

  async createPasswordReset(userId: string, tokenHash: string, expiresAt: ISODate): Promise<void> {
    await this.db.insert("password_resets", { token_hash: tokenHash, user_id: userId, expires_at: expiresAt, created_at: now() });
  }

  async consumePasswordReset(tokenHash: string): Promise<string | null> {
    const rows = await this.db.select<{ user_id: string; expires_at: ISODate }>("password_resets", [
      { column: "token_hash", op: "eq", value: tokenHash },
      { column: "expires_at", op: "gte", value: now() },
    ], { limit: 1 });
    if (!rows[0]) return null;
    await this.db.removeWhere("password_resets", [{ column: "token_hash", op: "eq", value: tokenHash }]);
    return rows[0].user_id;
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.update("users", userId, { password_hash: passwordHash });
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const rows = await this.db.select<UserPreferences>("user_preferences", [{ column: "user_id", op: "eq", value: userId }], { limit: 1 });
    return rows[0] ?? {
      user_id: userId, theme: "dark", language: "pt-BR", scan_interval_minutes: 240,
      max_stores_per_scan: 8, notifications_enabled: true, affiliate_disclosure: true, updated_at: now(),
    };
  }

  async savePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
    await this.db.upsert("user_preferences", { user_id: userId, ...patch, updated_at: now() }, ["user_id"]);
    return this.getPreferences(userId);
  }

  async listMonitored(userId: string): Promise<MonitoredProduct[]> {
    return this.db.select<MonitoredProduct>("monitored_products", [{ column: "user_id", op: "eq", value: userId }], { orderBy: [{ column: "created_at", ascending: false }] });
  }

  async getMonitored(id: string, userId?: string): Promise<MonitoredProduct | null> {
    const filters: Filter[] = [{ column: "id", op: "eq", value: id }];
    if (userId) filters.push({ column: "user_id", op: "eq", value: userId });
    const rows = await this.db.select<MonitoredProduct>("monitored_products", filters, { limit: 1 });
    return rows[0] ?? null;
  }

  async createMonitored(input: Omit<MonitoredProduct, "id" | "created_at" | "updated_at" | "last_run_at" | "next_run_at">): Promise<MonitoredProduct> {
    const timestamp = now();
    const row: MonitoredProduct = { ...input, id: newId(), created_at: timestamp, updated_at: timestamp, last_run_at: null, next_run_at: timestamp };
    await this.db.insert("monitored_products", row);
    return row;
  }

  async updateMonitored(id: string, patch: Partial<MonitoredProduct>): Promise<MonitoredProduct> {
    return this.db.update<MonitoredProduct>("monitored_products", id, { ...patch, updated_at: now() });
  }

  async deleteMonitored(id: string): Promise<void> { await this.db.remove("monitored_products", id); }

  async dueMonitored(limit = 20): Promise<MonitoredProduct[]> {
    return this.db.select<MonitoredProduct>("monitored_products", [
      { column: "status", op: "eq", value: "active" },
      { column: "next_run_at", op: "lte", value: now() },
    ], { orderBy: [{ column: "next_run_at", ascending: true }], limit });
  }

  async upsertProduct(input: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
    const identityFilter = (column: string, value: string | null): Filter =>
      ({ column, op: value === null ? "is" : "eq", value });
    const existing = await this.db.select<Product>("products", [
      identityFilter("gtin", input.gtin),
      identityFilter("sku", input.sku),
      identityFilter("canonical_name", input.canonical_name),
    ], { limit: 1 });
    if (existing[0]) {
      return this.db.update<Product>("products", existing[0].id, { ...input, updated_at: now() });
    }
    const timestamp = now();
    const product: Product = { ...input, id: newId(), created_at: timestamp, updated_at: timestamp };
    await this.db.insert("products", product);
    return product;
  }

  async createVariant(input: Omit<ProductVariant, "id" | "created_at">): Promise<ProductVariant> {
    const row: ProductVariant = { ...input, id: newId(), created_at: now() };
    await this.db.insert("product_variants", row);
    return row;
  }

  async listStores(): Promise<Store[]> { return this.db.select<Store>("stores", [], { orderBy: [{ column: "name", ascending: true }] }); }
  async listIntegrations(): Promise<StoreIntegration[]> { return this.db.select<StoreIntegration>("store_integrations", []); }

  async upsertStore(store: Omit<Store, "created_at">): Promise<Store> {
    await this.db.upsert("stores", { ...store, created_at: now() }, ["id"]);
    return { ...store, created_at: now() };
  }

  async upsertIntegration(input: Omit<StoreIntegration, "updated_at">): Promise<StoreIntegration> {
    const row = { ...input, updated_at: now() };
    await this.db.upsert("store_integrations", row, ["store_id"]);
    return row;
  }

  async markIntegrationValidated(storeId: string, validated: boolean, limitation: string | null): Promise<void> {
    const existing = (await this.db.select<StoreIntegration>("store_integrations", [{ column: "store_id", op: "eq", value: storeId }], { limit: 1 }))[0];
    if (!existing) return;
    await this.db.upsert("store_integrations", {
      ...existing,
      validated: limitation ? false : validated,
      limitation,
      updated_at: now(),
    }, ["store_id"]);
  }

  async upsertOffer(input: Omit<Offer, "id" | "created_at" | "updated_at">): Promise<Offer> {
    const conflict = ["store_id", "url", "seller_name"];
    const existing = await this.db.select<Offer>("offers", conflict.map((column) => {
      const value = (input as unknown as Row)[column] ?? null;
      return { column, op: value === null ? "is" as const : "eq" as const, value };
    }), { limit: 1 });
    const timestamp = now();
    if (existing[0]) {
      return this.db.update<Offer>("offers", existing[0].id, { ...input, updated_at: timestamp });
    }
    const offer: Offer = { ...input, id: newId(), created_at: timestamp, updated_at: timestamp };
    await this.db.insert("offers", offer);
    return offer;
  }

  async getOffer(id: string): Promise<Offer | null> {
    const rows = await this.db.select<Offer>("offers", [{ column: "id", op: "eq", value: id }], { limit: 1 });
    return rows[0] ?? null;
  }

  async listOffers(filters: Filter[] = [], limit = 500): Promise<Offer[]> {
    return this.db.select<Offer>("offers", filters, { orderBy: [{ column: "updated_at", ascending: false }], limit });
  }

  async insertPriceHistory(input: Omit<OfferPriceHistory, "id">): Promise<void> {
    await this.db.insert("offer_price_history", { ...input, id: newId() });
  }

  async listPriceHistory(offerId: string, limit = 60): Promise<OfferPriceHistory[]> {
    return this.db.select<OfferPriceHistory>("offer_price_history", [{ column: "offer_id", op: "eq", value: offerId }], { orderBy: [{ column: "collected_at", ascending: true }], limit });
  }

  async createRun(input: Omit<DiscoveryRun, "id">): Promise<DiscoveryRun> {
    const row: DiscoveryRun = { ...input, id: newId() };
    await this.db.insert("discovery_runs", row);
    return row;
  }

  async updateRun(id: string, patch: Partial<DiscoveryRun>): Promise<DiscoveryRun> {
    return this.db.update<DiscoveryRun>("discovery_runs", id, patch);
  }

  async insertResult(input: Omit<DiscoveryResult, "id">): Promise<void> {
    await this.db.insert("discovery_results", { ...input, id: newId() });
  }

  async listResults(runId: string): Promise<DiscoveryResult[]> {
    return this.db.select<DiscoveryResult>("discovery_results", [{ column: "run_id", op: "eq", value: runId }]);
  }

  async listRuns(userId: string, limit = 30): Promise<DiscoveryRun[]> {
    return this.db.select<DiscoveryRun>("discovery_runs", [{ column: "user_id", op: "eq", value: userId }], { orderBy: [{ column: "started_at", ascending: false }], limit });
  }

  async getCartItem(userId: string, monitoredProductId: string): Promise<CartItem | null> {
    const rows = await this.db.select<CartItem>("cart_items", [
      { column: "user_id", op: "eq", value: userId },
      { column: "monitored_product_id", op: "eq", value: monitoredProductId },
    ], { limit: 1 });
    return rows[0] ?? null;
  }

  async listCart(userId: string): Promise<CartItem[]> {
    return this.db.select<CartItem>("cart_items", [{ column: "user_id", op: "eq", value: userId }], { orderBy: [{ column: "updated_at", ascending: false }] });
  }

  async saveCartItem(input: Omit<CartItem, "id" | "created_at" | "updated_at">, previous?: CartItem): Promise<CartItem> {
    const timestamp = now();
    if (previous) {
      return this.db.update<CartItem>("cart_items", previous.id, { ...input, updated_at: timestamp });
    }
    const row: CartItem = { ...input, id: newId(), created_at: timestamp, updated_at: timestamp };
    await this.db.insert("cart_items", row);
    return row;
  }

  async deleteCartItem(id: string): Promise<void> { await this.db.remove("cart_items", id); }

  async insertCartHistory(input: Omit<CartHistory, "id">): Promise<void> {
    await this.db.insert("cart_history", { ...input, id: newId() });
  }

  async listCartHistory(userId: string, limit = 100): Promise<CartHistory[]> {
    return this.db.select<CartHistory>("cart_history", [{ column: "user_id", op: "eq", value: userId }], { orderBy: [{ column: "created_at", ascending: false }], limit });
  }

  async saveAssessment(input: Omit<ReliabilityAssessment, "id" | "created_at">): Promise<ReliabilityAssessment> {
    const existing = await this.db.select<ReliabilityAssessment>("reliability_assessments", [{ column: "offer_id", op: "eq", value: input.offer_id }], { limit: 1 });
    if (existing[0]) {
      return this.db.update<ReliabilityAssessment>("reliability_assessments", existing[0].id, input);
    }
    const row: ReliabilityAssessment = { ...input, id: newId(), created_at: now() };
    await this.db.insert("reliability_assessments", row);
    return row;
  }

  async getAssessment(offerId: string): Promise<ReliabilityAssessment | null> {
    const rows = await this.db.select<ReliabilityAssessment>("reliability_assessments", [{ column: "offer_id", op: "eq", value: offerId }], { orderBy: [{ column: "created_at", ascending: false }], limit: 1 });
    return rows[0] ?? null;
  }

  async enqueue(type: BackgroundJob["type"], payload: Record<string, unknown>, runAt: ISODate = now(), maxAttempts = 3): Promise<BackgroundJob> {
    const job: BackgroundJob = {
      id: newId(), type, payload, status: "pending", attempts: 0, max_attempts: maxAttempts,
      run_at: runAt, locked_at: null, locked_by: null, last_error: null, created_at: now(), finished_at: null,
    };
    await this.db.insert("background_jobs", job);
    return job;
  }

  async claimJobs(workerId: string, limit = 5): Promise<BackgroundJob[]> {
    const jobs = await this.db.select<BackgroundJob>("background_jobs", [
      { column: "status", op: "eq", value: "pending" },
      { column: "run_at", op: "lte", value: now() },
    ], { orderBy: [{ column: "run_at", ascending: true }], limit });
    const claimed: BackgroundJob[] = [];
    for (const job of jobs) {
      try {
        const updated = await this.db.update<BackgroundJob>("background_jobs", job.id, { status: "running", locked_at: now(), locked_by: workerId, attempts: job.attempts + 1 });
        claimed.push(updated);
      } catch { /* outro worker ganhou a corrida */ }
    }
    return claimed;
  }

  async completeJob(id: string): Promise<void> {
    await this.db.update("background_jobs", id, { status: "completed", finished_at: now(), locked_at: null, locked_by: null });
  }

  async failJob(job: BackgroundJob, error: string): Promise<void> {
    const dead = job.attempts >= job.max_attempts;
    await this.db.update("background_jobs", job.id, {
      status: dead ? "dead" : "pending", last_error: error.slice(0, 500),
      run_at: new Date(Date.now() + Math.min(300_000, 30_000 * 2 ** job.attempts)).toISOString(),
      locked_at: null, locked_by: null, finished_at: dead ? now() : null,
    });
  }

  async listJobs(limit = 50): Promise<BackgroundJob[]> {
    return this.db.select<BackgroundJob>("background_jobs", [], { orderBy: [{ column: "created_at", ascending: false }], limit });
  }

  async createNotification(input: Omit<Notification, "id" | "created_at" | "read_at">): Promise<Notification> {
    const row: Notification = { ...input, id: newId(), read_at: null, created_at: now() };
    await this.db.insert("notifications", row);
    return row;
  }

  async listNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return this.db.select<Notification>("notifications", [{ column: "user_id", op: "eq", value: userId }], { orderBy: [{ column: "created_at", ascending: false }], limit });
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await this.db.update("notifications", id, { read_at: now(), user_id: userId });
  }

  async logIntegration(input: Omit<IntegrationLog, "id">): Promise<string> {
    const id = randomUUID();
    await this.db.insert("integration_logs", { ...input, id });
    return id;
  }

  async updateLogItems(id: string, itemsFound: number): Promise<void> {
    await this.db.update("integration_logs", id, { items_found: itemsFound });
  }

  async listLogs(storeId?: string, limit = 200): Promise<IntegrationLog[]> {
    return this.db.select<IntegrationLog>("integration_logs", storeId ? [{ column: "store_id", op: "eq", value: storeId }] : [], { orderBy: [{ column: "created_at", ascending: false }], limit });
  }
}

export const repository = new Repository();

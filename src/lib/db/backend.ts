import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sqliteSchema, sqliteTables } from "./sqlite-schema";

export type FilterOp = "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "is" | "like";
export interface Filter { column: string; op: FilterOp; value: unknown }
export interface SelectOptions {
  orderBy?: Array<{ column: string; ascending?: boolean }>;
  limit?: number;
}
export type Row = Record<string, unknown>;

export interface Backend {
  readonly kind: "sqlite" | "supabase";
  select<T>(table: string, filters?: Filter[], options?: SelectOptions): Promise<T[]>;
  insert<T>(table: string, row: object): Promise<T>;
  update<T>(table: string, id: string, patch: object): Promise<T>;
  upsert<T>(table: string, row: object, conflict: string[]): Promise<T>;
  remove(table: string, id: string): Promise<void>;
  removeWhere(table: string, filters: Filter[]): Promise<void>;
}

const jsonFields: Record<string, string[]> = {
  monitored_products: ["attributes"],
  products: ["attributes"],
  product_variants: ["attributes"],
  store_integrations: ["capabilities"],
  offers: ["attributes", "match_reasons"],
  discovery_runs: [],
  discovery_results: [],
  cart_items: [],
  cart_history: [],
  reliability_assessments: ["criteria"],
  background_jobs: ["payload"],
  notifications: [],
  integration_logs: [],
  users: [],
  auth_sessions: [],
  user_preferences: [],
  stores: [],
  offer_price_history: [],
};

const booleanFields: Record<string, string[]> = {
  user_preferences: ["notifications_enabled", "affiliate_disclosure"],
  store_integrations: ["enabled", "validated"],
};

const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
function assertTable(table: string): void {
  if (!(sqliteTables as readonly string[]).includes(table)) {
    throw new Error(`Tabela não permitida: ${table}`);
  }
}
function assertColumn(column: string): void {
  if (!SAFE_IDENTIFIER.test(column)) throw new Error(`Coluna inválida: ${column}`);
}

function fromDb(table: string, row: Row): Row {
  const out: Row = { ...row };
  for (const field of jsonFields[table] ?? []) {
    const value = out[field];
    if (typeof value === "string") {
      try { out[field] = JSON.parse(value); } catch { out[field] = Array.isArray(value) ? [] : {}; }
    }
  }
  for (const field of booleanFields[table] ?? []) {
    if (typeof out[field] === "number") out[field] = out[field] === 1;
  }
  return out;
}

function toDb(table: string, row: object): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if ((jsonFields[table] ?? []).includes(key) && value !== null && typeof value === "object") {
      out[key] = JSON.stringify(value);
    } else if ((booleanFields[table] ?? []).includes(key) && typeof value === "boolean") {
      out[key] = value ? 1 : 0;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export class SQLiteBackend implements Backend {
  readonly kind = "sqlite" as const;
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    const dir = path.dirname(filePath);
    mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    this.db.exec(sqliteSchema);
  }

  async select<T>(table: string, filters: Filter[] = [], options: SelectOptions = {}): Promise<T[]> {
    assertTable(table);
    const clauses: string[] = [];
    const values: unknown[] = [];
    for (const filter of filters) {
      assertColumn(filter.column);
      if (filter.op === "in") {
        const items = Array.isArray(filter.value) ? filter.value : [filter.value];
        if (items.length === 0) return [];
        clauses.push(`"${filter.column}" IN (${items.map(() => "?").join(",")})`);
        values.push(...items);
      } else if (filter.op === "is") {
        clauses.push(`"${filter.column}" IS ${filter.value === null ? "NULL" : "?"}`);
        if (filter.value !== null) values.push(filter.value);
      } else if (filter.op === "like") {
        clauses.push(`"${filter.column}" LIKE ?`);
        values.push(filter.value);
      } else {
        const op = { eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=" }[filter.op];
        clauses.push(`"${filter.column}" ${op} ?`);
        values.push(filter.value);
      }
    }
    let sql = `SELECT * FROM "${table}"`;
    if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
    if (options.orderBy?.length) {
      sql += ` ORDER BY ${options.orderBy.map((o) => {
        assertColumn(o.column);
        return `"${o.column}" ${o.ascending ? "ASC" : "DESC"}`;
      }).join(", ")}`;
    }
    if (options.limit) { sql += " LIMIT ?"; values.push(options.limit); }
    const rows = this.db.prepare(sql).all(...(values as never[])) as Row[];
    return rows.map((row) => fromDb(table, row) as T);
  }

  async insert<T>(table: string, row: object): Promise<T> {
    assertTable(table);
    const data = toDb(table, row);
    const cols = Object.keys(data);
    const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`;
    this.db.prepare(sql).run(...cols.map((c) => data[c] as never));
    return row as T;
  }

  async update<T>(table: string, id: string, patch: object): Promise<T> {
    assertTable(table);
    const data = toDb(table, patch);
    const cols = Object.keys(data);
    if (!cols.length) throw new Error("Patch vazio");
    const sql = `UPDATE "${table}" SET ${cols.map((c) => `"${c}" = ?`).join(",")} WHERE id = ?`;
    this.db.prepare(sql).run(...cols.map((c) => data[c] as never), id);
    return { ...data, id } as T;
  }

  async upsert<T>(table: string, row: object, conflict: string[]): Promise<T> {
    assertTable(table);
    conflict.forEach(assertColumn);
    const data = toDb(table, row);
    const cols = Object.keys(data);
    const updates = cols.filter((c) => !conflict.includes(c));
    const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")}) ` +
      `ON CONFLICT(${conflict.map((c) => `"${c}"`).join(",")}) DO UPDATE SET ` +
      (updates.length ? updates.map((c) => `"${c}" = excluded."${c}"`).join(",") : "id = excluded.id");
    this.db.prepare(sql).run(...cols.map((c) => data[c] as never));
    return row as T;
  }

  async remove(table: string, id: string): Promise<void> {
    assertTable(table);
    this.db.prepare(`DELETE FROM "${table}" WHERE id = ?`).run(id);
  }

  async removeWhere(table: string, filters: Filter[]): Promise<void> {
    assertTable(table);
    const clauses: string[] = [];
    const values: unknown[] = [];
    for (const f of filters) {
      assertColumn(f.column);
      clauses.push(`"${f.column}" = ?`);
      values.push(f.value);
    }
    if (!clauses.length) throw new Error("removeWhere exige filtros");
    this.db.prepare(`DELETE FROM "${table}" WHERE ${clauses.join(" AND ")}`).run(...(values as never[]));
  }
}

function supabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class SupabaseBackend implements Backend {
  readonly kind = "supabase" as const;
  constructor(private readonly client: SupabaseClient = supabaseClient()) {}

  async select<T>(table: string, filters: Filter[] = [], options: SelectOptions = {}): Promise<T[]> {
    let query = this.client.from(table).select("*");
    for (const f of filters) {
      switch (f.op) {
        case "eq": query = query.eq(f.column, f.value as never); break;
        case "neq": query = query.neq(f.column, f.value as never); break;
        case "in": query = query.in(f.column, (Array.isArray(f.value) ? f.value : [f.value]) as never[]); break;
        case "gt": query = query.gt(f.column, f.value as never); break;
        case "gte": query = query.gte(f.column, f.value as never); break;
        case "lt": query = query.lt(f.column, f.value as never); break;
        case "lte": query = query.lte(f.column, f.value as never); break;
        case "is": query = query.is(f.column, f.value as never); break;
        case "like": query = query.ilike(f.column, `%${String(f.value)}%`); break;
      }
    }
    for (const o of options.orderBy ?? []) query = query.order(o.column, { ascending: o.ascending ?? false });
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((row) => fromDb(table, row) as T);
  }

  async insert<T>(table: string, row: object): Promise<T> {
    const { data, error } = await this.client.from(table).insert(toDb(table, row)).select().single();
    if (error) throw new Error(error.message);
    return fromDb(table, data as Row) as T;
  }

  async update<T>(table: string, id: string, patch: object): Promise<T> {
    const { data, error } = await this.client.from(table).update(toDb(table, patch)).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return fromDb(table, data as Row) as T;
  }

  async upsert<T>(table: string, row: object, conflict: string[]): Promise<T> {
    const { data, error } = await this.client.from(table).upsert(toDb(table, row), { onConflict: conflict.join(",") }).select().single();
    if (error) throw new Error(error.message);
    return fromDb(table, data as Row) as T;
  }

  async remove(table: string, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async removeWhere(table: string, filters: Filter[]): Promise<void> {
    let query = this.client.from(table).delete();
    for (const f of filters) query = query.eq(f.column, f.value as never);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}

let singleton: Backend | null = null;
export function getBackend(): Backend {
  if (singleton) return singleton;
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (supabaseConfigured) {
    singleton = new SupabaseBackend();
  } else {
    const file = process.env.LOCAL_DB_PATH || path.join(process.cwd(), "data", "smartdeals.db");
    singleton = new SQLiteBackend(file);
  }
  return singleton;
}

export function newId(): string {
  return randomUUID();
}

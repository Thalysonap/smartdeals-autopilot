import { isIP } from "node:net";
import { repository } from "../lib/repository";
import type { AdapterMethod } from "../lib/types";

export class SourceBlockedError extends Error {
  constructor(message: string, readonly httpStatus: number | null = null) {
    super(message);
    this.name = "SourceBlockedError";
  }
}

const robotsCache = new Map<string, { text: string; fetchedAt: number }>();
const lastRequest = new Map<string, number>();
const minIntervalMs = Number(process.env.STORE_REQUEST_INTERVAL_MS ?? 1500);

const BLOCKED_HOSTS = /(^|\.)(localhost|local|internal|test)$/i;

export function assertPublicUrl(rawUrl: string): URL {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("URL inválida"); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Protocolo não permitido");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || BLOCKED_HOSTS.test(host)) throw new Error("Host privado não permitido");
  if (isIP(host) && (host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || host.startsWith("::1") || host.startsWith("fc") || host.startsWith("fd"))) {
    throw new Error("Endereço IP privado não permitido");
  }
  const private172 = host.match(/^172\.(\d+)\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) throw new Error("Endereço IP privado não permitido");
  return url;
}

function wildcardMatch(pattern: string, path: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}`).test(path);
}

function robotsAllows(robots: string, rawUrl: string): boolean {
  const url = new URL(rawUrl);
  const path = `${url.pathname}${url.search}`;
  const groups: Array<{ agents: string[]; rules: Array<{ type: "allow" | "disallow"; value: string }> }> = [];
  let current: (typeof groups)[number] | null = null;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ type: key, value });
    }
  }
  const applicable = groups.filter((g) => g.agents.includes("*"));
  let allowed = true;
  let longest = -1;
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (!wildcardMatch(rule.value, path)) continue;
      if (rule.value.length > longest) {
        longest = rule.value.length;
        allowed = rule.type === "allow";
      } else if (rule.value.length === longest && rule.type === "allow") {
        allowed = true;
      }
    }
  }
  return allowed;
}

async function robotsFor(origin: string, signal?: AbortSignal): Promise<string> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < 12 * 3600_000) return cached.text;
  const started = Date.now();
  try {
    const response = await fetch(`${origin}/robots.txt`, { signal: signal ?? AbortSignal.timeout(8000), headers: { "user-agent": "SmartDealsAutopilot/0.1" } });
    const text = response.ok ? await response.text() : "";
    robotsCache.set(origin, { text, fetchedAt: Date.now() });
    await repository.logIntegration({ store_id: "robots", method: "html", operation: "robots", status: response.ok ? "ok" : "error", http_status: response.status, duration_ms: Date.now() - started, items_found: 0, error: response.ok ? null : `HTTP ${response.status}`, created_at: new Date().toISOString() });
    return text;
  } catch {
    robotsCache.set(origin, { text: "", fetchedAt: Date.now() });
    return "";
  }
}

export interface FetchResult {
  ok: boolean;
  status: number;
  text: string;
  finalUrl: string;
  durationMs: number;
  reportItems: (count: number) => Promise<void>;
}

export async function fetchPublicPage(
  rawUrl: string,
  options: { storeId: string; method: AdapterMethod; operation: "search" | "details"; signal?: AbortSignal; timeoutMs?: number },
): Promise<FetchResult> {
  const url = assertPublicUrl(rawUrl);
  const started = Date.now();
  const key = url.hostname;
  const wait = Math.max(0, minIntervalMs - (Date.now() - (lastRequest.get(key) ?? 0)));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequest.set(key, Date.now());

  const robots = await robotsFor(url.origin, options.signal);
  if (robots && !robotsAllows(robots, rawUrl)) {
    await repository.logIntegration({ store_id: options.storeId, method: options.method, operation: options.operation, status: "blocked", http_status: null, duration_ms: Date.now() - started, items_found: 0, error: "robots.txt não permite este caminho", created_at: new Date().toISOString() });
    throw new SourceBlockedError("robots.txt não permite a coleta deste caminho");
  }

  const timeout = AbortSignal.timeout(options.timeoutMs ?? 15000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(rawUrl, {
      redirect: "follow",
      signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SmartDealsAutopilot/0.1; +https://example.invalid/smartdeals)",
        "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro desconhecido";
    await repository.logIntegration({ store_id: options.storeId, method: options.method, operation: options.operation, status: "error", http_status: null, duration_ms: Date.now() - started, items_found: 0, error: message.slice(0, 300), created_at: new Date().toISOString() });
    throw error;
  }

  const text = await response.text();
  const blockedStatus = [401, 403, 429, 503].includes(response.status);
  const challenge = /suspicious[ -]traffic|verifique que voc[eê] n[aã]o [eé] um rob[oô]|please enable javascript|access denied|captcha verification/i.test(text.slice(0, 20000));
  const status = blockedStatus || challenge ? "blocked" : response.ok ? "ok" : "error";
  const error = status === "ok" ? null : challenge ? "Página de verificação/bloqueio detectada" : `HTTP ${response.status}`;
  const logId = await repository.logIntegration({ store_id: options.storeId, method: options.method, operation: options.operation, status, http_status: response.status, duration_ms: Date.now() - started, items_found: 0, error, created_at: new Date().toISOString() });
  if (status === "blocked") throw new SourceBlockedError(error ?? "Fonte bloqueada", response.status);
  if (status === "error") throw new Error(error ?? "Falha na consulta");
  return {
    ok: true, status: response.status, text, finalUrl: response.url, durationMs: Date.now() - started,
    reportItems: async (count) => { await repository.updateLogItems(logId, count); },
  };
}

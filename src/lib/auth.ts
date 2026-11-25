import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { repository } from "./repository";
import type { User } from "./types";

const COOKIE = "smartdeals_session";
const SUPABASE_COOKIE = "smartdeals_supabase";
const SESSION_HOURS = 24 * 7;

export interface AuthUser { id: string; email: string; name: string | null }

export function usesSupabaseAuth(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const target = Buffer.from(expected, "hex");
  return actual.length === target.length && timingSafeEqual(actual, target);
}

function supabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth não configurado");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function signUp(input: { name: string; email: string; password: string }): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> {
  if (usesSupabaseAuth()) {
    const { error, data } = await supabaseAuthClient().auth.signUp({
      email: input.email, password: input.password, options: { data: { name: input.name } },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, needsConfirmation: !data.session };
  }
  const existing = await repository.getUserByEmail(input.email);
  if (existing) return { ok: false, error: "Este e-mail já está cadastrado" };
  const user = await repository.createUser({ email: input.email, name: input.name, passwordHash: hashPassword(input.password) });
  await createLocalSession(user.id);
  return { ok: true };
}

export async function signIn(input: { email: string; password: string }): Promise<{ ok: boolean; error?: string }> {
  if (usesSupabaseAuth()) {
    const client = supabaseAuthClient();
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.session) return { ok: false, error: error?.message ?? "Falha ao entrar" };
    const jar = await cookies();
    jar.set(SUPABASE_COOKIE, JSON.stringify({ access: data.session.access_token, refresh: data.session.refresh_token }), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
    });
    return { ok: true };
  }
  const user = await repository.getUserByEmail(input.email);
  if (!user?.password_hash || !verifyPassword(input.password, user.password_hash)) {
    return { ok: false, error: "E-mail ou senha incorretos" };
  }
  await createLocalSession(user.id);
  return { ok: true };
}

async function createLocalSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await repository.createSession(userId, hashToken(token), new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_HOURS * 3600,
  });
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await repository.deleteSession(hashToken(token));
  if (jar.has(SUPABASE_COOKIE)) {
    try { await supabaseAuthClient().auth.signOut(); } catch { /* sessão já expirada */ }
  }
  jar.delete(COOKIE);
  jar.delete(SUPABASE_COOKIE);
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; token?: string; error?: string; devToken?: boolean }> {
  if (usesSupabaseAuth()) {
    const { error } = await supabaseAuthClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const user = await repository.getUserByEmail(email);
  if (!user) return { ok: true };
  const token = randomBytes(24).toString("base64url");
  await repository.createPasswordReset(user.id, hashToken(token), new Date(Date.now() + 1800_000).toISOString());
  return { ok: true, token, devToken: true };
}

export async function resetPassword(token: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (password.length < 8) return { ok: false, error: "A senha deve ter pelo menos 8 caracteres" };
  if (usesSupabaseAuth()) {
    const { error } = await supabaseAuthClient().auth.updateUser({ password });
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const userId = await repository.consumePasswordReset(hashToken(token));
  if (!userId) return { ok: false, error: "Link inválido ou expirado" };
  await repository.setPasswordHash(userId, hashPassword(password));
  return { ok: true };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  if (jar.has(SUPABASE_COOKIE)) {
    try {
      const raw = JSON.parse(jar.get(SUPABASE_COOKIE)!.value) as { access: string; refresh: string };
      const client = supabaseAuthClient();
      const { data, error } = await client.auth.setSession({ access_token: raw.access, refresh_token: raw.refresh });
      if (!error && data.user) return { id: data.user.id, email: data.user.email ?? "", name: (data.user.user_metadata?.name as string) ?? null };
    } catch { return null; }
  }
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await repository.getSession(hashToken(token));
  if (!session || session.expires_at < new Date().toISOString()) return null;
  const user = await repository.getUserById(session.user_id);
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function toLocalUser(user: User): AuthUser { return { id: user.id, email: user.email, name: user.name }; }

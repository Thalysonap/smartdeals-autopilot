"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ArrowRight } from "lucide-react";

type Mode = "login" | "register" | "forgot" | "reset";

const copy: Record<Mode, { title: string; subtitle: string; action: string }> = {
  login: { title: "Bem-vindo de volta", subtitle: "Seu agente continua trabalhando enquanto você está fora.", action: "Entrar" },
  register: { title: "Comece a economizar", subtitle: "Escolha um produto. O SmartDeals encontra as melhores ofertas.", action: "Criar conta" },
  forgot: { title: "Recuperar acesso", subtitle: "Enviaremos as instruções para redefinir sua senha.", action: "Continuar" },
  reset: { title: "Nova senha", subtitle: "Defina uma senha segura para sua conta.", action: "Salvar senha" },
};

export function AuthForm({ mode, resetToken }: { mode: Mode; resetToken?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const endpoint = mode === "login" ? "/api/auth/login" : mode === "register" ? "/api/auth/register" : mode === "forgot" ? "/api/auth/forgot-password" : "/api/auth/reset-password";
    const payload = mode === "register" ? { name: form.get("name"), email: form.get("email"), password: form.get("password") }
      : mode === "login" ? { email: form.get("email"), password: form.get("password") }
      : mode === "reset" ? { token: resetToken ?? form.get("token"), password: form.get("password") }
      : { email: form.get("email") };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Não foi possível continuar"); return; }
      if (mode === "forgot") {
        setNotice(data.devToken ? `Token de recuperação (ambiente local): ${data.devToken}` : "Instruções enviadas para o seu e-mail.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch { setError("Falha de conexão com o servidor"); }
    finally { setLoading(false); }
  }

  const text = copy[mode];
  return (
    <main className="relative z-10 grid min-h-screen place-items-center px-5 py-12">
      <div className="card animate-in w-full max-w-[430px] p-7 md:p-9">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[#05060a]"><Bot size={22} /></span>
          <div><strong className="block">SmartDeals</strong><span className="muted text-[10px] uppercase tracking-[.2em]">Autopilot</span></div>
        </div>
        <h1 className="page-title">{text.title}</h1>
        <p className="muted mt-2 text-sm">{text.subtitle}</p>
        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          {mode === "register" && <div><label className="label-field">Nome</label><input className="input-field" name="name" required minLength={2} autoComplete="name" /></div>}
          {mode !== "reset" && <div><label className="label-field">E-mail</label><input className="input-field" type="email" name="email" required autoComplete="email" /></div>}
          {mode === "reset" && !resetToken && <div><label className="label-field">Token</label><input className="input-field" name="token" required /></div>}
          {(mode === "login" || mode === "register" || mode === "reset") && (
            <div><label className="label-field">Senha</label><input className="input-field" type="password" name="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
          )}
          {error && <p className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">{error}</p>}
          {notice && <p className="break-all rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3 text-xs">{notice}</p>}
          <button className="btn btn-primary w-full" disabled={loading}>{text.action} <ArrowRight size={16} /></button>
        </form>
        <div className="muted mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {mode === "login" && <>
            <Link href="/register" className="hover:text-[var(--accent)]">Criar conta</Link>
            <Link href="/forgot-password" className="hover:text-[var(--accent)]">Esqueci minha senha</Link>
          </>}
          {mode !== "login" && <Link href="/login" className="hover:text-[var(--accent)]">Voltar ao login</Link>}
        </div>
      </div>
    </main>
  );
}

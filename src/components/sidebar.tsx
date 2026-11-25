"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Sparkles, Radar, History, Database, Settings, LogOut, Bot,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cart", label: "Meu carrinho", icon: ShoppingCart },
  { href: "/opportunities", label: "Oportunidades", icon: Sparkles },
  { href: "/monitored", label: "Produtos monitorados", icon: Radar },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/sources", label: "Fontes de pesquisa", icon: Database },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="relative z-10 flex h-screen w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/70 px-4 py-6 max-lg:hidden">
      <Link href="/" className="mb-9 flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[#05060a]">
          <Bot size={20} strokeWidth={2.4} />
        </span>
        <span>
          <strong className="block text-[15px] tracking-tight">SmartDeals</strong>
          <span className="muted block text-[10px] uppercase tracking-[.18em]">Autopilot</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[var(--surface-2)] text-[var(--accent)]" : "muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]"}`}>
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] pt-4">
        <p className="muted truncate px-2 text-xs" title={email}>{email}</p>
        <button onClick={logout} className="btn btn-ghost mt-3 w-full text-xs"><LogOut size={15} /> Sair</button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 px-1 py-2 backdrop-blur lg:hidden">
      {links.slice(0, 5).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[9px] ${pathname === href ? "text-[var(--accent)]" : "muted"}`}>
          <Icon size={18} /> {label.split(" ")[0]}
        </Link>
      ))}
    </nav>
  );
}

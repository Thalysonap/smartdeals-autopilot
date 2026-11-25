import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const preferences = await repository.getPreferences(user.id);
  return (
    <div className="relative flex min-h-screen">
      <Sidebar email={user.email} />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 md:px-8">
          <div>
            <p className="muted text-[11px] uppercase tracking-[.16em]">Agente de compras</p>
            <p className="text-sm font-semibold">Olá, {user.name ?? user.email.split("@")[0]}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge hidden sm:inline-flex"><span className="size-1.5 rounded-full bg-[var(--positive)]" /> Dados isolados por usuário</span>
            <ThemeToggle initial={preferences.theme} />
          </div>
        </header>
        <main className="flex-1 px-5 pb-24 pt-7 md:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

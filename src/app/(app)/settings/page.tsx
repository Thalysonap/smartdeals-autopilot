import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const preferences = await repository.getPreferences(user.id);
  return (
    <div className="animate-in grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div>
        <p className="muted text-xs uppercase tracking-[.18em]">Conta</p>
        <h1 className="page-title mt-1">Configurações</h1>
        <p className="muted mt-2 max-w-xl text-sm">Preferências pessoais aplicadas somente à sua conta. Seus dados ficam isolados por usuário.</p>
        <div className="card mt-6 space-y-3 p-5 text-sm">
          <div className="flex justify-between"><span className="muted">Nome</span><span>{user.name ?? "—"}</span></div>
          <div className="flex justify-between"><span className="muted">E-mail</span><span>{user.email}</span></div>
          <div className="flex justify-between"><span className="muted">Idioma</span><span>Português (Brasil)</span></div>
        </div>
      </div>
      <div className="pt-9"><SettingsForm preferences={preferences} /></div>
    </div>
  );
}

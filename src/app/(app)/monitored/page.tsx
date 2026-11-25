import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { MonitoredForm } from "@/components/monitored-form";
import { MonitoredList } from "@/components/monitored-list";

export const dynamic = "force-dynamic";

export default async function MonitoredPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const products = await repository.listMonitored(user.id);
  return (
    <div className="animate-in">
      <p className="muted text-xs uppercase tracking-[.18em]">Automação</p>
      <h1 className="page-title mt-1">Produtos monitorados</h1>
      <p className="muted mt-2 max-w-2xl text-sm">Descreva o produto uma vez. O agente descobre lojas, extrai ofertas reais, valida a correspondência e mantém o carrinho atualizado.</p>
      <div className="mt-7"><MonitoredForm /><MonitoredList products={products} /></div>
    </div>
  );
}

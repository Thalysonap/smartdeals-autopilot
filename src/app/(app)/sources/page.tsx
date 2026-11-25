import { Database, ShieldCheck, TriangleAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSourceStatuses } from "@/lib/views";
import { dateTime, relative } from "@/lib/format";
import { SourceToggle } from "@/components/source-toggle";

export const dynamic = "force-dynamic";

const methodLabels: Record<string, string> = {
  api: "API", feed: "Feed", html: "HTML", structured_data: "Dados estruturados", browser: "Navegador", search_engine: "Buscador",
};

export default async function SourcesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const sources = await getSourceStatuses();
  return (
    <div className="animate-in space-y-6">
      <div><p className="muted text-xs uppercase tracking-[.18em]">Transparência de coleta</p><h1 className="page-title mt-1">Fontes de pesquisa</h1><p className="muted mt-2 max-w-3xl text-sm">Uma fonte só é considerada operacional após uma consulta real bem-sucedida. Limitações de acesso são exibidas — nunca simulamos resultados.</p></div>
      <div className="card flex items-start gap-3 p-4 text-xs"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" /><p>Coleta restrita a páginas públicas permitidas, com verificação de robots.txt, limites de requisição e bloqueio de URLs privadas. CAPTCHA e autenticação não são contornados.</p></div>
      <div className="grid gap-3 lg:grid-cols-2">
        {sources.map((source) => (
          <article key={source.store_id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[var(--surface-2)]"><Database size={16} /></span><div><h2 className="font-semibold">{source.storeName}</h2><p className="muted text-[11px]">Método: {methodLabels[source.method] ?? source.method}</p></div></div>
              <SourceToggle storeId={source.store_id} enabled={source.enabled} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`badge ${source.validated ? "text-[var(--positive)]" : "text-[var(--warning)]"}`}>{source.validated ? "Validada por consulta real" : "Não validada"}</span>
              <span className={`badge ${source.enabled ? "" : "text-[var(--danger)]"}`}>{source.enabled ? "Ativa" : "Desativada"}</span>
              <span className="badge">Falhas: {source.failureRate}%</span>
              <span className="badge">{source.totalQueries} consultas</span>
            </div>
            <div className="muted mt-4 grid grid-cols-2 gap-y-2 text-[11px]">
              <span>Última consulta: {relative(source.lastQuery)}</span><span>Produtos encontrados: {source.productsFound}</span>
              <span>Tempo médio: {source.avgResponseMs} ms</span><span>Registro: {dateTime(source.lastQuery)}</span>
            </div>
            {source.limitation && <p className="mt-4 flex gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-[11px]"><TriangleAlert size={14} className="shrink-0" /> {source.limitation}</p>}
            {source.lastError && <p className="muted mt-2 truncate text-[11px]" title={source.lastError}>Último erro: {source.lastError}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

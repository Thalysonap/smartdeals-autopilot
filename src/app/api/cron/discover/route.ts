import { NextResponse } from "next/server";
import { repository } from "@/lib/repository";
import { ensureStoresSeeded } from "@/integrations/registry";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("secret");
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  if (provided !== secret) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  await ensureStoresSeeded();
  const monitored = await repository.dueMonitored(50);
  for (const item of monitored) {
    await repository.enqueue("discovery", { monitoredId: item.id, userId: item.user_id });
    await repository.updateMonitored(item.id, { next_run_at: new Date(Date.now() + item.interval_minutes * 60_000).toISOString() });
  }
  await repository.enqueue("monitor", { limit: 40 });
  return NextResponse.json({ queued: monitored.length + 1, at: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;

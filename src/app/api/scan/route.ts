import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const monitoredId = String(body.monitoredId ?? "");
  const product = await repository.getMonitored(monitoredId, user.id);
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  if (product.status === "paused") return NextResponse.json({ error: "Monitoramento pausado" }, { status: 400 });
  const job = await repository.enqueue("discovery", { monitoredId, userId: user.id });
  await repository.updateMonitored(monitoredId, { next_run_at: new Date().toISOString() });
  return NextResponse.json({ job }, { status: 202 });
}

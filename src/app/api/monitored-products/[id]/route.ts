import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { monitoredProductUpdateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const current = await repository.getMonitored(id, user.id);
  if (!current) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  const parsed = monitoredProductUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const data = parsed.data;
  const updated = await repository.updateMonitored(id, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.brand !== undefined ? { brand: data.brand ?? null } : {}),
    ...(data.model !== undefined ? { model: data.model ?? null } : {}),
    ...(data.version !== undefined ? { version: data.version ?? null } : {}),
    ...(data.capacity !== undefined ? { capacity: data.capacity ?? null } : {}),
    ...(data.category !== undefined ? { category: data.category ?? null } : {}),
    ...(data.attributes !== undefined ? { attributes: data.attributes } : {}),
    ...(data.intervalMinutes !== undefined ? { interval_minutes: data.intervalMinutes } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
  });
  if (data.status === "active" && current.status === "paused") {
    await repository.updateMonitored(id, { next_run_at: new Date().toISOString() });
    await repository.enqueue("discovery", { monitoredId: id, userId: user.id });
  }
  return NextResponse.json({ product: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const current = await repository.getMonitored(id, user.id);
  if (!current) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  await repository.deleteMonitored(id);
  return NextResponse.json({ ok: true });
}

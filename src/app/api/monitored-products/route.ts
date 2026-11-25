import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { monitoredProductSchema } from "@/lib/schemas";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const products = await repository.listMonitored(user.id);
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = monitoredProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const created = await repository.createMonitored({
    user_id: user.id,
    name: parsed.data.name,
    brand: parsed.data.brand ?? null,
    model: parsed.data.model ?? null,
    version: parsed.data.version ?? null,
    capacity: parsed.data.capacity ?? null,
    category: parsed.data.category ?? null,
    attributes: parsed.data.attributes,
    status: "active",
    interval_minutes: parsed.data.intervalMinutes,
  });
  await repository.enqueue("discovery", { monitoredId: created.id, userId: user.id });
  return NextResponse.json({ product: created }, { status: 201 });
}

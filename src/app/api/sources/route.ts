import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { getSourceStatuses } from "@/lib/views";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json({ sources: await getSourceStatuses() });
}

const updateSchema = z.object({ storeId: z.string().min(1), enabled: z.boolean() });

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const integration = (await repository.listIntegrations()).find((item) => item.store_id === parsed.data.storeId);
  if (!integration) return NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });
  await repository.upsertIntegration({ ...integration, enabled: parsed.data.enabled });
  return NextResponse.json({ ok: true });
}

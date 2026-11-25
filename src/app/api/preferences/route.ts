import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { preferencesSchema } from "@/lib/schemas";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const updated = await repository.savePreferences(user.id, {
    ...(parsed.data.theme ? { theme: parsed.data.theme } : {}),
    ...(parsed.data.scanIntervalMinutes ? { scan_interval_minutes: parsed.data.scanIntervalMinutes } : {}),
    ...(parsed.data.notificationsEnabled !== undefined ? { notifications_enabled: parsed.data.notificationsEnabled } : {}),
    ...(parsed.data.affiliateDisclosure !== undefined ? { affiliate_disclosure: parsed.data.affiliateDisclosure } : {}),
  });
  return NextResponse.json({ preferences: updated });
}

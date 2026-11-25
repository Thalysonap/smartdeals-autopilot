import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  const result = await requestPasswordReset(parsed.data.email);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Falha ao solicitar redefinição" }, { status: 400 });
  return NextResponse.json({ ok: true, devToken: result.devToken ? result.token : undefined });
}

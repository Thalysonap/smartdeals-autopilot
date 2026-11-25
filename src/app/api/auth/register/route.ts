import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/schemas";
import { signUp } from "@/lib/auth";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const result = await signUp(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Falha no cadastro" }, { status: 400 });
  return NextResponse.json({ ok: true, needsConfirmation: result.needsConfirmation ?? false });
}

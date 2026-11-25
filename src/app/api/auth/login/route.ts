import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { signIn } from "@/lib/auth";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const result = await signIn(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Falha ao entrar" }, { status: 401 });
  return NextResponse.json({ ok: true });
}

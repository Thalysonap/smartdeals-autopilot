import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/lib/auth";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Token ou senha inválidos" }, { status: 400 });
  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Falha ao redefinir senha" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

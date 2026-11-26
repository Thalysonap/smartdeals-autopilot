import { NextResponse } from "next/server";
import { z } from "zod";
import { repository } from "@/lib/repository";

const patchSchema = z.object({
  sellerName: z.string().trim().min(2).max(120),
  rating: z.number().min(0).max(5),
});

export async function PATCH(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = process.env.ADMIN_TOKEN;
  if (!token || auth.replace(/^Bearer\s+/i, "") !== token) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }
  const offers = await repository.listOffers([{ column: "seller_name", op: "eq", value: parsed.data.sellerName }], 200);
  let updated = 0;
  for (const offer of offers) {
    const { id, created_at, updated_at, ...rest } = offer;
    void id;
    void created_at;
    void updated_at;
    await repository.upsertOffer({ ...rest, seller_rating: parsed.data.rating });
    updated += 1;
  }
  return NextResponse.json({ ok: true, updated });
}


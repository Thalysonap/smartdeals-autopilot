import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { repository } from "@/lib/repository";
import { getOpportunities } from "@/lib/views";
import { opportunityFilterSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = opportunityFilterSchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Filtros inválidos" }, { status: 400 });
  const filters = parsed.data;
  let opportunities = await getOpportunities(user.id);
  opportunities = opportunities.filter((item) => {
    if (filters.product && !item.productName.toLowerCase().includes(filters.product.toLowerCase())) return false;
    if (filters.store && !item.storeName.toLowerCase().includes(filters.store.toLowerCase())) return false;
    if (filters.category && !(item.category ?? "").toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.minPrice !== undefined && item.offer.total_price !== null && item.offer.total_price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && item.offer.total_price !== null && item.offer.total_price > filters.maxPrice) return false;
    if (filters.minReliability !== undefined && (item.reliability?.score ?? 0) < filters.minReliability) return false;
    if (filters.availability && item.offer.availability !== filters.availability) return false;
    if (filters.updatedAfter && item.offer.updated_at < filters.updatedAfter) return false;
    return true;
  });
  return NextResponse.json({ opportunities });
}

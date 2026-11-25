import { repository, now } from "../lib/repository";
import type { Notification } from "../lib/types";

export async function createNotification(input: {
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  offerId: string | null;
}): Promise<Notification> {
  return repository.createNotification({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    offer_id: input.offerId,
  });
}

export async function notifyPriceDrop(userId: string, monitoredName: string, offerId: string, from: number, to: number): Promise<void> {
  await createNotification({
    userId,
    type: "price_drop",
    title: "Queda de preço detectada",
    body: `${monitoredName}: de R$ ${from.toFixed(2)} para R$ ${to.toFixed(2)} (${now().slice(0, 10)}).`,
    offerId,
  });
}

export async function notifyWinnerChanged(userId: string, monitoredName: string, storeName: string, offerId: string): Promise<void> {
  await createNotification({
    userId,
    type: "winner_changed",
    title: "Melhor oferta atualizada no carrinho",
    body: `${monitoredName}: nova oferta vencedora da ${storeName}.`,
    offerId,
  });
}

import { repository, now } from "../lib/repository";
import { rankOffers } from "./best-offer";
import { notifyPriceDrop, notifyWinnerChanged } from "./notifications";

export interface CartUpdateResult {
  updated: boolean;
  action: "added" | "replaced" | "price_updated" | "removed" | "unchanged";
  offerId: string | null;
  reasons: string[];
}

export async function updateCartForProduct(monitoredId: string): Promise<CartUpdateResult> {
  const monitored = await repository.getMonitored(monitoredId);
  if (!monitored) throw new Error("Produto monitorado não encontrado");
  const offers = await repository.listOffers([{ column: "monitored_product_id", op: "eq", value: monitoredId }], 1000);
  const history = await Promise.all(offers.map((offer) => repository.listPriceHistory(offer.id, 100)));
  const historyByOffer = Object.fromEntries(offers.map((offer, index) => [offer.id, history[index]]));
  const stores = await repository.listStores();
  const storeReliability = Object.fromEntries(stores.map((store) => [store.id, store.reliability_base]));
  const ranking = rankOffers({ offers, monitoredName: monitored.name, storeReliability, historyByOffer });
  const winner = ranking.winner;
  const previous = await repository.getCartItem(monitored.user_id, monitoredId);
  const storeName = winner ? stores.find((store) => store.id === winner.offer.store_id)?.name ?? winner.offer.store_id : "";

  if (!winner) {
    if (previous) {
      await repository.deleteCartItem(previous.id);
      await repository.insertCartHistory({
        cart_item_id: previous.id, user_id: monitored.user_id, monitored_product_id: monitoredId,
        offer_id: previous.offer_id, action: "removed", previous_offer_id: previous.offer_id,
        price: previous.price, total_price: previous.total_price,
        reason: "Nenhuma oferta válida e confiável após a última varredura",
        created_at: now(),
      });
    }
    return { updated: Boolean(previous), action: previous ? "removed" : "unchanged", offerId: null, reasons: ranking.rejected.flatMap((r) => r.reasons).slice(0, 8) };
  }

  const offer = winner.offer;
  const base = {
    user_id: monitored.user_id,
    monitored_product_id: monitoredId,
    offer_id: offer.id,
    price: offer.price,
    shipping_price: offer.shipping_price,
    total_price: offer.total_price,
    store_id: offer.store_id,
    reason: winner.rankingReasons.join(" | "),
    score: winner.score,
  };

  if (!previous) {
    const saved = await repository.saveCartItem(base);
    await repository.insertCartHistory({
      cart_item_id: saved.id, user_id: monitored.user_id, monitored_product_id: monitoredId,
      offer_id: offer.id, action: "added", previous_offer_id: null, price: offer.price,
      total_price: offer.total_price, reason: base.reason, created_at: now(),
    });
    await notifyWinnerChanged(monitored.user_id, monitored.name, storeName, offer.id);
    return { updated: true, action: "added", offerId: offer.id, reasons: winner.rankingReasons };
  }

  if (previous.offer_id !== offer.id) {
    const saved = await repository.saveCartItem(base, previous);
    await repository.insertCartHistory({
      cart_item_id: saved.id, user_id: monitored.user_id, monitored_product_id: monitoredId,
      offer_id: offer.id, action: "replaced", previous_offer_id: previous.offer_id,
      price: offer.price, total_price: offer.total_price, reason: base.reason, created_at: now(),
    });
    await notifyWinnerChanged(monitored.user_id, monitored.name, storeName, offer.id);
    return { updated: true, action: "replaced", offerId: offer.id, reasons: winner.rankingReasons };
  }

  if (previous.price !== offer.price || previous.total_price !== offer.total_price) {
    await repository.saveCartItem(base, previous);
    await repository.insertCartHistory({
      cart_item_id: previous.id, user_id: monitored.user_id, monitored_product_id: monitoredId,
      offer_id: offer.id, action: "price_updated", previous_offer_id: null, price: offer.price,
      total_price: offer.total_price, reason: "Preço da oferta vencedora atualizado", created_at: now(),
    });
    if (offer.price < previous.price) {
      await notifyPriceDrop(monitored.user_id, monitored.name, offer.id, previous.price, offer.price);
    }
    return { updated: true, action: "price_updated", offerId: offer.id, reasons: winner.rankingReasons };
  }

  return { updated: false, action: "unchanged", offerId: offer.id, reasons: winner.rankingReasons };
}

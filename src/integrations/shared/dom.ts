import * as cheerio from "cheerio";
import { toCandidate } from "../../engines/normalization";
import type { DataSource, ProductCandidate } from "../../lib/types";
import { absoluteUrl } from "./jsonld";

export interface CardSelectors {
  card: string;
  title: string;
  price: string;
  link?: string;
  image?: string;
}

export function parseDomCards(html: string, baseUrl: string, selectors: CardSelectors, source: DataSource): ProductCandidate[] {
  const $ = cheerio.load(html);
  return $(selectors.card).toArray().map((element, index) => {
    const card = $(element);
    const title = card.find(selectors.title).first().text().trim();
    const priceText = card.find(selectors.price).first().text().trim();
    const href = selectors.link ? card.find(selectors.link).first().attr("href") ?? card.attr("href") : card.attr("href");
    return toCandidate({
      externalId: href ?? `${baseUrl}#${index}`,
      title,
      url: absoluteUrl(href, baseUrl) ?? "",
      imageUrl: selectors.image ? absoluteUrl(card.find(selectors.image).first().attr("src"), baseUrl) : null,
      price: priceText,
      source,
    });
  }).filter((item): item is ProductCandidate => Boolean(item));
}

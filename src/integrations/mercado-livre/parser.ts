import type { ProductCandidate } from "../../lib/types";
import { parseMercadoLivreResponse } from "./normalizer";

export function parseMercadoLivreSearch(payload: unknown): ProductCandidate[] {
  return parseMercadoLivreResponse(payload);
}

import type { NextFGamingOffer, SupplierOfferMapping } from "../types";

export function chooseSupplierMapping(offer: NextFGamingOffer, mappings: SupplierOfferMapping[]) {
  const candidates = mappings
    .filter((mapping) => mapping.offerId === offer.id && mapping.enabled && mapping.availability.state === "available")
    .filter((mapping) => mapping.availability.stock === undefined || mapping.availability.stock > 0)
    .sort((a, b) => a.priority - b.priority || a.supplierCost - b.supplierCost);
  return candidates[0];
}

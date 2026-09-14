import type { GamingQuote, NextFGamingOffer, SupplierOfferMapping } from "../types";

export type GamingPricingSettings = { usdToLkr: number; gatewayFeePercent: number; defaultMarginPercent: number; minimumProfitLkr: number };
export const DEFAULT_VNEXT_PRICING: GamingPricingSettings = { usdToLkr: 305, gatewayFeePercent: 3, defaultMarginPercent: 12, minimumProfitLkr: 60 };

export function supplierCostFor(mapping: SupplierOfferMapping, offer: NextFGamingOffer, quantity: number, requestedAmount?: number) {
  if (offer.kind === "telegram_stars" && requestedAmount) return mapping.supplierCost * requestedAmount;
  if (offer.kind === "steam_wallet" && requestedAmount) return mapping.supplierCost * requestedAmount;
  return mapping.supplierCost * quantity;
}

export function buildGamingQuote(input: { offer: NextFGamingOffer; mapping: SupplierOfferMapping; quantity: number; requestedAmount?: number; settings?: GamingPricingSettings }): GamingQuote {
  const settings = input.settings ?? DEFAULT_VNEXT_PRICING;
  const supplierCost = supplierCostFor(input.mapping, input.offer, input.quantity, input.requestedAmount);
  const supplierCostLkr = input.mapping.supplierCurrency === "USD" ? supplierCost * settings.usdToLkr : supplierCost;
  const derivedBase = Math.max(supplierCostLkr * (1 + settings.defaultMarginPercent / 100), supplierCostLkr + settings.minimumProfitLkr);
  const derivedRetail = Math.ceil((derivedBase / Math.max(0.01, 1 - settings.gatewayFeePercent / 100)) / 10) * 10;
  const fixedRetail = input.offer.sellingPriceLkr ? input.offer.sellingPriceLkr * input.quantity : undefined;
  const sellingPriceLkr = input.offer.pricingMode === "fixed" && fixedRetail ? fixedRetail : derivedRetail;
  const gatewayFeeLkr = sellingPriceLkr * settings.gatewayFeePercent / 100;
  return {
    id: `quote_${crypto.randomUUID()}`,
    offerId: input.offer.id,
    mappingId: input.mapping.id,
    quantity: input.quantity,
    requestedAmount: input.requestedAmount,
    supplierCost,
    supplierCurrency: input.mapping.supplierCurrency,
    supplierCostLkr,
    gatewayFeeLkr,
    marginLkr: sellingPriceLkr - supplierCostLkr - gatewayFeeLkr,
    sellingPriceLkr,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}

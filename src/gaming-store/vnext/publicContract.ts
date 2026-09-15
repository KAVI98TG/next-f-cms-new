import type { DigitalProductKind, PurchaseFieldSchema, RegionRule, SupplierValidationResult } from "./types";

/** Public projections contain NEXT F merchandising only; supplier identity is intentionally absent. */
export type PublicGamingProductProjection = {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  gameFamily?: string;
  brand?: string;
  kind: DigitalProductKind;
  shortDescription?: string;
  merchandisingDescription?: string;
  artworkUrl?: string;
  featured: boolean;
  offers: PublicGamingOfferProjection[];
};

export type PublicGamingOfferProjection = {
  id: string;
  name: string;
  kind: DigitalProductKind;
  purchaseFields: PurchaseFieldSchema[];
  regionRule: RegionRule;
  validationSupported: boolean;
  availability: "available" | "unavailable" | "unknown";
  sellingPriceLkr?: number;
  pricingMode: "fixed" | "supplier_quote" | "amount_based";
  minAmount?: number;
  maxAmount?: number;
  amountStep?: number;
  minQuantity?: number;
  maxQuantity?: number;
};

export type PublicGamingBootstrap = {
  storeName: "NEXT F GAMING";
  currency: "LKR";
  productKinds: DigitalProductKind[];
  featuredProducts: PublicGamingProductProjection[];
};

export type PublicGamingQuoteRequest = {
  offerId: string;
  quantity?: number;
  requestedAmount?: number;
  region?: string;
};

export type PublicGamingQuoteResponse = {
  quoteId: string;
  offerId: string;
  quantity: number;
  sellingPriceLkr: number;
  expiresAt: string;
  available: boolean;
  message?: string;
};

export type PublicGamingValidationRequest = {
  offerId: string;
  fields: Record<string, string>;
};

export type PublicGamingValidationResponse = Pick<SupplierValidationResult, "valid" | "displayName" | "region" | "message">;

export type PublicGamingCheckoutRequest = {
  quoteId: string;
  offerId: string;
  fields: Record<string, string>;
  quantity?: number;
  requestedAmount?: number;
  customer: {
    email: string;
    phone?: string;
    name?: string;
  };
};

export type PublicGamingCheckoutCreated = {
  orderId: string;
  orderNumber: string;
  status: "payment_pending";
  amountLkr: number;
};

export type PublicGamingOrderProjection = {
  orderId: string;
  orderNumber: string;
  productName: string;
  offerName: string;
  status: "payment_pending" | "paid" | "validating" | "submitted" | "processing" | "completed" | "failed" | "refund_pending" | "refunded";
  amountLkr: number;
  validationDisplayName?: string;
  completedAt?: string;
  /** Returned only through an authenticated/secure order-delivery endpoint. */
  deliverables?: Array<{ type: "code" | "pin" | "serial" | "redemption_url" | "topup_confirmation" | "instruction"; label?: string; value: string }>;
  failureMessage?: string;
};

export const GAMING_PUBLIC_OPERATIONS = [
  "gaming.store.bootstrap",
  "gaming.catalog.products",
  "gaming.catalog.product.get",
  "gaming.offer.quote",
  "gaming.account.validate",
  "gaming.checkout.create",
  "gaming.payment.confirm",
  "gaming.order.get",
  "gaming.order.delivery.get",
] as const;

export type GamingPublicOperation = (typeof GAMING_PUBLIC_OPERATIONS)[number];

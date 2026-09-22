/**
 * NEXT F Gaming Store vNext canonical domain.
 *
 * This is additive by design. The existing v0.5 Gaming Store remains intact while
 * supplier-specific APIs are migrated behind a stable NEXT F contract.
 */

export type DigitalProductKind =
  | "topup"
  | "gift_card"
  | "game_key"
  | "steam_wallet"
  | "steam_gift"
  | "telegram_stars"
  | "telegram_premium"
  | "manual_service"
  | "subscription";

export type PurchaseFieldType = "text" | "number" | "select" | "email" | "url" | "username" | "country";

export type PurchaseFieldOption = {
  value: string;
  label: string;
};

export type PurchaseFieldSchema = {
  key: string;
  label: string;
  type: PurchaseFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  options?: PurchaseFieldOption[];
};

export type ValidationCapability = {
  supported: boolean;
  mode: "none" | "supplier_preflight" | "local";
  fieldKeys: string[];
};

export type RegionRule = {
  mode: "global" | "allow_list" | "block_list" | "named_region";
  label?: string;
  countryCodes?: string[];
};

export type AvailabilitySnapshot = {
  state: "available" | "unavailable" | "unknown" | "paused";
  stock?: number;
  minQuantity?: number;
  maxQuantity?: number;
  checkedAt: string;
  source: "supplier" | "cms_override" | "derived";
};

export type SupplierCapabilities = {
  productKinds: DigitalProductKind[];
  accountValidation: boolean;
  inventoryCounts: boolean;
  quantityRules: boolean;
  regionRules: boolean;
  synchronousCodeDelivery: boolean;
  webhookFulfillment: boolean;
  manualChat: boolean;
  idempotentOrders: boolean;
};


export type NextFGamingGameFamily = {
  id: string;
  name: string;
  slug: string;
  artworkUrl?: string;
  heroArtworkUrl?: string;
  enabled: boolean;
  updatedAt: string;
};

export type NextFGamingHomeSection = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  source: "featured" | "category" | "manual";
  category?: DigitalProductKind | "steam" | "telegram" | "other";
  productIds?: string[];
  limit: number;
  enabled: boolean;
  sortOrder: number;
};

export type NextFGamingHeroSlide = {
  id: string;
  enabled: boolean;
  mediaType: "image" | "video";
  productId?: string;
  eyebrow: string;
  title?: string;
  description?: string;
  mediaUrl?: string;
  posterUrl?: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  sortOrder: number;
  durationSeconds: number;
};

export type NextFGamingStorefrontConfig = {
  hero: {
    enabled: boolean;
    productId?: string;
    eyebrow: string;
    title?: string;
    description?: string;
    backgroundArtworkUrl?: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
  heroSlides?: NextFGamingHeroSlide[];
  sections: NextFGamingHomeSection[];
  updatedAt: string;
};

export type NextFGamingProduct = {
  id: string;
  slug: string;
  /** Supplier-synced/fallback product name. Public merchandising may override it with displayName. */
  name: string;
  sourceName?: string;
  /** NEXT F-owned customer-facing name. Supplier sync must never overwrite this field. */
  displayName?: string;
  gameFamily?: string;
  brand?: string;
  kind: DigitalProductKind;
  shortDescription?: string;
  /** NEXT F-owned customer-facing description. Supplier sync must never overwrite this field. */
  merchandisingDescription?: string;
  description?: string;
  /** NEXT F-owned HTTPS artwork URL. Supplier sync must never overwrite this field. */
  artworkUrl?: string;
  enabled: boolean;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
};

/** A retail option visible to the customer, e.g. PUBG 60 UC or Steam USD $10. */
export type NextFGamingOffer = {
  id: string;
  productId: string;
  name: string;
  kind: DigitalProductKind;
  purchaseFields: PurchaseFieldSchema[];
  validation: ValidationCapability;
  regionRule: RegionRule;
  sellingPriceLkr?: number;
  pricingMode: "fixed" | "supplier_quote" | "amount_based";
  minAmount?: number;
  maxAmount?: number;
  amountStep?: number;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Maps one NEXT F offer to one supplier offer. Multiple mappings may point to the
 * same NEXT F offer to support primary/fallback routing and future suppliers.
 */
export type SupplierOfferMapping = {
  id: string;
  offerId: string;
  supplierId: string;
  supplierKind: DigitalProductKind;
  externalCategoryId?: string;
  externalOfferId?: string;
  externalProductId?: string;
  externalMetadata?: Record<string, string | number | boolean | null>;
  priority: number;
  enabled: boolean;
  availability: AvailabilitySnapshot;
  supplierCost: number;
  supplierCurrency: string;
  lastSyncedAt?: string;
};

export type GamingQuote = {
  id: string;
  offerId: string;
  mappingId: string;
  quantity: number;
  requestedAmount?: number;
  supplierCost: number;
  supplierCurrency: string;
  supplierCostLkr: number;
  gatewayFeeLkr: number;
  marginLkr: number;
  sellingPriceLkr: number;
  expiresAt: string;
  createdAt: string;
};

export type SupplierValidationResult = {
  valid: boolean;
  displayName?: string;
  region?: string;
  metadata?: Record<string, string | number | boolean | null>;
  message?: string;
};

export type DigitalDeliverable = {
  type: "code" | "pin" | "serial" | "redemption_url" | "topup_confirmation" | "instruction";
  /** Sensitive values must never be sent to analytics or plain application logs. */
  value: string;
  label?: string;
};

export type GamingFulfillmentStatus =
  | "created"
  | "payment_pending"
  | "paid"
  | "validating"
  | "quoted"
  | "submitted"
  | "processing"
  | "completed"
  | "failed"
  | "refund_pending"
  | "refunded";

export type GamingOrderVNext = {
  id: string;
  number: string;
  productId: string;
  offerId: string;
  mappingId: string;
  supplierId: string;
  status: GamingFulfillmentStatus;
  purchaseFields: Record<string, string>;
  quantity: number;
  requestedAmount?: number;
  quote: GamingQuote;
  customerPaid: boolean;
  supplierCharged: boolean;
  supplierOrderId?: string;
  validation?: SupplierValidationResult;
  deliverables: DigitalDeliverable[];
  idempotencyKey: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

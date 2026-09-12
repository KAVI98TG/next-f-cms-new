
export type SupplierStatus = "connected" | "degraded" | "disabled" | "not_configured";
export type SupplierAuthMode = "api_key" | "bearer" | "basic" | "hmac";
export type SupplierEndpointKey = "catalog" | "balance" | "createOrder" | "orderStatus" | "refund" | "webhook";

export type SupplierApiConfig = {
  baseUrl: string;
  docsUrl?: string;
  authMode: SupplierAuthMode;
  authHeader: string;
  secretMasked: boolean;
  environment: "sandbox" | "production";
  endpoints: Partial<Record<SupplierEndpointKey, string>>;
  discoveryStatus: "not_started" | "detected" | "manual" | "needs_review" | "failed";
  discoveryConfidence: number;
  discoveredAt?: string;
};
export type ProductAvailability = "available" | "unavailable" | "paused";
export type GamingOrderStatus = "created" | "payment_pending" | "paid" | "validating" | "submitted" | "processing" | "completed" | "failed" | "refund_pending" | "refunded";
export type SupportStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportPriority = "normal" | "high" | "urgent";

export type GamingSupplier = {
  id: string;
  name: string;
  providerKey: string;
  status: SupplierStatus;
  apiConfig?: SupplierApiConfig;
  balance: number;
  currency: "USD" | "LKR";
  apiLatencyMs: number;
  webhookHealthy: boolean;
  lastSyncAt?: string;
  lastTestAt?: string;
  enabled: boolean;
};

export type SupplierProduct = {
  id: string;
  supplierId: string;
  externalId: string;
  game: string;
  title: string;
  category: "topup" | "membership" | "gift_card" | "subscription";
  cost: number;
  currency: "USD" | "LKR";
  region: string;
  available: boolean;
  requiredFields: string[];
  updatedAt: string;
};

export type GamingProduct = {
  id: string;
  slug: string;
  name: string;
  game: string;
  category: SupplierProduct["category"];
  supplierProductId: string;
  supplierId: string;
  sellingPrice: number;
  suggestedPrice: number;
  availability: ProductAvailability;
  enabled: boolean;
  storefrontLabel: string;
  requiredFields: string[];
  createdAt: string;
  updatedAt: string;
};

export type GamingCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  lifetimeValue: number;
  createdAt: string;
  lastOrderAt?: string;
};

export type GamingOrder = {
  id: string;
  number: string;
  customerId: string;
  productId: string;
  supplierId: string;
  supplierProductId: string;
  status: GamingOrderStatus;
  accountFields: Record<string, string>;
  sellingPrice: number;
  supplierCost: number;
  supplierCostLkr: number;
  gatewayFee: number;
  profit: number;
  customerPaid: boolean;
  supplierCharged: boolean;
  supplierOrderId?: string;
  validationName?: string;
  failureReason?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type GamingSupportCase = {
  id: string;
  number: string;
  orderId: string;
  customerId: string;
  subject: string;
  detail: string;
  priority: SupportPriority;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
};

export type GamingSettings = {
  storeCurrency: "LKR";
  usdToLkr: number;
  gatewayFeePercent: number;
  defaultMarginPercent: number;
  minimumProfitLkr: number;
  lowSupplierBalanceUsd: number;
  autoPauseUnavailableProducts: boolean;
  requireValidationWhenSupported: boolean;
};

export type GamingActivity = {
  id: string;
  title: string;
  detail: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  createdAt: string;
};

import type {
  AvailabilitySnapshot,
  DigitalProductKind,
  PurchaseFieldSchema,
  RegionRule,
  SupplierCapabilities,
  SupplierValidationResult,
} from "./types";

export type SupplierCatalogItem = {
  externalCategoryId: string;
  name: string;
  kind: DigitalProductKind;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SupplierOffer = {
  externalCategoryId?: string;
  externalOfferId: string;
  name: string;
  kind: DigitalProductKind;
  cost: number;
  currency: string;
  fields: PurchaseFieldSchema[];
  regionRule: RegionRule;
  availability: AvailabilitySnapshot;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SupplierOrderRequest = {
  kind: DigitalProductKind;
  externalCategoryId?: string;
  externalOfferId?: string;
  externalProductId?: string;
  fields: Record<string, string>;
  quantity: number;
  requestedAmount?: number;
  region?: string;
  idempotencyKey: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SupplierOrderResult = {
  supplierOrderId: string;
  status: "created" | "processing" | "completed" | "failed";
  rawKind?: string;
  deliverables?: Array<{ type: "code" | "pin" | "serial" | "redemption_url" | "topup_confirmation" | "instruction"; value: string; label?: string }>;
  failureReason?: string;
};

export type SupplierQuoteRequest = {
  kind: DigitalProductKind;
  externalCategoryId?: string;
  externalOfferId?: string;
  externalProductId?: string;
  quantity: number;
  requestedAmount?: number;
  region?: string;
};

export type SupplierQuoteResult = {
  cost: number;
  currency: string;
  expiresAt?: string;
};

/**
 * Runtime adapter contract. Implementations belong on a trusted server/worker,
 * never in the browser bundle, because supplier credentials are reseller secrets.
 */
export interface SupplierAdapter {
  readonly providerKey: string;
  readonly capabilities: SupplierCapabilities;
  listCatalog(kind: DigitalProductKind): Promise<SupplierCatalogItem[]>;
  listOffers(kind: DigitalProductKind, externalCategoryId?: string): Promise<SupplierOffer[]>;
  quote(input: SupplierQuoteRequest): Promise<SupplierQuoteResult>;
  validate?(input: { externalCategoryId?: string; fields: Record<string, string> }): Promise<SupplierValidationResult>;
  createOrder(input: SupplierOrderRequest): Promise<SupplierOrderResult>;
  getOrder(supplierOrderId: string): Promise<SupplierOrderResult>;
}

export type SupplierAdapterManifest = {
  providerKey: string;
  displayName: string;
  baseUrl: string;
  docsUrl: string;
  auth: {
    serverSideOnly: true;
    primaryHeader: string;
    alternative?: string;
  };
  capabilities: SupplierCapabilities;
  endpoints: Record<string, { method: "GET" | "POST"; path: string; purpose: string }>;
  operationalNotes: string[];
};

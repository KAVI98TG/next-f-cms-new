import { readDurableValue, refreshDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type FazerCatalogKind = "topup" | "gift_card" | "game_key" | "manual_service";

export type FazerCatalogConfig = {
  providerKey: "fazercards";
  enabled: boolean;
  baseUrl: string;
  authHeader: "X-API-Key";
  catalogKinds: FazerCatalogKind[];
  maxCategoriesPerSync: number;
  autoPublishProducts: boolean;
  autoPublishOffers: boolean;
  pricing: {
    mode: "supplier_quote" | "markup";
    lkrPerUsd: number | null;
    markupPercent: number | null;
    gatewayFeePercent: number;
    minimumProfitLkr: number;
    fixedFeeLkr: number;
    roundToLkr: number;
  };
};

export type FazerSyncSummary = {
  providerKey: "fazercards";
  startedAt: string;
  completedAt: string;
  kinds: FazerCatalogKind[];
  categories: number;
  offers: number;
  productsWritten: number;
  offersWritten: number;
  mappingsWritten: number;
  truncatedKinds: FazerCatalogKind[];
  dryRun: boolean;
};

export type FazerSupplierStatus = {
  providerKey: "fazercards";
  connected: boolean;
  account?: { id: string | null; plan?: string | null };
  balance?: { amount: string; currency: string };
  lastHealthAt?: string;
  lastSync?: FazerSyncSummary;
  lastPreview?: FazerSyncSummary;
  lastError?: string;
  lastProcessedCommandId?: string;
  updatedAt: string;
};

export type FazerSupplierCommand = {
  id: string;
  action: "health" | "preview" | "sync";
  kinds?: FazerCatalogKind[];
  requestedAt: string;
};

export const FAZER_CONFIG_KEY = "nextf.vnext.gaming.supplier-config.fazercards";
export const FAZER_PRICING_KEY = "nextf.vnext.gaming.pricing.fazercards";
export const FAZER_STATUS_KEY = "nextf.vnext.gaming.supplier-status.fazercards";
export const FAZER_COMMAND_KEY = "nextf.vnext.gaming.supplier-command.fazercards";

export const defaultFazerConfig: FazerCatalogConfig = {
  providerKey: "fazercards",
  enabled: true,
  baseUrl: "https://api.fzr.cards/api/v2",
  authHeader: "X-API-Key",
  catalogKinds: ["topup", "gift_card", "game_key", "manual_service"],
  maxCategoriesPerSync: 100,
  autoPublishProducts: true,
  autoPublishOffers: true,
  pricing: {
    mode: "supplier_quote",
    lkrPerUsd: null,
    markupPercent: null,
    gatewayFeePercent: 0,
    minimumProfitLkr: 0,
    fixedFeeLkr: 0,
    roundToLkr: 10,
  },
};

export const defaultFazerPricing = defaultFazerConfig.pricing;

const defaultStatus: FazerSupplierStatus = { providerKey: "fazercards", connected: false, updatedAt: "" };

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:gaming-store", { detail: "fazercards-live-control" }));
}

export function getFazerConfig() {
  return readDurableValue(FAZER_CONFIG_KEY, defaultFazerConfig);
}

export function saveFazerConfig(config: FazerCatalogConfig) {
  const next: FazerCatalogConfig = {
    ...config,
    providerKey: "fazercards",
    authHeader: "X-API-Key",
    baseUrl: config.baseUrl.trim().replace(/\/+$/, ""),
    maxCategoriesPerSync: Math.max(1, Math.min(200, Math.floor(Number(config.maxCategoriesPerSync) || 100))),
    pricing: {
      ...config.pricing,
      lkrPerUsd: config.pricing.lkrPerUsd && config.pricing.lkrPerUsd > 0 ? config.pricing.lkrPerUsd : null,
      markupPercent: config.pricing.markupPercent === null ? null : Math.max(0, Math.min(500, Number(config.pricing.markupPercent) || 0)),
      gatewayFeePercent: Math.max(0, Math.min(50, Number(config.pricing.gatewayFeePercent) || 0)),
      minimumProfitLkr: Math.max(0, Number(config.pricing.minimumProfitLkr) || 0),
      fixedFeeLkr: Math.max(0, Number(config.pricing.fixedFeeLkr) || 0),
      roundToLkr: Math.max(1, Math.min(1000, Number(config.pricing.roundToLkr) || 10)),
    },
  };
  writeDurableValue(FAZER_CONFIG_KEY, next);
  emit();
  return next;
}


export function getFazerPricing() {
  return readDurableValue(FAZER_PRICING_KEY, defaultFazerPricing);
}

export function saveFazerPricing(pricing: FazerCatalogConfig["pricing"]) {
  const normalized: FazerCatalogConfig["pricing"] = {
    mode: pricing.mode === "markup" ? "markup" : "supplier_quote",
    lkrPerUsd: pricing.lkrPerUsd && pricing.lkrPerUsd > 0 ? pricing.lkrPerUsd : null,
    markupPercent: pricing.markupPercent === null ? null : Math.max(0, Math.min(500, Number(pricing.markupPercent) || 0)),
    gatewayFeePercent: Math.max(0, Math.min(50, Number(pricing.gatewayFeePercent) || 0)),
    minimumProfitLkr: Math.max(0, Number(pricing.minimumProfitLkr) || 0),
    fixedFeeLkr: Math.max(0, Number(pricing.fixedFeeLkr) || 0),
    roundToLkr: Math.max(1, Math.min(1000, Number(pricing.roundToLkr) || 10)),
  };
  writeDurableValue(FAZER_PRICING_KEY, normalized);
  emit();
  return normalized;
}

export async function refreshFazerPricing() {
  const pricing = await refreshDurableValue(FAZER_PRICING_KEY, defaultFazerPricing);
  emit();
  return pricing;
}

export function getFazerStatus() {
  return readDurableValue(FAZER_STATUS_KEY, defaultStatus);
}

export async function refreshFazerStatus() {
  const status = await refreshDurableValue(FAZER_STATUS_KEY, defaultStatus);
  emit();
  return status;
}

export async function refreshFazerConfig() {
  const config = await refreshDurableValue(FAZER_CONFIG_KEY, defaultFazerConfig);
  emit();
  return config;
}

export function queueFazerCommand(action: FazerSupplierCommand["action"], kinds?: FazerCatalogKind[]) {
  const command: FazerSupplierCommand = {
    id: `fazercards-cmd-${crypto.randomUUID()}`,
    action,
    ...(kinds?.length ? { kinds } : {}),
    requestedAt: new Date().toISOString(),
  };
  writeDurableValue(FAZER_COMMAND_KEY, command);
  emit();
  return command;
}

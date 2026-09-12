import { platformStore } from "../../platform/services/platformStore";
import type { GamingSupplier, SupplierProduct, GamingProduct, GamingCustomer, GamingOrder, GamingSupportCase, GamingSettings, GamingActivity, ProductAvailability } from "./types";

export const KEYS = {
  suppliers: "nextf.v0.5.gaming.suppliers",
  supplierProducts: "nextf.v0.5.gaming.supplier-products",
  products: "nextf.v0.5.gaming.products",
  customers: "nextf.v0.5.gaming.customers",
  orders: "nextf.v0.5.gaming.orders",
  support: "nextf.v0.5.gaming.support",
  settings: "nextf.v0.5.gaming.settings",
  activity: "nextf.v0.5.gaming.activity",
};

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

export const seedSettings: GamingSettings = {
  storeCurrency: "LKR",
  usdToLkr: 305,
  gatewayFeePercent: 3.0,
  defaultMarginPercent: 12,
  minimumProfitLkr: 60,
  lowSupplierBalanceUsd: 100,
  autoPauseUnavailableProducts: true,
  requireValidationWhenSupported: true,
};

export const seedSuppliers: GamingSupplier[] = [
  { id: "sup_fazer", name: "FazerCards", providerKey: "fazercards", status: "connected", balance: 824.42, currency: "USD", apiLatencyMs: 244, webhookHealthy: true, lastSyncAt: ago(12), lastTestAt: ago(4), enabled: true },
  { id: "sup_backup", name: "Backup Supplier", providerKey: "generic-supplier", status: "not_configured", balance: 0, currency: "USD", apiLatencyMs: 0, webhookHealthy: false, enabled: false },
];

export const seedSupplierProducts: SupplierProduct[] = [
  { id: "sp_pubg_60", supplierId: "sup_fazer", externalId: "PUBG-60UC", game: "PUBG Mobile", title: "60 UC", category: "topup", cost: 0.92, currency: "USD", region: "Global", available: true, requiredFields: ["Player ID"], updatedAt: ago(12) },
  { id: "sp_pubg_325", supplierId: "sup_fazer", externalId: "PUBG-325UC", game: "PUBG Mobile", title: "325 UC", category: "topup", cost: 4.48, currency: "USD", region: "Global", available: true, requiredFields: ["Player ID"], updatedAt: ago(12) },
  { id: "sp_ff_100", supplierId: "sup_fazer", externalId: "FF-100D", game: "Free Fire", title: "100 Diamonds", category: "topup", cost: 0.76, currency: "USD", region: "Global", available: true, requiredFields: ["Player ID"], updatedAt: ago(12) },
  { id: "sp_ff_530", supplierId: "sup_fazer", externalId: "FF-530D", game: "Free Fire", title: "530 Diamonds", category: "topup", cost: 3.62, currency: "USD", region: "Global", available: true, requiredFields: ["Player ID"], updatedAt: ago(12) },
  { id: "sp_cod_80", supplierId: "sup_fazer", externalId: "CODM-80CP", game: "Call of Duty Mobile", title: "80 CP", category: "topup", cost: 0.84, currency: "USD", region: "Global", available: true, requiredFields: ["Player ID", "Region"], updatedAt: ago(12) },
  { id: "sp_ml_86", supplierId: "sup_fazer", externalId: "MLBB-86D", game: "Mobile Legends", title: "86 Diamonds", category: "topup", cost: 1.28, currency: "USD", region: "Global", available: true, requiredFields: ["User ID", "Zone ID"], updatedAt: ago(12) },
  { id: "sp_steam_5", supplierId: "sup_fazer", externalId: "STEAM-5USD", game: "Steam", title: "$5 Gift Card", category: "gift_card", cost: 5.15, currency: "USD", region: "Global", available: false, requiredFields: ["Email"], updatedAt: ago(12) },
  { id: "sp_telegram_3", supplierId: "sup_fazer", externalId: "TG-PREM-3M", game: "Telegram", title: "Premium 3 Months", category: "membership", cost: 9.40, currency: "USD", region: "Global", available: true, requiredFields: ["Username"], updatedAt: ago(12) },
];

export function suggestedPriceFor(source: SupplierProduct, settings = seedSettings) {
  const costLkr = source.currency === "USD" ? source.cost * settings.usdToLkr : source.cost;
  const gatewayBase = 1 - settings.gatewayFeePercent / 100;
  const marginPrice = costLkr * (1 + settings.defaultMarginPercent / 100);
  const minimumPrice = costLkr + settings.minimumProfitLkr;
  const preGateway = Math.max(marginPrice, minimumPrice);
  return Math.ceil(preGateway / Math.max(0.01, gatewayBase) / 10) * 10;
}

export const seedProducts: GamingProduct[] = [
  ["prod_pubg_60", "pubg-mobile-60-uc", "PUBG Mobile 60 UC", "sp_pubg_60"],
  ["prod_pubg_325", "pubg-mobile-325-uc", "PUBG Mobile 325 UC", "sp_pubg_325"],
  ["prod_ff_100", "free-fire-100-diamonds", "Free Fire 100 Diamonds", "sp_ff_100"],
  ["prod_ff_530", "free-fire-530-diamonds", "Free Fire 530 Diamonds", "sp_ff_530"],
  ["prod_cod_80", "cod-mobile-80-cp", "COD Mobile 80 CP", "sp_cod_80"],
  ["prod_ml_86", "mobile-legends-86-diamonds", "Mobile Legends 86 Diamonds", "sp_ml_86"],
].map(([id, slug, label, supplierProductId]) => {
  const source = seedSupplierProducts.find((row) => row.id === supplierProductId)!;
  const suggested = suggestedPriceFor(source);
  return { id, slug, name: label, game: source.game, category: source.category, supplierProductId, supplierId: source.supplierId, sellingPrice: suggested, suggestedPrice: suggested, availability: source.available ? "available" : "unavailable", enabled: true, storefrontLabel: label, requiredFields: source.requiredFields, createdAt: ago(600), updatedAt: ago(12) } as GamingProduct;
});

export const seedCustomers: GamingCustomer[] = [
  { id: "gc_1", name: "Kasun Silva", email: "kasun@example.com", phone: "+94 77 111 2200", orders: 4, lifetimeValue: 6850, createdAt: ago(5500), lastOrderAt: ago(55) },
  { id: "gc_2", name: "Tharushi Perera", email: "tharushi@example.com", phone: "+94 76 430 2201", orders: 2, lifetimeValue: 2410, createdAt: ago(2900), lastOrderAt: ago(160) },
  { id: "gc_3", name: "Dilan Fernando", email: "dilan@example.com", phone: "+94 71 880 9944", orders: 1, lifetimeValue: 390, createdAt: ago(300), lastOrderAt: ago(300) },
];

function economics(productId: string, sourceId: string, settings = seedSettings) {
  const source = seedSupplierProducts.find((row) => row.id === sourceId)!;
  const product = seedProducts.find((row) => row.id === productId)!;
  const supplierCostLkr = source.currency === "USD" ? source.cost * settings.usdToLkr : source.cost;
  const gatewayFee = product.sellingPrice * settings.gatewayFeePercent / 100;
  return { supplierCost: source.cost, supplierCostLkr, gatewayFee, profit: product.sellingPrice - supplierCostLkr - gatewayFee };
}

export const seedOrders: GamingOrder[] = [
  { id: "go_1", number: "GS-5001", customerId: "gc_1", productId: "prod_pubg_325", supplierId: "sup_fazer", supplierProductId: "sp_pubg_325", status: "completed", accountFields: { "Player ID": "5123456789" }, sellingPrice: seedProducts[1].sellingPrice, ...economics("prod_pubg_325", "sp_pubg_325"), customerPaid: true, supplierCharged: true, supplierOrderId: "FZ-MOCK-9011", validationName: "KASUN98", idempotencyKey: "local-5001", createdAt: ago(55), updatedAt: ago(54), completedAt: ago(54) },
  { id: "go_2", number: "GS-5002", customerId: "gc_2", productId: "prod_ff_530", supplierId: "sup_fazer", supplierProductId: "sp_ff_530", status: "processing", accountFields: { "Player ID": "889101992" }, sellingPrice: seedProducts[3].sellingPrice, ...economics("prod_ff_530", "sp_ff_530"), customerPaid: true, supplierCharged: true, supplierOrderId: "FZ-MOCK-9012", validationName: "THARU", idempotencyKey: "local-5002", createdAt: ago(9), updatedAt: ago(2) },
  { id: "go_3", number: "GS-5003", customerId: "gc_3", productId: "prod_cod_80", supplierId: "sup_fazer", supplierProductId: "sp_cod_80", status: "failed", accountFields: { "Player ID": "COD-882290", "Region": "Asia" }, sellingPrice: seedProducts[4].sellingPrice, ...economics("prod_cod_80", "sp_cod_80"), customerPaid: true, supplierCharged: false, failureReason: "Supplier validation rejected the mock player reference.", idempotencyKey: "local-5003", createdAt: ago(18), updatedAt: ago(16) },
];

export const seedSupport: GamingSupportCase[] = [
  { id: "gs_1", number: "GS-S-8001", orderId: "go_3", customerId: "gc_3", subject: "Paid order failed validation", detail: "Customer payment is confirmed but supplier fulfillment did not start. Review account details or refund.", priority: "high", status: "open", createdAt: ago(15), updatedAt: ago(15) },
];

export const seedActivity: GamingActivity[] = [
  { id: "ga_1", title: "Supplier catalog synced", detail: "FazerCards mock catalog refreshed 8 offers.", tone: "success", createdAt: ago(12) },
  { id: "ga_2", title: "Order processing", detail: "GS-5002 is waiting for supplier completion.", tone: "info", createdAt: ago(2) },
  { id: "ga_3", title: "Order needs review", detail: "GS-5003 was paid but failed before supplier charge.", tone: "warning", createdAt: ago(15) },
];

export function read<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  const raw = window.localStorage.getItem(key);
  if (!raw) { window.localStorage.setItem(key, JSON.stringify(seed)); return seed; }
  try { return JSON.parse(raw) as T; }
  catch { window.localStorage.setItem(key, JSON.stringify(seed)); return seed; }
}

export function write<T>(key: string, value: T): T {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("nextf:gaming-store", { detail: key }));
  return value;
}

export function uid(prefix: string) { return `${prefix}_${crypto.randomUUID()}`; }
export function nextNumber(prefix: string, rows: Array<{ number: string }>, base: number) {
  const max = rows.reduce((current, row) => Math.max(current, Number(row.number.replace(/\D/g, "")) || base), base);
  return `${prefix}${max + 1}`;
}
export function audit(action: string, target: string, detail: string, tone: "neutral" | "info" | "warning" = "info") {
  platformStore.addAudit("Admin", action, target, "Gaming Store", detail, tone);
}
export function pushActivity(title: string, detail: string, tone: GamingActivity["tone"] = "neutral") {
  const rows = read(KEYS.activity, seedActivity);
  write(KEYS.activity, [{ id: uid("ga"), title, detail, tone, createdAt: new Date().toISOString() }, ...rows].slice(0, 100));
}

export function orderReconciliation(order: GamingOrder) {
  if (order.status === "refunded") return "refunded" as const;
  if (order.customerPaid && order.supplierCharged && order.status === "completed") return "reconciled" as const;
  if (order.customerPaid && !order.supplierCharged) return "payment_only" as const;
  if (!order.customerPaid && order.supplierCharged) return "supplier_only" as const;
  return "pending" as const;
}


export function resetGamingCore(){ Object.values(KEYS).forEach((key)=>window.localStorage.removeItem(key)); window.dispatchEvent(new CustomEvent("nextf:gaming-store",{detail:"reset"})); }

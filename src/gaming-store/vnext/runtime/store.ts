import { readDurableValue, removeDurableValue, writeDurableValue } from "../../../services/production/durableStorage";
import type { GamingOrderVNext, NextFGamingOffer, NextFGamingProduct, SupplierOfferMapping } from "../types";

const KEYS = {
  products: "nextf.vnext.gaming.products",
  offers: "nextf.vnext.gaming.offers",
  mappings: "nextf.vnext.gaming.mappings",
  orders: "nextf.vnext.gaming.orders",
};

const now = new Date().toISOString();
const availability = (stock?: number) => ({ state: "available" as const, stock, minQuantity: 1, maxQuantity: stock ? Math.min(stock, 10) : 1, checkedAt: now, source: "supplier" as const });

export const seedVNextProducts: NextFGamingProduct[] = [
  { id: "nfp_pubg", slug: "pubg-mobile", name: "PUBG Mobile", brand: "PUBG", kind: "topup", shortDescription: "Instant UC top-ups delivered directly to your player account.", artworkUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80", enabled: true, featured: true, seoTitle: "PUBG Mobile UC Top Up Sri Lanka", seoDescription: "Top up PUBG Mobile UC instantly with NEXT F Gaming.", createdAt: now, updatedAt: now },
  { id: "nfp_mlbb", slug: "mobile-legends", name: "Mobile Legends", brand: "MLBB", kind: "topup", shortDescription: "Diamonds delivered to your verified Mobile Legends account.", artworkUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=80", enabled: true, featured: true, createdAt: now, updatedAt: now },
  { id: "nfp_steam_gc", slug: "steam-gift-card", name: "Steam Gift Card", brand: "Steam", kind: "gift_card", shortDescription: "Digital Steam wallet codes with instant secure delivery.", artworkUrl: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1000&q=80", enabled: true, featured: true, createdAt: now, updatedAt: now },
  { id: "nfp_steam_wallet", slug: "steam-wallet-topup", name: "Steam Wallet Top Up", brand: "Steam", kind: "steam_wallet", shortDescription: "Top up an eligible Steam account with a custom amount.", artworkUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80", enabled: true, featured: true, createdAt: now, updatedAt: now },
  { id: "nfp_telegram", slug: "telegram-stars", name: "Telegram Stars", brand: "Telegram", kind: "telegram_stars", shortDescription: "Buy Telegram Stars for any supported username.", artworkUrl: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=1000&q=80", enabled: true, featured: false, createdAt: now, updatedAt: now },
  { id: "nfp_key", slug: "pc-game-key", name: "PC Game Keys", brand: "Steam", kind: "game_key", shortDescription: "Region-aware activation keys delivered digitally after payment.", artworkUrl: "https://images.unsplash.com/photo-1603481546238-487240415921?auto=format&fit=crop&w=1000&q=80", enabled: true, featured: false, createdAt: now, updatedAt: now },
];

export const seedVNextOffers: NextFGamingOffer[] = [
  { id: "nfo_pubg_60", productId: "nfp_pubg", name: "60 UC", kind: "topup", purchaseFields: [{ key: "player_id", label: "Player ID", type: "text", required: true, placeholder: "Enter PUBG Player ID", helpText: "Check your in-game profile before continuing." }], validation: { supported: true, mode: "supplier_preflight", fieldKeys: ["player_id"] }, regionRule: { mode: "global", label: "Global" }, sellingPriceLkr: 390, pricingMode: "fixed", enabled: true, sortOrder: 10, createdAt: now, updatedAt: now },
  { id: "nfo_pubg_325", productId: "nfp_pubg", name: "325 UC", kind: "topup", purchaseFields: [{ key: "player_id", label: "Player ID", type: "text", required: true, placeholder: "Enter PUBG Player ID" }], validation: { supported: true, mode: "supplier_preflight", fieldKeys: ["player_id"] }, regionRule: { mode: "global", label: "Global" }, sellingPriceLkr: 1740, pricingMode: "fixed", enabled: true, sortOrder: 20, createdAt: now, updatedAt: now },
  { id: "nfo_ml_86", productId: "nfp_mlbb", name: "86 Diamonds", kind: "topup", purchaseFields: [{ key: "user_id", label: "User ID", type: "text", required: true }, { key: "zone_id", label: "Zone ID", type: "text", required: true }], validation: { supported: true, mode: "supplier_preflight", fieldKeys: ["user_id", "zone_id"] }, regionRule: { mode: "global", label: "Global" }, sellingPriceLkr: 560, pricingMode: "fixed", enabled: true, sortOrder: 10, createdAt: now, updatedAt: now },
  { id: "nfo_steam_10", productId: "nfp_steam_gc", name: "Steam USD $10", kind: "gift_card", purchaseFields: [], validation: { supported: false, mode: "none", fieldKeys: [] }, regionRule: { mode: "named_region", label: "United States / USD" }, sellingPriceLkr: 3650, pricingMode: "fixed", enabled: true, sortOrder: 10, createdAt: now, updatedAt: now },
  { id: "nfo_steam_wallet", productId: "nfp_steam_wallet", name: "Steam Wallet", kind: "steam_wallet", purchaseFields: [{ key: "steam_login", label: "Steam username", type: "username", required: true, placeholder: "Your Steam login" }, { key: "currency", label: "Wallet currency", type: "select", required: true, options: [{ value: "USD", label: "USD" }, { value: "RUB", label: "RUB" }, { value: "UAH", label: "UAH" }, { value: "KZT", label: "KZT" }] }], validation: { supported: true, mode: "supplier_preflight", fieldKeys: ["steam_login"] }, regionRule: { mode: "global" }, pricingMode: "amount_based", minAmount: 5, maxAmount: 200, amountStep: 1, enabled: true, sortOrder: 10, createdAt: now, updatedAt: now },
  { id: "nfo_tg_stars", productId: "nfp_telegram", name: "Telegram Stars", kind: "telegram_stars", purchaseFields: [{ key: "telegram_username", label: "Telegram username", type: "username", required: true, placeholder: "@username" }], validation: { supported: false, mode: "none", fieldKeys: [] }, regionRule: { mode: "global" }, pricingMode: "amount_based", minAmount: 50, maxAmount: 10000, amountStep: 50, enabled: true, sortOrder: 10, createdAt: now, updatedAt: now },
  { id: "nfo_game_key", productId: "nfp_key", name: "Standard Edition · Steam · GLOBAL", kind: "game_key", purchaseFields: [], validation: { supported: false, mode: "none", fieldKeys: [] }, regionRule: { mode: "global", label: "GLOBAL" }, sellingPriceLkr: 6990, pricingMode: "fixed", enabled: true, sortOrder: 10, createdAt: now, updatedAt: now },
];

export const seedVNextMappings: SupplierOfferMapping[] = [
  { id: "map_pubg_60_fz", offerId: "nfo_pubg_60", supplierId: "sup_fazer", supplierKind: "topup", externalCategoryId: "cat_pubgm_1", externalOfferId: "offer_60uc", priority: 1, enabled: true, availability: availability(), supplierCost: 0.99, supplierCurrency: "USD", lastSyncedAt: now },
  { id: "map_pubg_60_b", offerId: "nfo_pubg_60", supplierId: "sup_backup", supplierKind: "topup", externalCategoryId: "pubg", externalOfferId: "pubg_60", priority: 2, enabled: false, availability: { ...availability(), state: "unknown" }, supplierCost: 1.04, supplierCurrency: "USD" },
  { id: "map_pubg_325_fz", offerId: "nfo_pubg_325", supplierId: "sup_fazer", supplierKind: "topup", externalCategoryId: "cat_pubgm_1", externalOfferId: "offer_325uc", priority: 1, enabled: true, availability: availability(), supplierCost: 4.48, supplierCurrency: "USD", lastSyncedAt: now },
  { id: "map_ml_86_fz", offerId: "nfo_ml_86", supplierId: "sup_fazer", supplierKind: "topup", externalCategoryId: "mlbb", externalOfferId: "ml_86", priority: 1, enabled: true, availability: availability(), supplierCost: 1.28, supplierCurrency: "USD", lastSyncedAt: now },
  { id: "map_steam_10_fz", offerId: "nfo_steam_10", supplierId: "sup_fazer", supplierKind: "gift_card", externalCategoryId: "gc_steam_1", externalOfferId: "card_10usd", priority: 1, enabled: true, availability: availability(100), supplierCost: 10.5, supplierCurrency: "USD", lastSyncedAt: now },
  { id: "map_steam_wallet_fz", offerId: "nfo_steam_wallet", supplierId: "sup_fazer", supplierKind: "steam_wallet", externalProductId: "steam-wallet", priority: 1, enabled: true, availability: availability(), supplierCost: 1, supplierCurrency: "USD", lastSyncedAt: now },
  { id: "map_tg_stars_fz", offerId: "nfo_tg_stars", supplierId: "sup_fazer", supplierKind: "telegram_stars", externalProductId: "telegram-stars", priority: 1, enabled: true, availability: availability(), supplierCost: 0.015, supplierCurrency: "USD", lastSyncedAt: now },
  { id: "map_key_fz", offerId: "nfo_game_key", supplierId: "sup_fazer", supplierKind: "game_key", externalProductId: "gk_example_1", externalOfferId: "key_sku_1", priority: 1, enabled: true, availability: availability(5), supplierCost: 19.99, supplierCurrency: "USD", lastSyncedAt: now },
];

function read<T>(key: string, seed: T) { return readDurableValue(key, seed); }
function write<T>(key: string, value: T) { const out = writeDurableValue(key, value); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:gaming-vnext", { detail: key })); return out; }

export const gamingVNextStore = {
  getProducts: () => read(KEYS.products, seedVNextProducts),
  getOffers: () => read(KEYS.offers, seedVNextOffers),
  getMappings: () => read(KEYS.mappings, seedVNextMappings),
  getOrders: () => read<GamingOrderVNext[]>(KEYS.orders, []),
  updateProduct(id: string, patch: Partial<NextFGamingProduct>) { const rows = this.getProducts().map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row); return write(KEYS.products, rows); },
  updateOffer(id: string, patch: Partial<NextFGamingOffer>) { const rows = this.getOffers().map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row); return write(KEYS.offers, rows); },
  updateMapping(id: string, patch: Partial<SupplierOfferMapping>) { const rows = this.getMappings().map((row) => row.id === id ? { ...row, ...patch } : row); return write(KEYS.mappings, rows); },
  addOrder(order: GamingOrderVNext) { return write(KEYS.orders, [order, ...this.getOrders()].slice(0, 200)); },
  upsertOrder(order: GamingOrderVNext) { const rows = this.getOrders(); const exists = rows.some((row) => row.id === order.id); return write(KEYS.orders, (exists ? rows.map((row) => row.id === order.id ? order : row) : [order, ...rows]).slice(0, 200)); },
  reset() { Object.values(KEYS).forEach(removeDurableValue); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:gaming-vnext", { detail: "reset" })); },
};

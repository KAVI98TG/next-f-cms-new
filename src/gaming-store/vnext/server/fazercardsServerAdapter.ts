import type { PurchaseFieldSchema, RegionRule, SupplierValidationResult } from "../types";
import type { SupplierAdapter, SupplierCatalogItem, SupplierOffer, SupplierOrderRequest, SupplierOrderResult, SupplierQuoteRequest, SupplierQuoteResult } from "../supplierAdapter";
import { FAZERCARDS_MANIFEST } from "../providers/fazercards";

/**
 * Trusted-runtime FazerCards adapter.
 * DO NOT import this module from browser UI. Instantiate it only in your API/server/worker.
 */
export class FazerCardsServerAdapter implements SupplierAdapter {
  readonly providerKey = "fazercards";
  readonly capabilities = FAZERCARDS_MANIFEST.capabilities;
  constructor(private readonly apiKey: string, private readonly baseUrl = FAZERCARDS_MANIFEST.baseUrl) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-API-Key": this.apiKey, ...(init.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({})) as { ok?: boolean; error?: string } & T;
    if (!response.ok || body.ok === false) throw new Error(body.error || `FazerCards request failed (${response.status})`);
    return body;
  }

  async listCatalog(kind: SupplierCatalogItem["kind"]): Promise<SupplierCatalogItem[]> {
    if (kind === "topup") {
      const data = await this.request<{ items: Array<{ category_id: string; name: string }> }>("/topups?limit=100");
      return data.items.map((row) => ({ externalCategoryId: row.category_id, name: row.name, kind }));
    }
    if (kind === "gift_card") {
      const data = await this.request<{ items: Array<{ category_id: string; name: string }> }>("/giftcards?limit=100");
      return data.items.map((row) => ({ externalCategoryId: row.category_id, name: row.name, kind }));
    }
    if (kind === "game_key") {
      const data = await this.request<{ items: Array<{ game_id: string; name: string; region?: string; platform?: string; region_restriction?: boolean }> }>("/gamekeys?limit=100");
      return data.items.map((row) => ({ externalCategoryId: row.game_id, name: row.name, kind, metadata: { region: row.region ?? null, platform: row.platform ?? null, regionRestriction: !!row.region_restriction } }));
    }
    if (kind === "manual_service") {
      const data = await this.request<{ items: Array<{ id: string; name: string; kind?: string; chat?: boolean }> }>("/manual-services");
      return data.items.map((row) => ({ externalCategoryId: row.id, name: row.name, kind, metadata: { providerKind: row.kind ?? null, chat: !!row.chat } }));
    }
    return [];
  }

  private fields(input: Array<{ key: string; label: string; type?: string }> = []): PurchaseFieldSchema[] {
    return input.map((field) => ({ key: field.key, label: field.label, required: true, type: field.type === "number" ? "number" : "text" }));
  }

  private region(label?: string): RegionRule { return label && label.toUpperCase() !== "GLOBAL" ? { mode: "named_region", label } : { mode: "global", label: label ?? "GLOBAL" }; }

  async listOffers(kind: SupplierOffer["kind"], externalCategoryId?: string): Promise<SupplierOffer[]> {
    if (kind === "topup" && externalCategoryId) {
      const data = await this.request<{ offers: Array<{ offer_id: string; name: string; price_usd: string }>; fields?: Array<{ key: string; label: string; type?: string }> }>(`/topups/offers?category_id=${encodeURIComponent(externalCategoryId)}`);
      return data.offers.map((row) => ({ externalCategoryId, externalOfferId: row.offer_id, name: row.name, kind, cost: Number(row.price_usd), currency: "USD", fields: this.fields(data.fields), regionRule: { mode: "global" }, availability: { state: "available", checkedAt: new Date().toISOString(), source: "supplier" } }));
    }
    if (kind === "gift_card" && externalCategoryId) {
      const data = await this.request<{ offers: Array<{ card_id: string; name: string; price_usd: string; stock?: number; min_order_quantity?: number; max_order_quantity?: number }> }>(`/giftcards/cards?category_id=${encodeURIComponent(externalCategoryId)}`);
      return data.offers.map((row) => ({ externalCategoryId, externalOfferId: row.card_id, name: row.name, kind, cost: Number(row.price_usd), currency: "USD", fields: [], regionRule: this.region(), availability: { state: (row.stock ?? 1) > 0 ? "available" : "unavailable", stock: row.stock, minQuantity: row.min_order_quantity, maxQuantity: row.max_order_quantity, checkedAt: new Date().toISOString(), source: "supplier" } }));
    }
    if (kind === "game_key" && externalCategoryId) {
      const data = await this.request<{ region?: string; keys: Array<{ key_id: string; name: string; price_usd: string; stock?: number; min_order_quantity?: number; max_order_quantity?: number }> }>(`/gamekeys/keys?game_id=${encodeURIComponent(externalCategoryId)}`);
      return data.keys.map((row) => ({ externalCategoryId, externalOfferId: row.key_id, name: row.name, kind, cost: Number(row.price_usd), currency: "USD", fields: [], regionRule: this.region(data.region), availability: { state: (row.stock ?? 1) > 0 ? "available" : "unavailable", stock: row.stock, minQuantity: row.min_order_quantity, maxQuantity: row.max_order_quantity, checkedAt: new Date().toISOString(), source: "supplier" } }));
    }
    return [];
  }

  async quote(input: SupplierQuoteRequest): Promise<SupplierQuoteResult> {
    if (input.kind === "telegram_stars") {
      const data = await this.request<{ price_per_star: string }>("/telegram/stars");
      return { cost: Number(data.price_per_star) * (input.requestedAmount ?? 0), currency: "USD" };
    }
    if (input.kind === "telegram_premium") {
      const data = await this.request<{ plans: Array<{ months: number; price_usd: string }> }>("/telegram/premium");
      const plan = data.plans.find((row) => row.months === input.requestedAmount); if (!plan) throw new Error("Unsupported Telegram Premium duration");
      return { cost: Number(plan.price_usd), currency: "USD" };
    }
    if (input.kind === "steam_wallet") return { cost: input.requestedAmount ?? 0, currency: "USD" };
    throw new Error("Use synchronized supplier offer cost for this product family.");
  }

  async validate(input: { externalCategoryId?: string; fields: Record<string, string> }): Promise<SupplierValidationResult> {
    if (!input.externalCategoryId) throw new Error("category_id is required for FazerCards validation");
    const data = await this.request<{ valid: boolean; player_name?: string; region?: string }>("/topups/validate-id", { method: "POST", body: JSON.stringify({ category_id: input.externalCategoryId, fields: input.fields }) });
    return { valid: !!data.valid, displayName: data.player_name, region: data.region };
  }

  async createOrder(input: SupplierOrderRequest): Promise<SupplierOrderResult> {
    const headers = { "Idempotency-Key": input.idempotencyKey };
    let path = ""; let body: Record<string, unknown> = {};
    if (input.kind === "topup") { path = "/topups/order"; body = { category_id: input.externalCategoryId, offer_id: input.externalOfferId, fields: input.fields }; }
    else if (input.kind === "gift_card") { path = "/giftcards/order"; body = { category_id: input.externalCategoryId, card_id: input.externalOfferId, quantity: input.quantity }; }
    else if (input.kind === "game_key") { path = "/gamekeys/order"; body = { game_id: input.externalProductId ?? input.externalCategoryId, key_id: input.externalOfferId, quantity: input.quantity }; }
    else if (input.kind === "steam_wallet") { path = "/steam-topup/order"; body = { steamLogin: input.fields.steam_login, currency: input.fields.currency, amount: input.requestedAmount }; }
    else if (input.kind === "steam_gift") { path = "/steam-gifts/order"; body = { invite_url: input.fields.invite_url, sub_id: Number(input.externalOfferId), app_id: Number(input.externalProductId), region: input.region }; }
    else if (input.kind === "telegram_stars") { path = "/telegram/stars/buy"; body = { telegram_username: input.fields.telegram_username, quantity: input.requestedAmount }; }
    else if (input.kind === "telegram_premium") { path = "/telegram/premium/buy"; body = { telegram_username: input.fields.telegram_username, months: input.requestedAmount }; }
    else if (input.kind === "manual_service") { path = "/manual-services/order"; body = { manual_service_id: input.externalCategoryId, product_id: input.externalOfferId, fields: input.fields }; }
    else throw new Error(`Unsupported FazerCards order kind: ${input.kind}`);
    const data = await this.request<{ order?: { id: string; status: string }; order_id?: string; status?: string }>(path, { method: "POST", headers, body: JSON.stringify(body) });
    const row = data.order ?? { id: data.order_id ?? "", status: data.status ?? "created" };
    return { supplierOrderId: row.id, status: row.status === "completed" ? "completed" : row.status === "failed" ? "failed" : row.status === "created" ? "created" : "processing" };
  }

  async getOrder(supplierOrderId: string): Promise<SupplierOrderResult> {
    const data = await this.request<{ order: { id: string; status: string; payload?: Record<string, unknown> } }>(`/orders/${encodeURIComponent(supplierOrderId)}`);
    return { supplierOrderId: data.order.id, status: data.order.status === "completed" ? "completed" : data.order.status === "failed" ? "failed" : data.order.status === "created" ? "created" : "processing" };
  }
}

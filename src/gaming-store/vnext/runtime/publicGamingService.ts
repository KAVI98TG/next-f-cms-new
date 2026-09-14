import type { PublicGamingBootstrap, PublicGamingCheckoutCreated, PublicGamingCheckoutRequest, PublicGamingOrderProjection, PublicGamingProductProjection, PublicGamingQuoteRequest, PublicGamingQuoteResponse, PublicGamingValidationRequest, PublicGamingValidationResponse } from "../publicContract";
import type { GamingOrderVNext, NextFGamingOffer } from "../types";
import { buildGamingQuote } from "./pricingEngine";
import { chooseSupplierMapping } from "./supplierRouter";
import { gamingVNextStore } from "./store";
import { assertLocalPrototype } from "../../../services/production/runtime";

const quotes = new Map<string, ReturnType<typeof buildGamingQuote>>();

function publicProjection(): PublicGamingProductProjection[] {
  const products = gamingVNextStore.getProducts().filter((p) => p.enabled);
  const offers = gamingVNextStore.getOffers();
  const mappings = gamingVNextStore.getMappings();
  return products.map((product) => ({
    id: product.id, slug: product.slug, name: product.name, brand: product.brand, kind: product.kind, shortDescription: product.shortDescription, artworkUrl: product.artworkUrl, featured: product.featured,
    offers: offers.filter((o) => o.productId === product.id && o.enabled).sort((a,b)=>a.sortOrder-b.sortOrder).map((offer) => {
      const mapping = chooseSupplierMapping(offer, mappings);
      return { id: offer.id, name: offer.name, kind: offer.kind, purchaseFields: offer.purchaseFields, regionRule: offer.regionRule, validationSupported: offer.validation.supported, availability: mapping ? "available" : "unavailable", sellingPriceLkr: offer.sellingPriceLkr, pricingMode: offer.pricingMode, minAmount: offer.minAmount, maxAmount: offer.maxAmount, amountStep: offer.amountStep, minQuantity: mapping?.availability.minQuantity, maxQuantity: mapping?.availability.maxQuantity };
    }),
  }));
}

function offerOrThrow(offerId: string): NextFGamingOffer { const offer = gamingVNextStore.getOffers().find((row) => row.id === offerId && row.enabled); if (!offer) throw new Error("Offer is not available"); return offer; }

export const localGamingPublicService = {
  async bootstrap(): Promise<PublicGamingBootstrap> { assertLocalPrototype("Gaming public storefront simulation"); const products = publicProjection(); return { storeName: "NEXT F GAMING", currency: "LKR", productKinds: [...new Set(products.map((p) => p.kind))], featuredProducts: products.filter((p) => p.featured) }; },
  async products(): Promise<PublicGamingProductProjection[]> { assertLocalPrototype("Gaming public storefront simulation"); return publicProjection(); },
  async product(slug: string) { assertLocalPrototype("Gaming public storefront simulation"); return publicProjection().find((row) => row.slug === slug); },
  async quote(input: PublicGamingQuoteRequest): Promise<PublicGamingQuoteResponse> {
    assertLocalPrototype("Gaming quote simulation");
    const offer = offerOrThrow(input.offerId); const mapping = chooseSupplierMapping(offer, gamingVNextStore.getMappings());
    if (!mapping) return { quoteId: "", offerId: offer.id, quantity: input.quantity ?? 1, sellingPriceLkr: 0, expiresAt: new Date().toISOString(), available: false, message: "This option is temporarily unavailable." };
    const quantity = Math.max(mapping.availability.minQuantity ?? 1, input.quantity ?? 1);
    if (offer.pricingMode === "amount_based") { const amount = input.requestedAmount ?? offer.minAmount; if (!amount || (offer.minAmount && amount < offer.minAmount) || (offer.maxAmount && amount > offer.maxAmount)) throw new Error("Enter an amount within the supported range."); }
    const quote = buildGamingQuote({ offer, mapping, quantity, requestedAmount: input.requestedAmount }); quotes.set(quote.id, quote);
    return { quoteId: quote.id, offerId: offer.id, quantity, sellingPriceLkr: quote.sellingPriceLkr, expiresAt: quote.expiresAt, available: true };
  },
  async validate(input: PublicGamingValidationRequest): Promise<PublicGamingValidationResponse> {
    assertLocalPrototype("Gaming validation simulation");
    const offer = offerOrThrow(input.offerId); if (!offer.validation.supported) return { valid: true };
    const missing = offer.validation.fieldKeys.find((key) => !input.fields[key]?.trim()); if (missing) return { valid: false, message: "Complete all account fields before validation." };
    if (offer.kind === "steam_wallet") return { valid: !input.fields.steam_login.toLowerCase().includes("invalid"), displayName: input.fields.steam_login, message: input.fields.steam_login.toLowerCase().includes("invalid") ? "This Steam account is not eligible for wallet refill." : "Steam account can be refilled." };
    const primary = input.fields.player_id || input.fields.user_id || Object.values(input.fields)[0];
    return { valid: !String(primary).endsWith("000"), displayName: String(primary).endsWith("000") ? undefined : `PLAYER-${String(primary).slice(-4)}`, region: "Asia", message: String(primary).endsWith("000") ? "Supplier could not validate this account." : "Account verified." };
  },
  async checkout(input: PublicGamingCheckoutRequest): Promise<PublicGamingCheckoutCreated> {
    assertLocalPrototype("Gaming checkout simulation");
    const offer = offerOrThrow(input.offerId); const quote = quotes.get(input.quoteId); if (!quote || quote.offerId !== offer.id || Date.parse(quote.expiresAt) < Date.now()) throw new Error("Your quote expired. Refresh the price and try again.");
    const product = gamingVNextStore.getProducts().find((p) => p.id === offer.productId)!; const mapping = gamingVNextStore.getMappings().find((m) => m.id === quote.mappingId)!;
    const order: GamingOrderVNext = { id: `gvo_${crypto.randomUUID()}`, number: `NG-${String(Date.now()).slice(-7)}`, productId: product.id, offerId: offer.id, mappingId: mapping.id, supplierId: mapping.supplierId, status: "payment_pending", purchaseFields: input.fields, quantity: input.quantity ?? quote.quantity, requestedAmount: input.requestedAmount, quote, customerPaid: false, supplierCharged: false, deliverables: [], idempotencyKey: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    gamingVNextStore.addOrder(order); return { orderId: order.id, orderNumber: order.number, status: "payment_pending", amountLkr: quote.sellingPriceLkr };
  },
  async simulatePayment(orderId: string) {
    assertLocalPrototype("Gaming payment and supplier fulfillment simulation");
    const orders = gamingVNextStore.getOrders(); const current = orders.find((o) => o.id === orderId); if (!current) throw new Error("Order not found"); const offer = offerOrThrow(current.offerId);
    const deliverables = offer.kind === "gift_card" || offer.kind === "game_key" ? [{ type: "code" as const, label: offer.kind === "gift_card" ? "Digital code" : "Activation key", value: `NEXTF-${crypto.randomUUID().slice(0,8).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}` }] : [{ type: "topup_confirmation" as const, label: "Fulfillment", value: "Delivered successfully" }];
    const done: GamingOrderVNext = { ...current, status: "completed", customerPaid: true, supplierCharged: true, supplierOrderId: `demo-${crypto.randomUUID().slice(0,8)}`, deliverables, updatedAt: new Date().toISOString(), completedAt: new Date().toISOString() };
    gamingVNextStore.upsertOrder(done); return done;
  },
  async order(orderId: string): Promise<PublicGamingOrderProjection | undefined> { assertLocalPrototype("Gaming order simulation"); const row = gamingVNextStore.getOrders().find((o) => o.id === orderId); if (!row) return; const product = gamingVNextStore.getProducts().find((p)=>p.id===row.productId)!; const offer = gamingVNextStore.getOffers().find((o)=>o.id===row.offerId)!; return { orderId: row.id, orderNumber: row.number, productName: product.name, offerName: offer.name, status: row.status as PublicGamingOrderProjection["status"], amountLkr: row.quote.sellingPriceLkr, validationDisplayName: row.validation?.displayName, completedAt: row.completedAt, deliverables: row.deliverables, failureMessage: row.failureReason }; },
};

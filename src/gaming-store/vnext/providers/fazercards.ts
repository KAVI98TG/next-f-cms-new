import type { SupplierAdapterManifest } from "../supplierAdapter";

/**
 * FazerCards provider manifest verified against the public v2 API documentation.
 *
 * This file intentionally contains no network client and no API key. The actual
 * adapter must run in a server/worker boundary so X-API-Key is never exposed to
 * the CMS/public browser bundle.
 */
export const FAZERCARDS_MANIFEST: SupplierAdapterManifest = {
  providerKey: "fazercards",
  displayName: "FazerCards",
  baseUrl: "https://api.fzr.cards/api/v2",
  docsUrl: "https://api.fzr.cards/public/docs",
  auth: {
    serverSideOnly: true,
    primaryHeader: "X-API-Key",
    alternative: "Authorization: Bearer <key>",
  },
  capabilities: {
    productKinds: [
      "topup",
      "gift_card",
      "game_key",
      "steam_wallet",
      "steam_gift",
      "telegram_stars",
      "telegram_premium",
      "manual_service",
    ],
    accountValidation: true,
    inventoryCounts: true,
    quantityRules: true,
    regionRules: true,
    synchronousCodeDelivery: true,
    webhookFulfillment: true,
    manualChat: true,
    idempotentOrders: true,
  },
  endpoints: {
    account: { method: "GET", path: "/me", purpose: "Reseller account/plan metadata" },
    balance: { method: "GET", path: "/balance", purpose: "Supplier balance" },
    orders: { method: "GET", path: "/orders", purpose: "Supplier order history" },
    orderStatus: { method: "GET", path: "/orders/{id}", purpose: "Order reconciliation/status polling" },

    topupCategories: { method: "GET", path: "/topups", purpose: "Game top-up categories" },
    topupOffers: { method: "GET", path: "/topups/offers?category_id={categoryId}", purpose: "Top-up offers and dynamic buyer fields" },
    topupValidationCapabilities: { method: "GET", path: "/topups/validate-id", purpose: "Games/fields supporting player validation" },
    topupValidate: { method: "POST", path: "/topups/validate-id", purpose: "Validate player/account before charge" },
    topupOrder: { method: "POST", path: "/topups/order", purpose: "Create top-up order" },

    giftCardCategories: { method: "GET", path: "/giftcards", purpose: "Gift-card categories" },
    giftCardOffers: { method: "GET", path: "/giftcards/cards?category_id={categoryId}", purpose: "Denominations, stock and quantity limits" },
    giftCardOrder: { method: "POST", path: "/giftcards/order", purpose: "Create gift-card order" },

    gameKeys: { method: "GET", path: "/gamekeys", purpose: "Game-key catalog with platform/region metadata" },
    gameKeyOffers: { method: "GET", path: "/gamekeys/keys?game_id={gameId}", purpose: "Game-key SKUs, stock and quantity limits" },
    gameKeyRegionRestriction: { method: "GET", path: "/gamekeys/region-restriction?game_id={gameId}", purpose: "Country compatibility rules" },
    gameKeyOrder: { method: "POST", path: "/gamekeys/order", purpose: "Create game-key order" },

    steamWalletRates: { method: "GET", path: "/steam-topup/rates", purpose: "Steam wallet exchange rates" },
    steamWalletCheckLogin: { method: "POST", path: "/steam-topup/check-login", purpose: "Check Steam login eligibility" },
    steamWalletOrder: { method: "POST", path: "/steam-topup/order", purpose: "Create Steam wallet top-up" },
    steamGiftGames: { method: "GET", path: "/steam-gifts/games", purpose: "Steam gift game catalog" },
    steamGiftOffers: { method: "GET", path: "/steam-gifts/games/{appid}", purpose: "Steam gift packages and regional prices" },
    steamGiftOrder: { method: "POST", path: "/steam-gifts/order", purpose: "Create Steam gift order using invite URL" },

    telegramStarsQuote: { method: "GET", path: "/telegram/stars", purpose: "Stars unit price and min/max quantity" },
    telegramStarsOrder: { method: "POST", path: "/telegram/stars/buy", purpose: "Buy Telegram Stars" },
    telegramPremiumQuote: { method: "GET", path: "/telegram/premium", purpose: "Premium plan prices" },
    telegramPremiumOrder: { method: "POST", path: "/telegram/premium/buy", purpose: "Buy Telegram Premium" },

    manualServices: { method: "GET", path: "/manual-services", purpose: "Operator-fulfilled service categories" },
    manualServiceOffers: { method: "GET", path: "/manual-services/{manualServiceId}/offers", purpose: "Manual-service offers and delivery expectations" },
    manualServiceOrder: { method: "POST", path: "/manual-services/order", purpose: "Create manual-service order" },
    manualServiceChat: { method: "GET", path: "/manual-services/orders/{orderId}/chat", purpose: "Read manual-service order chat" },
  },
  operationalNotes: [
    "Keep supplier credentials server-side only; the public storefront and CMS browser must call NEXT F backend APIs.",
    "Use an Idempotency-Key for supplier order creation so retries do not double-charge or double-fulfill.",
    "Cache catalog reads locally and refresh on a controlled schedule instead of fetching supplier catalogs per page view.",
    "Validate supported player/account identifiers before charging customers whenever possible.",
    "Treat supplier webhooks as fulfillment signals and reconcile terminal state against supplier order status.",
    "Never emit delivered codes, PINs, serials or supplier credentials into analytics or plain logs.",
  ],
};

# NEXT F Gaming Store vNext — Integrated implementation

This increment combines the runtime foundation, CMS supplier-mapping workspace and public storefront prototype.

## Runtime foundation

- Canonical NEXT F Product → Offer → SupplierOfferMapping model.
- Priority/fallback supplier routing independent of the public catalog.
- Quote engine for fixed, supplier-quoted and amount-based products.
- Structured purchase-field schema and preflight validation capability.
- Digital deliverables for codes, PINs, serials, redemption URLs and top-up confirmations.
- Trusted-runtime `FazerCardsServerAdapter` matching the documented API v2 families.
- Provider webhook normalization boundary.

The browser must never instantiate `FazerCardsServerAdapter`. API keys belong in a trusted NEXT F API/server/worker.

## CMS workspace

`/gaming-store/catalog-vnext`

The additive page manages:

- NEXT F-owned public product identity and merchandising.
- Retail offers and pricing mode.
- Visibility and featured state.
- Multiple supplier routes per offer.
- Primary/fallback priority and supplier cost.
- Public storefront preview.

The existing v0.5 Gaming Store remains available during migration.

## Public storefront prototype

`/gaming`

The storefront is digital-only and renders purchase behavior from the canonical offer contract:

- top-up customer fields and account validation,
- gift-card quantity/stock behavior,
- game-key region-aware delivery,
- Steam wallet username + custom amount,
- Telegram Stars custom quantity,
- digital order fulfillment and secure-delivery presentation.

The local prototype simulates payment and fulfillment. Production must replace `localGamingPublicService` with the NEXT F backend public gaming API contract and keep supplier credentials server-side.

## Production cut-over sequence

1. Persist vNext products/offers/mappings in the production database.
2. Run FazerCards adapter in the trusted backend.
3. Implement scheduled catalog synchronization with 5–15 minute cache/refresh windows.
4. Add supplier webhooks + reconciliation.
5. Expose only `gaming.*` public operations to the storefront.
6. Connect real payment confirmation before supplier order creation.
7. Encrypt/restrict digital deliverables and prevent codes/PINs from analytics/logging.
8. Add Supplier B/C by implementing the same `SupplierAdapter` interface and mapping offers in CMS.

# NEXT F Gaming Store — Supplier-Agnostic vNext Patch

## Purpose

This patch adds the canonical domain contract required for a digital gaming storefront where NEXT F owns the customer experience and one or more suppliers provide inventory/fulfillment behind the scenes.

It is intentionally additive. The existing `src/gaming-store/data/*` v0.5 repositories remain unchanged so parallel CMS work can continue and this model can be migrated incrementally.

## Correct boundary

```text
Public NEXT F Gaming Site
        |
        v
NEXT F Gaming Public API
        |
        v
NEXT F catalog + pricing + validation + order engine
        |
        v
Supplier routing/adapters
   |         |         |
FazerCards Supplier B Supplier C
```

The browser must never receive a supplier API key and must never call a supplier order endpoint directly.

## Canonical concepts

- `NextFGamingProduct`: NEXT F-owned merchandising identity, slug, artwork, SEO and public content.
- `NextFGamingOffer`: customer-purchasable option such as `60 UC`, `$10 Steam`, `3 months Premium`.
- `SupplierOfferMapping`: many supplier mappings can back one NEXT F offer; this enables primary/fallback routing.
- `PurchaseFieldSchema`: structured dynamic customer input (`player_id`, `zone_id`, username, invite URL, etc.).
- `AvailabilitySnapshot`: stock, quantity constraints and freshness instead of a single boolean.
- `RegionRule`: global, named-region, allow-list or block-list compatibility.
- `GamingQuote`: server-generated retail quote that snapshots supplier cost, FX, gateway fee and margin.
- `DigitalDeliverable`: secure code/PIN/serial/redemption URL/top-up confirmation after fulfillment.
- `SupplierAdapter`: trusted server-side translation boundary between supplier-specific APIs and NEXT F's canonical model.

## FazerCards mapping

The included provider manifest models the public v2 endpoint families for:

- game top-ups + dynamic buyer fields + supported player validation
- gift cards + stock and quantity limits
- game keys + platform/region/country restrictions
- Steam wallet + login eligibility + live rates
- Steam gifts + invite URL + regional package pricing
- Telegram Stars + variable quantity pricing
- Telegram Premium + month plans
- manual/operator services + expected delivery + chat capability

The manifest intentionally contains no secret and performs no browser fetches.

## Migration sequence

1. Keep the current v0.5 UI/repositories live.
2. Add durable vNext repositories/tables for Product, Offer and SupplierOfferMapping.
3. Import/sync FazerCards through a server-side adapter into supplier mappings.
4. Build CMS screens to map supplier offers to NEXT F offers and configure priority/fallback routing.
5. Implement server-side quote + account-validation operations.
6. Implement NEXT F Gaming public API projections; supplier identity stays private.
7. Connect the public storefront to the NEXT F API.
8. Migrate order execution to the routing/adapter layer and webhook reconciliation.
9. Only after parity, retire legacy `supplierProductId`/single-supplier assumptions.

## Merge-safety

This patch avoids modifying existing v0.5 Gaming Store files. It is safe to cherry-pick/apply while another branch is changing the current CMS, subject to normal review.

# CMS v1.0.11 — Gaming Promotions & Campaigns (P4 RC)

## Scope

The CMS now includes `Gaming Store → Promotions` as the staff control plane for the canonical Gaming promotion engine.

Staff with `gaming.read` can view campaign state and aggregate usage. Campaign create/update requires `gaming.products.manage` and a configured server-side commerce bridge.

Supported controls include:

- draft / active / paused / archived state;
- coupon / automatic application;
- coupon code;
- percentage / fixed-LKR discount;
- minimum spend;
- global redemption limit;
- per-customer redemption limit;
- start/end window;
- product IDs and offer IDs;
- campaign margin floor.

The CMS also shows current redemptions, discount granted and discounted sales derived from canonical orders in the shared D1.

## Security boundary

Campaign writes use the dedicated `GAMING_CMS_COMMERCE_TOKEN` from the CMS Worker to the Gaming API. The browser never receives this credential.

This token is intentionally separate from `GAMING_CMS_OPERATIONS_TOKEN`; campaign merchandising authority does not grant payment verification, fulfillment retry, refunds, risk decisions, notification retry, supplier configuration or catalog synchronization.

The Gaming API remains the owner of campaign validation, pricing safety, redemption enforcement and immutable order snapshots. The CMS does not duplicate those rules.

## Deployment

Set the same strong random `GAMING_CMS_COMMERCE_TOKEN` as a Worker secret on both the Gaming API Worker and CMS API Worker. Do not reuse another platform secret.

Deploy Gaming API v1.8.8 before CMS API/frontend v1.0.11 so the campaign command boundary exists before the CMS UI is enabled.

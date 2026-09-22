# Gaming Integration Handoff

## Starting point

The CMS V1 production boundary is the baseline for the Gaming site. Do not build the Gaming storefront against local fixture assumptions. Start G0 by resolving the canonical public/staff contracts against `contracts.nextf.lk` and the deployed CMS API.

## Existing CMS Gaming state domains

The CMS already contains Gaming administration for products, orders, customers, suppliers, pricing/finance, support and settings under `nextf.v0.5.gaming.*`. Staff access remains Cloudflare Access protected and must never be consumed directly by an anonymous storefront.

## Required G0 decision before storefront implementation

Define and approve a dedicated public Gaming API contract for:

- catalogue/products and categories;
- pricing and availability/stock semantics;
- public product media;
- cart/checkout command model;
- customer/order creation;
- payment provider handoff and verified callbacks;
- delivery/fulfilment state;
- customer order-status lookup;
- idempotency, abuse protection and public error envelopes.

Do not expose generic `staff.state.*` operations to the Gaming site.

## Security baseline inherited from CMS V1

- staff routes: Cloudflare Access JWT + exact D1 staff binding;
- public mutations: path-scoped Access bypass, origin allowlist, rate limiting, Turnstile where appropriate, durable D1 idempotency and Queue handoff;
- tenant/workspace operations: organization + workspace scope and fail-closed mismatch denial;
- secrets: Workers Secrets only, never Site Manifest, frontend bundle or D1 public projection;
- contracts: stable Registry/Site Manifest 1.0.0 validation before managed-site activation.

## First managed-site proof

If Gaming is registered as the first managed Site Connection, V1's `managed_site_adapter` N/A status must be reopened. Capture a real `nextf.site.json` plus real revision/apply/publish receipt and rerun production acceptance with those evidence URLs.

## P4 canonical support control plane

Gaming support no longer relies on the legacy `nextf.v0.5.gaming.support` local prototype UI for live operations. Canonical records now live in shared D1 under `gaming.support.case`, `gaming.support.message` and `gaming.support.evidence` and are surfaced through the CMS staff API.

Support reads and mutations require the existing `gaming.orders.manage` permission. CMS mutations cross the server-only Gaming boundary through the dedicated `GAMING_CMS_SUPPORT_TOKEN`; do not substitute the broader operations, commerce, supplier or finance credentials.

Customer-facing case messages emit Gaming commerce events and are delivered by the existing notification outbox. Binary evidence upload is intentionally deferred until the governed R2 media/evidence service is implemented.

## Current verified-purchase Reviews control plane (CMS v1.0.55)

CMS review listing and moderation cross the server-only Gaming API boundary with `GAMING_CMS_REVIEWS_TOKEN` on both Workers. This dedicated credential was introduced in CMS v1.0.52 / Gaming API v1.8.28; it does not authorize promotions, payments or other operations. v1.0.53 and v1.0.54 changed only the Reviews frontend; v1.0.55 is a CMS-wide UI clarity release and does not change the review API boundary. Do not follow the historical v1.0.50 commerce-token rollout instructions when deploying the current release. See `V1.0.52-REVIEWS-BRIDGE-RECOVERY.md`, `V1.0.54-REVIEWS-LAYOUT-CONSISTENCY.md` and `V1.0.55-CMS-UI-CLARITY-SYSTEM.md`.

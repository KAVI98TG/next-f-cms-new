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

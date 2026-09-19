# NEXT F CMS V1.0.32

Production CMS for NEXT F Platform, Digital, Website Platform, Gaming Store administration and Software operations.

## Production endpoints

- CMS: `https://cms.nextf.lk`
- API: `https://cms-api.nextf.lk`
- Contracts: `https://contracts.nextf.lk`
- Customer Workspace: `https://workspace.nextf.lk`

## Local setup

```powershell
npm ci
npm run dev
```

## Production acceptance

The V1 package consolidates the remaining production checks into one guarded runner:

Validate the package first:

```powershell
npm ci
npm run acceptance:source
```

After deploying this V1 source, run the deployed production acceptance:

```powershell
npm run acceptance:production:final
```

The production runner repeats the build/source gates and then executes the deployed runtime acceptance. Evidence is written under `artifacts/production-acceptance/`.

A fresh real Turnstile token is required for the public idempotency runtime proof. The runner deliberately refuses to manufacture or bypass that evidence.

Source-only package validation is available with:

```powershell
npm run acceptance:source
```

## Production deployment

```powershell
$env:VITE_NEXTF_ENVIRONMENT = "production"
$env:VITE_NEXTF_BACKEND_MODE = "production-api"
$env:VITE_NEXTF_API_BASE_URL = "https://cms-api.nextf.lk"
npm run build
npx wrangler@latest deploy --config infrastructure/cloudflare/wrangler.production.jsonc
npx wrangler@latest pages deploy dist --project-name nextf-cms --branch main
npm run acceptance:production:final
```

`infrastructure/cloudflare/wrangler.production.jsonc` contains non-secret production identifiers only. `TURNSTILE_SECRET_KEY`, `SERVICE_CREDENTIAL_SECRET`, `NEXTF_MAIN_SITE_INGEST_TOKEN`, `GAMING_CMS_OPERATIONS_TOKEN`, `GAMING_CMS_COMMERCE_TOKEN`, `GAMING_CMS_SUPPORT_TOKEN`, `GAMING_CMS_SUPPLIER_FUNDING_TOKEN`, `NEXTF_MEDIA_R2_ACCOUNT_ID`, `NEXTF_MEDIA_R2_ACCESS_KEY_ID` and `NEXTF_MEDIA_R2_SECRET_ACCESS_KEY` remain Cloudflare Worker Secrets and must never be committed.

## Authentication

Production is fail closed. The login/bootstrap UI verifies Cloudflare Access and the server-side staff binding before durable CMS data is initialized. `/auth/complete` is the API-host login completion route used when the API Access cookie needs authorization.

## Release documentation

- `docs/V1.0.0-PRODUCTION-RELEASE.md`
- `docs/V1.0.0-FINAL-DEPLOYMENT.md`
- `docs/GAMING-INTEGRATION-HANDOFF.md`
- `docs/V1.0.0-NEXTF-MAIN-SITE-PROJECT-REQUEST-INGESTION.md`
- `PROJECT-STATUS.md`

## V1.0.1 Gaming control plane

Production Gaming pricing and FazerCards non-secret supplier controls now live in the CMS. `Gaming Store → Pricing & Safeguards` controls the live retail policy; `Gaming Store → Suppliers` controls catalog families, publishing, health, preview and sync. Supplier API keys remain encrypted Worker secrets and are never exposed to the CMS browser.

## v1.0.4 Gaming Storefront Merchandising

Gaming Store now includes a dedicated Storefront area for homepage hero, merchandising rails, game-family artwork and CMS-controlled product-family presentation. See `docs/GAMING-STOREFRONT-MERCHANDISING-v1.0.4.md`.

## v1.0.5 Gaming Live Operations Foundation (P4 RC)

The CMS now has a staff-authorized `Gaming Store → Live Operations` read plane over the shared production D1. Orders, finance-gated payment proofs, permission-gated fulfillment jobs and the Gaming audit timeline are available without exposing Gaming admin tokens to the browser. New Gaming orders can also surface quote-time routing/economics snapshots produced by Gaming Store v1.8.2. See `docs/GAMING-LIVE-OPERATIONS-P4-v1.0.5.md`.


## v1.0.6 Gaming Live Operations Actions (P4 RC)

`Gaming Store → Live Operations` now supports staff-authorized payment verification/rejection and fulfillment retry through the existing Gaming backend. The CMS Worker uses the dedicated least-privilege `GAMING_CMS_OPERATIONS_TOKEN`; broad Gaming payment/supplier admin tokens are not copied into the CMS. Canonical Gaming audit events record the authenticated staff principal when the bridge is used. See `docs/GAMING-LIVE-ACTIONS-P4-v1.0.6.md`.


## v1.0.7 Gaming Refunds + Finance Operations (P4 RC)

`Gaming Store → Live Operations` now manages a durable refund lifecycle through the existing least-privilege server bridge, including partial refunds, payout evidence and supplier/gateway recoveries. The Finance page now reads live shared-D1 order/refund economics and exports reconciliation CSV data. Refund documents and financial evidence remain gated by `gaming.finance.manage`. See `docs/GAMING-REFUND-FINANCE-P4-v1.0.7.md`.


## v1.0.8 Gaming Risk + Abuse Operations (P4 RC)

`Gaming Store → Live Operations` now includes an order-manager-only Risk queue with safe risk scores, severity, signal summaries, account-age/order-count context and release/keep-hold review actions. The Gaming API remains the owner of scoring and fulfillment gating; keyed network/purchase-target fingerprints are never projected to the CMS browser. See `docs/GAMING-RISK-OPERATIONS-P4-v1.0.8.md`.


## v1.0.9 Gaming Transactional Notifications (P4 RC)

`Gaming Store → Live Operations` now includes a Notifications queue with safe outbox state, delivery health and retry controls for non-sent messages. The Gaming API remains the owner of event consumption and email-provider delivery; provider credentials never enter the CMS/browser. See `docs/GAMING-TRANSACTIONAL-NOTIFICATIONS-P4-v1.0.9.md`.

## v1.0.10 Gaming Commerce Analytics (P4 RC)

Gaming now has a dedicated Commerce Analytics surface at `/gaming-store/analytics`, derived from the shared immutable commerce event stream and canonical order/refund state. It adds bounded funnel conversion, product/supplier performance, operational health and permission-gated finance estimates with an explicit early-funnel instrumentation coverage cutover. See `docs/GAMING-COMMERCE-ANALYTICS-P4-v1.0.10.md`.

## v1.0.11 Gaming Promotions & Campaigns (P4 RC)

`Gaming Store → Promotions` now manages canonical coupon and automatic campaigns through a dedicated least-privilege commerce bridge. Staff can configure schedules, scope, redemption limits and margin floors while the Gaming API remains the owner of price safety and redemption enforcement. See `docs/GAMING-PROMOTIONS-P4-v1.0.11.md`.

## v1.0.12 Gaming Support Cases & Order Disputes (P4 RC)

`/gaming-store/support` now uses canonical shared-D1 support cases instead of the legacy local prototype. Staff with `gaming.orders.manage` can create and manage cases, track SLA, assign to self, add internal notes, send customer updates through the commerce notification outbox and retain safe evidence references. The CMS Worker uses the dedicated `GAMING_CMS_SUPPORT_TOKEN`; browser code never receives it. See `docs/V1.0.12-GAMING-SUPPORT-P4.md`.

## v1.0.13 NEXT F Media Service + Cloudflare R2 (P4 RC)

Gaming merchandising and Support evidence now use a governed NEXT F Media boundary backed by the private `nextf-media-production` R2 bucket. Public storefront artwork is served through `https://media.nextf.lk/a/<assetId>`, while private Support evidence remains behind authenticated CMS API access. Direct browser uploads use short-lived presigned staging URLs and are validated/promoted server-side before use. See `docs/V1.0.13-NEXTF-MEDIA-R2-P4.md`.


## v1.0.14 Production UI hardening (P4 RC)

Storefront Merchandising now keeps rich media fields and paired CTA controls aligned, and top-level subsection headers receive consistent spacing after cards. The CMS also ships the canonical non-secret `.env.production` so `npm run deploy` cannot silently rebuild the production frontend in local-prototype mode. See `docs/V1.0.14-PRODUCTION-UI-HARDENING-P4.md`.


## v1.0.32 NEXT F Checkout Payments Control Center (P4 RC)

`Platform → Payments` now operates the shared NEXT F Checkout control plane: provider configuration, business registry, market/currency availability, transaction/webhook/audit visibility and a separate write-only provider-secret boundary. PayPal/PayHere configuration stays server-side; Gaming and other NEXT F businesses consume normalized Checkout contracts instead of provider-specific browser integrations. See `docs/V1.0.32-NEXTF-CHECKOUT-P4.md`.


## v1.0.33 FazerCards payment safety hardening

The supplier-funding payment view now mirrors the provider-critical payment semantics: exact arrival amount, separate network-fee warning, local address QR, live expiry countdown and expiry lock. Exact provider decimal strings are preserved without USD reformatting. See `docs/V1.0.33-FAZERCARDS-PAYMENT-SAFETY-P4.md`.

## v1.0.32 FazerCards supplier funding

`Gaming Store → Suppliers → FazerCards` now exposes live provider balance, dynamic funding methods/limits, user-authorized Binance Pay verification and recent funding intents through the existing CMS → Gaming API control plane. Funding requires both `gaming.suppliers.manage` and `gaming.finance.manage`; `FAZERCARDS_API_KEY` remains exclusively on the Gaming API Worker. Configure the dedicated `GAMING_CMS_SUPPLIER_FUNDING_TOKEN` on both Workers. See `docs/V1.0.32-FAZERCARDS-FUNDING-P4.md`.

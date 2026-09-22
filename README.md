# NEXT F CMS V1.0.59

Production CMS for NEXT F Platform, Digital, Website Platform, Gaming Store administration and Software operations.

Version **v1.0.59** is built from canonical **v1.0.57** and is distributed as a non-canonical candidate. `RELEASE-STATE.json` is the status authority: `npm run release:finalize` changes it to canonical only after the full static regression suite, release gate, frontend build and Worker/API typecheck pass. `FULL-RELEASE-NOTES.md` and the versioned files in `docs/` describe the release history.

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

Run `npm run release:finalize` before publishing. It runs the full static regression suite, release gate, frontend build and Worker/API typecheck, then marks the release manifest canonical only after they pass. For a Pages-only UI release such as v1.0.59, deploy `dist` to `nextf-cms` on `main`; do not redeploy the API Worker unless its code or bindings changed. The full API-plus-Pages sequence is:

```powershell
$env:VITE_NEXTF_ENVIRONMENT = "production"
$env:VITE_NEXTF_BACKEND_MODE = "production-api"
$env:VITE_NEXTF_API_BASE_URL = "https://cms-api.nextf.lk"
npm run build
npx wrangler@latest deploy --config infrastructure/cloudflare/wrangler.production.jsonc
npx wrangler@latest pages deploy dist --project-name nextf-cms --branch main
npm run acceptance:production:final
```

`infrastructure/cloudflare/wrangler.production.jsonc` contains non-secret production identifiers only. `TURNSTILE_SECRET_KEY`, `SERVICE_CREDENTIAL_SECRET`, `NEXTF_MAIN_SITE_INGEST_TOKEN`, `GAMING_CMS_OPERATIONS_TOKEN`, `GAMING_CMS_COMMERCE_TOKEN`, `GAMING_CMS_REVIEWS_TOKEN`, `GAMING_CMS_SUPPORT_TOKEN`, `GAMING_CMS_SUPPLIER_FUNDING_TOKEN`, `NEXTF_MEDIA_R2_ACCOUNT_ID`, `NEXTF_MEDIA_R2_ACCESS_KEY_ID` and `NEXTF_MEDIA_R2_SECRET_ACCESS_KEY` remain Cloudflare Worker Secrets and must never be committed.

## Authentication

Production is fail closed. The login/bootstrap UI verifies Cloudflare Access and the server-side staff binding before durable CMS data is initialized. `/auth/complete` is the API-host login completion route used when the API Access cookie needs authorization.

## Release documentation

- `docs/V1.0.0-PRODUCTION-RELEASE.md`
- `docs/V1.0.0-FINAL-DEPLOYMENT.md`
- `docs/GAMING-INTEGRATION-HANDOFF.md`
- `docs/V1.0.52-REVIEWS-BRIDGE-RECOVERY.md`
- `docs/V1.0.53-REVIEWS-WORKSPACE-UI.md`
- `docs/V1.0.59-GAMING-UI-CLARITY-BUILD-FIX.md`
- `docs/V1.0.57-SUMMARY-CARD-CLEANUP.md`
- `docs/V1.0.56-METRIC-CARD-CLEANUP.md`
- `docs/V1.0.55-CMS-UI-CLARITY-SYSTEM.md`
- `docs/V1.0.55-UI-INSPECTION-AUDIT.md`
- `docs/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`
- `docs/V1.0.54-REVIEWS-LAYOUT-CONSISTENCY.md`
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

## v1.0.46 Media WebCrypto type fix

The Media AWS SigV4 HMAC helper now copies key bytes into a guaranteed `ArrayBuffer` before WebCrypto `importKey()`, resolving the TypeScript 5.8 `ArrayBufferLike` / `SharedArrayBuffer` overload error without changing signing behavior. CMS-only hotfix; no D1 migration.

## v1.0.47 storefront carousel + verified reviews
Adds mixed image/video hero merchandising, bounded family artwork scrolling, and production customer-review moderation with automatic approved publication. No D1 migration.

## v1.0.48 global overlay focus stability

Fixed the shared CMS Modal/Drawer focus lifecycle so controlled-input re-renders no longer move keyboard focus to the close button. Initial focus now prefers form controls, close buttons are non-submit controls, and Escape/focus trapping continue to use the latest close callback without restarting the overlay effect. Frontend-only; no D1 migration or API deployment. See `docs/V1.0.48-GLOBAL-OVERLAY-FOCUS-STABILITY.md`.

## v1.0.49 review UI build fix

Fixed the customer-review moderation page to use the shared `ToastInput.description` and `SectionHeader.action` contracts. This removes the frontend TypeScript build failure while preserving the v1.0.48 global overlay focus-stability fix and the existing review workflow. Frontend-only; no D1 migration or API deployment. See `docs/V1.0.49-REVIEW-UI-BUILD-FIX.md`.

## v1.0.50 review bridge + non-modal moderation

At the time, this release moved customer-review moderation onto the Gaming commerce bridge, removed the review rejection modal, and replaced the status select with explicit segmented controls. Gaming v1.8.25 provided backwards-compatible operations/commerce auth during rollout. The current bridge is the dedicated Reviews credential introduced in v1.0.52. No D1 migration. See `docs/V1.0.50-REVIEW-BRIDGE-NONMODAL.md`.

## v1.0.51 continuity + binding hardening

Built forward from v1.0.50. Adds the checked-in NEXT F continuity rulebook, release-state manifest, continuity/release gates, and production `secrets.required` validation while preserving all accepted Gaming CMS workflows. No D1 migration. See `docs/V1.0.51-CONTINUITY-BINDING-HARDENING.md`.

## v1.0.52 Reviews bridge recovery

The CMS Reviews list and decisions use a dedicated `GAMING_CMS_REVIEWS_TOKEN` configured on both CMS and Gaming API Workers. Existing commerce and operations credentials remain unchanged. The CMS shows unavailable counts as dashes during an API error rather than misleading zeroes. See `docs/V1.0.52-REVIEWS-BRIDGE-RECOVERY.md`.

## v1.0.53 Reviews workspace UI

Reorganizes review metrics, moderation filters, the empty queue and verified-purchase guidance into a clearer, responsive staff workspace. Frontend-only; see `docs/V1.0.53-REVIEWS-WORKSPACE-UI.md`.


## v1.0.59 Gaming UI clarity build fix

Audits the Gaming CMS as an operator surface and removes implementation/developer explanations from daily workflows. Pricing, Live Operations, Suppliers, Promotions, Analytics, Finance, Catalog, Storefront, Support and related Gaming pages now prioritize business controls, state and safety-critical information. Adds a Gaming operator-copy hygiene guard so D1/Worker/API/canonical/phase terminology does not drift back into normal UI. Frontend-only; see `docs/V1.0.59-GAMING-UI-CLARITY-BUILD-FIX.md`.

## v1.0.57 Summary card cleanup

Finishes the no-footer summary-card rule across feature-local Gaming KPI strips that do not use the shared `MetricCard`, tightens those cards, normalizes the Live Operations dashboard action, and simplifies the Catalog rows-per-page control. Frontend-only; see `docs/V1.0.57-SUMMARY-CARD-CLEANUP.md`.

## v1.0.56 Metric card cleanup

Removes the shared `MetricCard` footer/detail/trend contract globally. Shared metric cards use label + value + icon only, with a tighter shared height and a UI-hygiene guard that blocks the shared footer contract from returning. Frontend-only; see `docs/V1.0.56-METRIC-CARD-CLEANUP.md`.

## v1.0.55 CMS UI clarity system

Removes non-operational guide/microcopy noise, raises internal CMS readability, simplifies verbose developer-facing notices and adds automated UI-content/typography checks plus the global UI standard. Frontend-only; see `docs/V1.0.55-CMS-UI-CLARITY-SYSTEM.md`.

## v1.0.54 Reviews layout consistency

Restores the shared CMS page gutters on Reviews and adds deliberate spacing between the header, metrics, queue and policy note. Frontend-only; see `docs/V1.0.54-REVIEWS-LAYOUT-CONSISTENCY.md`.

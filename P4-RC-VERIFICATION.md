# P4 RC verification — CMS v1.0.32

Baseline: user-provided CMS v1.0.31 P4 RC.

## Retained v1.0.31 capabilities

- SaaS-level Gaming Support operations center with SLA/assignment/commerce context;
- canonical customer/staff/service message identity;
- governed private NEXT F Media evidence;
- Gaming first-party Tracking Health and acquisition analytics;
- global 10px absolute typography floor.

## v1.0.32 NEXT F Checkout Payments Control Center

- `Platform → Payments` is a first-class control-plane route;
- CMS talks to Checkout through its server Worker, never directly to provider APIs from the browser;
- provider secret rotation uses a separate secret-admin credential and `platform.security.manage` permission;
- provider/business/market/currency availability and show-disabled/hide behavior are centrally configurable;
- PayPal non-secret configuration includes Client ID/Webhook ID/environment/currencies;
- PayHere non-secret configuration includes Merchant ID/environment/currencies;
- existing provider secret plaintext is never returned to CMS;
- businesses govern allowed HTTPS origins and signed payment callback URLs;
- transaction, webhook, outbox and audit visibility are available without exposing provider credentials;
- automated provider refund execution is intentionally **not** exposed in this release; the canonical refund ledger remains foundation only.

## Verification in the final source tree

- all CMS `check:*` suites: **58/58 PASS**;
- Checkout Payments control-plane gate: **14/14 PASS**;
- combined final Checkout/Gaming/CMS TS/TSX syntax/transpile run: CMS **240 files, 0 errors**.

## Build environment note

The final packaging environment could not complete an npm dependency restore/build cycle. A production `tsc -b && vite build` is therefore **not claimed** here and remains mandatory on the deployment machine. The final source check inventory and TS/TSX syntax/transpile gates are clean.

## Deployment scope

This release changes both CMS frontend and CMS API Worker because Checkout configuration/secrets are brokered server-side. Deploy Checkout API first, then CMS API, then CMS Pages. Configure `CHECKOUT_ADMIN_TOKEN` and `CHECKOUT_SECRET_ADMIN_TOKEN` as Worker secrets. No CMS D1 SQL migration is introduced by this integration.

See `docs/V1.0.32-NEXTF-CHECKOUT-P4.md`.

## v1.0.46 Media WebCrypto type fix

The Media AWS SigV4 HMAC helper now copies key bytes into a guaranteed `ArrayBuffer` before WebCrypto `importKey()`, resolving the TypeScript 5.8 `ArrayBufferLike` / `SharedArrayBuffer` overload error without changing signing behavior. CMS-only hotfix; no D1 migration.

## v1.0.47 storefront carousel + verified reviews
Adds mixed image/video hero merchandising, bounded family artwork scrolling, and production customer-review moderation with automatic approved publication. No D1 migration.

## v1.0.48 global overlay focus stability

Fixed the shared CMS Modal/Drawer focus lifecycle so controlled-input re-renders no longer move keyboard focus to the close button. Initial focus now prefers form controls, close buttons are non-submit controls, and Escape/focus trapping continue to use the latest close callback without restarting the overlay effect. Frontend-only; no D1 migration or API deployment. See `docs/V1.0.48-GLOBAL-OVERLAY-FOCUS-STABILITY.md`.

## v1.0.49 review UI build fix

Fixed the customer-review moderation page to use the shared `ToastInput.description` and `SectionHeader.action` contracts. This removes the frontend TypeScript build failure while preserving the v1.0.48 global overlay focus-stability fix and the existing review workflow. Frontend-only; no D1 migration or API deployment. See `docs/V1.0.49-REVIEW-UI-BUILD-FIX.md`.

## v1.0.50 review bridge + non-modal moderation

Moves customer-review moderation onto the existing Gaming commerce bridge, removes the review rejection modal, and replaces the status select with explicit segmented controls. Gaming v1.8.25 provides backwards-compatible operations/commerce auth during rollout. No D1 migration. See `docs/V1.0.50-REVIEW-BRIDGE-NONMODAL.md`.

## v1.0.51 continuity + binding hardening

Built forward from v1.0.50. Adds the checked-in NEXT F continuity rulebook, release-state manifest, continuity/release gates, and production `secrets.required` validation while preserving all accepted Gaming CMS workflows. No D1 migration. See `docs/V1.0.51-CONTINUITY-BINDING-HARDENING.md`.


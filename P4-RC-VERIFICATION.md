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

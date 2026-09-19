# NEXT F CMS — Project Status

**Current source release:** V1.0.39 P4 RC — Global Control Spacing  
**Original production foundation:** V1.0.0 final production package  
**Production CMS:** `https://cms.nextf.lk`  
**Production API:** `https://cms-api.nextf.lk`

## Completed production foundation

- Staging acceptance completed.
- Production D1/R2/Queue/DLQ/Pages/Worker created and deployed.
- Production Cloudflare Access configured for CMS + staff API; public `/v1/public/*` is path-scoped bypass only. The main-site project receiver additionally requires its own exact-path Access bypass plus a dedicated Worker bearer secret.
- Production D1 migrations, Worker secrets, cron and custom domains configured.
- Super Admin exact Access subject binding verified with 29 permissions.
- Production browser smoke passed.
- D1 Time Travel restore drill passed.
- Tenant isolation runtime proof passed and disposable fixture was cleaned.
- Anonymous public ingress and invalid Turnstile rejection passed.

## V1.0.0 final package

The final source adds:

- fail-closed branded production login/bootstrap UI;
- API `/auth/complete` login completion route;
- durable exact public idempotency replay compatible with single-use Turnstile tokens;
- shared scheduled/staff maintenance for demo expiry, retention and idempotency cleanup;
- guarded production acceptance automation from the remaining 4D gates through release readiness;
- stable Contracts Registry / Site Manifest 1.0.0 runtime validation;
- managed-site evidence gate that fails closed when a real connection exists and records N/A only while no managed site exists;
- V1 release hygiene and production/staging leakage checks;
- Gaming integration handoff.

## Final operator gate

Run:

```powershell
npm ci
npm run acceptance:source
```

Deploy the V1 Worker/frontend, then run `npm run acceptance:production:final`. The final runner must print `FINAL RESULT: READY FOR V1.0` before the release is declared complete. A fresh legitimate production Turnstile token is intentionally required to prove the public exact-replay path; the runner will not bypass or fake that control.

After the V1 source is deployed, run `npm run acceptance:production:final` as the final production proof.

## Current stream

Gaming and CMS are in production-completion/acceptance. v1.0.39 standardizes balanced horizontal spacing across shared CMS form controls while preserving the v1.0.38 shared modal/form system and the v1.0.37 adaptive data-table system so compact columns size to their content, the primary identity/entity column flexes, operational badges/actions do not wrap, and genuinely wide datasets scroll horizontally instead of relying on fixed pixel widths. It preserves the v1.0.36 Finance UX and v1.0.32 global NEXT F Checkout Payments control plane. Checkout remains a separate shared payment platform; Gaming remains the owner of Gaming orders, pricing, risk and fulfillment.

## Production Purity + Auth UX completion

- Cloudflare Access account/session menu and explicit Sign out added.
- Production runtime labels no longer claim Local development.
- Hard-coded mock dashboard Recent Activity removed from the source tree.
- Production collection state no longer falls back to prototype seed rows when D1 documents are absent.
- Reset/prototype mutation controls are local-only and hard-guarded.
- Security reports Cloudflare Access as the production authentication/MFA/session authority.
- Backup/Recovery reports D1 Time Travel as the production recovery authority; browser restore/import is not presented as production recovery.
- Digital, Gaming and Software external simulations fail closed in production unless a real integration capability is connected.
- Production data-hygiene scanner and guarded fixture cleanup tooling added. The reviewed production scan found no SAFE_FIXTURE_ROWS requiring deletion; the production acceptance ledger remains retained as REVIEW evidence.
- Production Purity regression gate is wired into `acceptance:source`.
- Contracts acceptance follows the current live registry metadata and its referenced stable production release/schema rather than assuming the registry index version itself is `1.0.0`.
- Secure `nextf.lk` server-to-server project-request ingestion is implemented at `/v1/integrations/nextf/project-requests`: dedicated bearer auth, live Contracts authority, durable idempotency, private `forms.submission`/`forms.lead`, Digital Sales projection, audit and identifier-only queue receipt.

### V1 production acceptance complete

The deployed final production acceptance completed with `PASS public_abuse` and `FINAL RESULT: READY FOR V1.0`. CMS V1 is therefore release-ready. Managed-site adapter evidence remains N/A while there is no non-revoked managed Site Connection and becomes mandatory before the first managed Gaming/site activation.

See `docs/V1.0.0-FINAL-DEPLOYMENT.md` for the retained deployment procedure and evidence expectations.

## V1.0.1 Gaming control-plane extension

Gaming pricing and FazerCards non-secret supplier configuration are now CMS-managed production state. Supplier health, preview and sync actions are queued from the CMS and executed server-side by `nextf-gaming-api`; supplier API credentials remain Worker secrets.

## V1.0.2 Gaming retail-price projection

The CMS pricing policy now drives customer-facing Gaming catalog prices directly through `gaming-api.nextf.lk`. Markup mode shows LKR catalog prices using already-synced private supplier-cost mappings; Supplier quote mode intentionally shows a checkout price action. Normal FX/margin changes no longer require another FazerCards catalog sync.

Pricing display validation: CMS 31/31 `check:*` suites pass after the V1.0.2 pricing projection change.


## V1.0.5 P4 RC — Gaming Live Operations Foundation

The CMS now reads live Gaming orders, finance-gated payment proofs, permission-gated fulfillment jobs and the append-only Gaming audit timeline through a dedicated staff API projection over the shared D1. Browser code does not receive the Gaming manual-payment or supplier admin tokens. The v1.0.5 Live Operations UI established the safe read plane. v1.0.6 adds guarded payment verification/rejection and fulfillment retry through the existing server-only Gaming boundaries.


## V1.0.6 P4 RC — Gaming Live Operations Actions

Live Operations is now actionable. Finance staff can verify/reject payment proofs and order/supplier operators can retry non-completed fulfillment jobs. The CMS Worker uses the narrow `GAMING_CMS_OPERATIONS_TOKEN` and forwards authenticated staff identifiers to the Gaming API so the canonical Gaming audit event records the real operator. Broad Gaming admin tokens stay outside the CMS.


## V1.0.7 P4 RC — Gaming Refunds + Finance Operations

Live Operations now supports finance-gated refund create/review/payout/completion commands through the narrow Gaming operations bridge. Refunds are durable records with partial/cumulative accounting, payout evidence and supplier/gateway recovery fields. Finance now reads shared-D1 commerce state and reports gross collected, completed/pending refunds, net sales, supplier/gateway economics and estimated margin, with CSV reconciliation export. Public Gaming customer contracts remain unchanged.


## V1.0.8 P4 RC — Gaming Risk + Abuse Operations

Live Operations now includes a privacy-safe risk queue for staff with `gaming.orders.manage`. Checkout scoring and automatic high-risk holds remain in the Gaming API; CMS can release or retain a hold through the narrow operations bridge. Risk correlation fingerprints never enter the browser. Public Gaming customer contracts remain unchanged.


## V1.0.9 P4 RC — Gaming Transactional Notifications

Live Operations now projects the event-driven Gaming notification outbox with delivery/attention metrics and a guarded retry action for non-sent messages. Email sending remains inside the Gaming API Worker and provider credentials never enter CMS. Gaming v1.8.6 defaults delivery to disabled and initializes its commerce-event cursor without historical email backfill. Public Gaming customer contracts remain unchanged.


## V1.0.32 P4 RC — NEXT F Checkout Payments Control Center

The CMS now governs the shared `checkout.nextf.lk` platform through a server-only bridge. Providers, businesses and availability are runtime configuration, while provider secrets remain write-only outside normal D1 configuration. PayPal/PayHere can be enabled per business/market/currency without hard-coding rules in Gaming. The Checkout v1.0.0 contract is intended for the existing JavaScript Contracts registry at `contracts.nextf.lk`.

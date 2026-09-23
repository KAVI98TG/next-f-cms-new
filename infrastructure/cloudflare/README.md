# NEXT F CMS Cloudflare Production Adapter

This directory is the production-infrastructure foundation for the internal NEXT F CMS and the shared backend boundary.

## Bindings

- **Workers** — HTTP API/edge runtime.
- **D1** — durable business documents, audit, idempotency, staff identity bindings and outbox metadata.
- **R2** — file/object payloads; D1 stores metadata only.
- **Queues** — asynchronous events and integration delivery. Consumers must be idempotent because delivery is at-least-once.
- **Workflows** — recommended for durable multi-step provisioning, offboarding, export and long-running integration jobs.
- **Rate Limiting + Turnstile** — public `nextf.lk` mutation protection.
- **Cloudflare Access** — staff CMS perimeter. The Worker still validates the Access JWT and maps it to an active staff identity binding.
- **Workers Secrets** — Access/service/Turnstile and provider secrets. No secrets belong in source, Site Manifest or D1 public projections.

## Required secrets

Set using Wrangler/Cloudflare secret management, never commit values:

- `TURNSTILE_SECRET_KEY`
- `SERVICE_CREDENTIAL_SECRET`
- `NEXTF_MAIN_SITE_INGEST_TOKEN` — dedicated bearer credential for the `nextf.lk` server-to-server project-request receiver. Do not reuse the service credential or Turnstile secret.
- `GAMING_CMS_OPERATIONS_TOKEN` — dedicated least-privilege server-to-server credential shared only with the Gaming API for exact payment-decision, fulfillment-retry and refund-mutation commands.
- `GAMING_CMS_COMMERCE_TOKEN` — dedicated server-to-server credential for promotion/campaign create-update commands. The Gaming API also retains legacy review-route compatibility, but current CMS review calls use the narrower Reviews token. Do not reuse the operations token.
- `GAMING_CMS_REVIEWS_TOKEN` — dedicated server-to-server credential shared with the Gaming API for customer-review listing and moderation only. It does not grant promotion or payment administration.
- `GAMING_CMS_SUPPLIER_FUNDING_TOKEN` — dedicated least-privilege server-to-server credential shared only with the Gaming API for FazerCards funding reads/create/verify/reconciliation. Do not reuse operations, commerce or support credentials.

Additional provider credentials should use separate least-privilege secrets.

## Recovery

Use D1 Time Travel for short-horizon point-in-time recovery. For retention beyond the platform Time Travel window, schedule encrypted/exported database artifacts into a restricted R2 backup bucket and test restoration regularly.

## Staff identity boundary

Staff routes verify the Cloudflare Access JWT and then require an active exact-subject `staff_identity_bindings` row. `staff.session.get` provides the frontend with the bound server principal and permissions. Production frontend bootstrap fails closed before rendering when identity verification/binding fails. Configure the deployed Access policy (including the required MFA policy) separately; source code does not claim that the Access JWT proves a specific MFA factor.

## Main website project-request integration

The canonical production project form uses `nextf.lk` server-side Turnstile verification and then calls `POST /v1/integrations/nextf/project-requests` with a dedicated bearer token. Cloudflare Access must bypass only that exact path; the Worker still enforces the dedicated token, live Contracts authority, payload relationships and D1 idempotency. See `docs/releases/V1.0.0-NEXTF-MAIN-SITE-PROJECT-REQUEST-INGESTION.md`.


## v1.0.6 Gaming Live Operations Actions

The CMS staff command boundary can now invoke payment review and fulfillment retry through `gaming-api.nextf.lk` without exposing any control credential to the browser. The dedicated `GAMING_CMS_OPERATIONS_TOKEN` must be configured as a Worker secret on both the CMS API Worker and Gaming API Worker.


## v1.0.7 Gaming Refunds + Finance Operations

The staff command boundary now also invokes the exact Gaming refund mutation lifecycle using the existing `GAMING_CMS_OPERATIONS_TOKEN`. Refund listing and finance evidence remain permission-gated, and the token is still not exposed to the browser or authorized for Gaming configuration/sync/list admin surfaces.


## v1.0.8 Gaming Risk + Abuse Operations

The staff command boundary now also invokes the exact Gaming risk-review mutation route through `GAMING_CMS_OPERATIONS_TOKEN`. Risk documents are read directly from shared D1 only for `gaming.orders.manage`; correlation fingerprints are stripped before browser projection. The HMAC secret itself exists only on the Gaming API Worker and is not required by CMS.


## v1.0.9 Gaming Transactional Notifications

The staff boundary projects the Gaming notification outbox from shared D1 and can invoke only the exact non-sent notification retry mutation through `GAMING_CMS_OPERATIONS_TOKEN`. Email-provider credentials and sender activation remain Gaming API Worker concerns and are never required by the CMS Worker.

## v1.0.10 Gaming Commerce Analytics

The staff API now exposes `staff.gaming.analytics.snapshot.get` for bounded 7/30/90-day aggregate Gaming funnel and operational analytics. The query requires `gaming.read`; finance estimates are included only for principals with `gaming.finance.manage`. Early-funnel conversion observes the v1.8.7 instrumentation coverage cutover rather than backfilling historical product views.


## Gaming promotion campaign bridge

`Gaming Store → Promotions` reads campaign state from the shared D1 and sends create/update commands to the existing Gaming API. Set the same `GAMING_CMS_COMMERCE_TOKEN` as a Worker secret on the CMS API Worker and Gaming API Worker. The credential never enters the browser and does not authorize payment/refund/risk/notification/supplier administration.

## Gaming customer-review bridge (v1.0.52 onward)

`Gaming Store → Reviews` lists and moderates verified-purchase reviews through the Gaming API. Set the same strong random `GAMING_CMS_REVIEWS_TOKEN` as a Worker secret on `nextf-cms-api` and `nextf-gaming-api` before deploying their review-bridge code. The token stays server-side and authorizes only Gaming review list/decision routes; it does not replace or widen the commerce and operations credentials. Gaming retains compatibility for previously authorized commerce/operations callers, but the current CMS sends only the Reviews token. The frontend-only v1.0.53 and v1.0.54 releases do not require Worker or secret changes.


### FazerCards supplier funding bridge

Set the same `GAMING_CMS_SUPPLIER_FUNDING_TOKEN` as a Cloudflare Worker secret on both the CMS API Worker and Gaming API Worker. CMS browser code never receives this credential or `FAZERCARDS_API_KEY`. Funding commands require `gaming.suppliers.manage` plus `gaming.finance.manage`, and Binance Pay authorization remains outside NEXT F.

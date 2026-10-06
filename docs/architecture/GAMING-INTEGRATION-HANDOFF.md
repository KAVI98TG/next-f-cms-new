# Gaming Integration Handoff

## Current ownership

Gaming administration is owned by the dedicated Gaming application:

- staff UI: `https://gaming.nextf.lk/admin`
- Admin API: `https://gaming-admin-api.nextf.lk`
- canonical Gaming operational state: Gaming-owned production D1/R2 and Gaming Worker services

NEXT F CMS is **not** a Gaming control plane. It does not manage Gaming catalog, storefront merchandising, suppliers, FazerCards, pricing, promotions, orders, customers, reviews, finance/risk, analytics or support.

CMS keeps one read-only company summary so the wider NEXT F organization can see Gaming business health without duplicating operational state.

## CMS summary contract

Gaming Admin pushes the summary server-to-server to:

`POST https://cms-api.nextf.lk/v1/integrations/gaming/summary`

Authentication uses the dedicated `GAMING_SUMMARY_INGEST_TOKEN`. No browser receives this credential.

CMS normalizes the payload before storage and retains only:

- order counts: total, completed, payment-review and fulfillment-attention counts;
- finance totals: net sales, gross collected, completed refunds and estimated margin;
- support counts: open, in-progress, urgent and SLA-breached cases;
- FazerCards health visibility: connected state and last-health timestamp;
- promotion counts: active and total;
- analytics counts: orders, verified orders and fulfilled orders.

The accepted body is capped at 16 KB. Extra Gaming fields are discarded before persistence.

The normalized document is stored under CMS integration state as `cms.integration / gaming.summary`.

## Information CMS must not store or control

Do not reintroduce any of the following into CMS:

- supplier credentials or provider API keys;
- FazerCards catalog, wallet funding, balances, sync commands or routing configuration;
- Gaming product/offer/mapping/storefront configuration;
- payment proofs, refund workflow details or risk assessments;
- customer 360 records or order histories;
- support threads or private support evidence;
- review moderation queues;
- Gaming analytics event detail;
- fulfillment jobs or notification queues.

Those records belong to Gaming Admin and its Gaming-owned services.

## CMS staff surface

The only active Gaming navigation item in CMS is **Gaming > Summary** at `/gaming-store/dashboard`.

The CMS permission for this surface is `gaming.read`. CMS does not define Gaming manage permissions.

Historical `/gaming-store/*` operator bookmarks use one compatibility redirect to the Summary page. They are not hidden control surfaces.

The CMS staff API supports `staff.gaming.summary.get`. Other `staff.gaming.*` operations fail with `410 GAMING_CONTROL_MOVED` and direct staff to Gaming Admin.

## Media compatibility

New Gaming public media and private support evidence are owned by Gaming Admin.

CMS retains read-only delivery for already-published legacy public `media.nextf.lk` asset URLs so existing content is not broken during cleanup. CMS no longer creates/finalizes Gaming media uploads and no longer serves private Gaming support evidence.

Do not use this compatibility path for new Gaming uploads.

## Security boundary

- CMS summary ingest is server-to-server and uses only the dedicated summary token.
- Gaming Admin staff authentication remains Cloudflare Access plus the Gaming staff binding and Gaming permission model.
- CMS `gaming.read` does not grant Gaming Admin mutation permissions.
- Supplier/provider secrets stay in Gaming Worker Secrets.
- Private Gaming support evidence stays behind the Gaming Admin Access boundary.
- CMS and Gaming maintain separate control-plane data ownership.

## Phase 4 deployment boundary

The final CMS Gaming cleanup removes duplicate administration only. It does **not** change the public Gaming checkout, payment-provider behavior, order creation, supplier selection, fulfillment execution or the current customer-data runtime.

The later customer/checkout data cutover must be treated as a separate controlled migration with its own validation and rollback plan.

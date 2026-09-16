# NEXT F CMS v1.0.5 — Gaming Live Operations Foundation (P4 RC)

## Purpose

This increment starts the CMS Live Operations Control Plane without creating a second Gaming backend. The CMS Worker reads the Gaming Store's existing production order, payment-proof, fulfillment-job and audit records from the shared production D1 through a Cloudflare-Access staff query.

The public Gaming API contract remains unchanged by this CMS read plane.

## Production topology

- CMS staff API: `cms-api.nextf.lk`
- Gaming API: `gaming-api.nextf.lk`
- Shared D1: the existing NEXT F CMS production database bound to both Workers
- CMS browser -> CMS staff API -> shared D1
- CMS browser never receives the Gaming manual-payment admin token or supplier admin token

## Staff operation

New staff query:

`staff.gaming.operations.snapshot.get`

The query requires `gaming.read` and returns a projection for:

- orders;
- configured payment-provider identity;
- payment proofs when the staff principal has `gaming.finance.manage`;
- fulfillment jobs when the principal has `gaming.orders.manage` or `gaming.suppliers.manage`;
- the recent append-only Gaming audit timeline projected into commerce event names;
- aggregate operational counters.

## Least-privilege projection

The operations snapshot deliberately excludes customer order claim hashes, encrypted recovery material and raw account/player-field payloads.

Payment reconciliation evidence is finance-only. Staff without `gaming.finance.manage` do not receive receiving-statement references or reconciliation detail through the event timeline either.

The payment-method readiness projection contains provider identity and labels only; destination account details are not copied into this view.

## CMS UI

`Gaming Store -> Live Operations` adds four operational views:

1. Orders
2. Payments
3. Fulfillment
4. Events

The order drawer combines payment state, actual fulfillment routing, quote-time routing/economics snapshots and the linked commerce timeline.

## Commerce event status

This RC does **not** introduce a second event database. It projects the existing append-only `gaming.*` audit records into canonical operational labels such as `ORDER_CREATED`, `PAYMENT_SUBMITTED`, `PAYMENT_VERIFIED`, `SUPPLIER_PROCESSING` and `DELIVERED`.

That keeps the first Live Operations increment additive. A dedicated domain-event/outbox layer can be introduced later if event consumers require stronger independent retention, replay or fan-out semantics.

## Intentionally not included yet

The first P4 RC Live Operations page is a read plane. Payment approval/rejection, fulfillment retry and refund commands remain on their existing server-only Gaming admin boundaries. The next control-plane slice should expose those actions through staff-authorized server-to-server commands rather than placing Gaming admin credentials in the browser or duplicating financial business logic in the CMS.

## Acceptance

Run:

```powershell
npm run check:gaming-live-operations
npm run check:gaming-live-control
npm run check:gaming-vnext
npm run check:gaming-vnext-integration
```

The Cloudflare Worker TypeScript project must also compile before deployment.

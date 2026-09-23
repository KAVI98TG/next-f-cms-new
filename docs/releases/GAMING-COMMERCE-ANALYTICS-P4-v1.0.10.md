# CMS v1.0.10 — Gaming Commerce Analytics (P4 RC)

## Scope

This increment adds a staff-facing Gaming Commerce Analytics surface derived from the shared D1 commerce/event architecture. It does not create a parallel analytics store.

## CMS surface

New route:

`/gaming-store/analytics`

Staff with `gaming.read` can view:

- 7 / 30 / 90 day bounded windows;
- customer funnel stages and stage-to-stage conversion;
- product views, checkout starts, orders, paid orders and fulfilled orders;
- product conversion performance;
- supplier routed-order outcomes and resolved success rate;
- refund rate;
- risk hold rate and releases;
- transactional-notification delivery health;
- average order-to-payment-verification time;
- average verified-payment-to-delivery time.

Staff with `gaming.finance.manage` additionally receive selected-window/cohort finance estimates:

- gross collected;
- completed refunds;
- net sales;
- supplier cost;
- gateway fees;
- recorded supplier/gateway recoveries;
- estimated margin;
- product/supplier collected value and estimated margin.

The existing Finance & Reconciliation module remains the operational accounting authority; Analytics is for performance intelligence.

## Data-quality boundary

Early-funnel telemetry did not exist before Gaming Store v1.8.7. The analytics response therefore includes:

- whether early-funnel instrumentation has started;
- its coverage start timestamp;
- a coverage note rendered in CMS.

Funnel conversion only compares stages from that coverage start onward. Historical orders are not silently treated as though their product views were known.

## Privacy and permissions

The analytics projection is aggregated. It does not return customer email, payment references, player/account fields, raw network identifiers, risk subject/network fingerprints, recovery secrets or delivery payloads.

The staff operation is:

`staff.gaming.analytics.snapshot.get`

It requires `gaming.read`; finance fields are additionally gated by `gaming.finance.manage`.

## Contract authority

The live Contracts Registry remains authoritative if packaged documentation differs from production contracts.

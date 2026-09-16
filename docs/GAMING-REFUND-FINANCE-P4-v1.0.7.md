# NEXT F CMS v1.0.7 — Gaming Refunds + Finance Operations (P4 RC)

## Purpose

This increment extends `Gaming Store → Live Operations` from payment/fulfillment control into a finance-grade refund workflow and upgrades the Finance page to use live shared-D1 commerce data.

## Refund operations

Staff with `gaming.finance.manage` can:

- start a refund with amount, reason and note;
- approve or reject a requested refund;
- record payout evidence and optional supplier/gateway recoveries;
- complete a sent refund.

The CMS does not implement refund business rules itself. Every mutation passes through the CMS Worker and the dedicated server-to-server operations bridge to the Gaming API, which owns eligibility, amount bounds, state transitions and canonical Gaming audit events.

The browser never receives the Gaming control token.

## Finance projection

The CMS Finance page now reads the live Gaming operations snapshot instead of local/prototype commerce records. Finance metrics distinguish:

- gross customer funds collected;
- completed refunds;
- pending refunds;
- net sales;
- estimated supplier cost;
- supplier-cost recoveries;
- gateway fees;
- gateway-fee recoveries;
- estimated margin.

CSV reconciliation exports the same order/refund economics so finance review can be performed outside the UI without changing the underlying records.

## Data and permission boundary

- Refund records and finance details require `gaming.finance.manage`.
- Payment payout/reference and recovery evidence remains redacted from general `gaming.read` timelines.
- Refund mutations use CMS idempotency before reaching the Gaming API.
- The shared `GAMING_CMS_OPERATIONS_TOKEN` is a Worker secret only.
- The Gaming API accepts that credential only for the exact payment-decision, fulfillment-retry and refund-mutation routes; list/config/sync endpoints remain outside its scope.
- Canonical commerce events are recorded once by the Gaming API with the real CMS staff principal; CMS boundary audits remain separate platform evidence.

## Refund UX rules

The CMS mirrors server eligibility for operator guidance: verified payment, eligible fulfillment/order state, remaining refundable balance and no other active refund. The server remains authoritative and rejects stale or invalid commands.

Partial refunds are supported. The UI displays each refund record and the remaining refundable balance; the order becomes fully refunded only when completed refunds cumulatively equal the collected customer payment.

## Deployment

No new secret is required if the v1.0.6 operations bridge is already configured. Keep the same strong random `GAMING_CMS_OPERATIONS_TOKEN` on both Workers.

Deploy Gaming API v1.8.4 before CMS API/frontend v1.0.7 so all refund command routes exist when CMS controls become available.

The live Contracts Registry remains authoritative if packaged documentation conflicts with production contracts.

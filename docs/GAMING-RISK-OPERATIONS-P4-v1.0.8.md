# NEXT F CMS v1.0.8 — Gaming Risk + Abuse Operations (P4 RC)

## Purpose

This increment adds an operator-facing risk queue to `Gaming Store → Live Operations` while keeping the Gaming API as the owner of scoring, holds and fulfillment release.

## Risk queue

Staff with `gaming.orders.manage` can view:

- risk score and severity;
- assessment state (`clear`, `review`, `held`, `released`);
- safe signal codes and weights;
- coarse signed-in/account-age and previous-order context;
- linked order and commerce timeline.

The CMS projection intentionally removes the Gaming API's keyed network and purchase-target correlation fingerprints.

## Review actions

Order managers can review `review`/`held` assessments and choose:

- **Release for fulfillment** — releases the hold; if payment is already verified and no supplier job exists, the Gaming API queues the normal fulfillment job.
- **Keep on hold** — records the operator decision and preserves/escalates the hold. It fails closed if fulfillment has already been queued.

The command uses CMS idempotency plus the existing `GAMING_CMS_OPERATIONS_TOKEN`. The browser never receives that credential.

## Permissions

Risk data and actions use the existing canonical `gaming.orders.manage` permission. No new permission identifier is introduced in this P4 RC.

Finance evidence remains under `gaming.finance.manage`; supplier internals retain their existing order/supplier permission boundary.

## Privacy

The Live Operations browser receives no network fingerprint, purchase-target fingerprint, raw IP address or invented device fingerprint. Risk event projection also redacts those fields defensively.

## Deployment

Deploy Gaming API v1.8.5 first, then CMS API/frontend v1.0.8.

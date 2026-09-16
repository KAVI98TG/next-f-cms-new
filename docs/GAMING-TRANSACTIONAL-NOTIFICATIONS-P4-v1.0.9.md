# NEXT F CMS v1.0.9 — Gaming Transactional Notifications (P4 RC)

## Purpose

This increment adds staff visibility and recovery controls for the Gaming transactional-notification outbox while keeping commerce-event consumption and provider delivery inside the Gaming API Worker.

## Live Operations Notifications queue

Staff with `gaming.read` can view safe notification status including:

- linked order/order number;
- recipient email;
- channel and template key;
- provider key;
- state and attempt count;
- next/last activity timestamps;
- provider message id after successful delivery;
- bounded delivery error detail.

The CMS projection does not include email-provider API keys or customer delivery/recovery secrets.

## Retry action

Staff with `gaming.orders.manage` can retry a non-sent notification. The CMS command uses normal CMS idempotency and the existing server-only `GAMING_CMS_OPERATIONS_TOKEN`; the browser receives neither the operations credential nor the email-provider credential.

Already-sent notifications cannot be re-queued by this action.

## Operational visibility

Live Operations adds notification counts for:

- attention (`retry`, `blocked`, `failed`);
- pending/in-flight (`pending`, `sending`, `retry`);
- sent.

Gaming notification sent/error/retry audit events are also projected into the existing commerce timeline using customer-safe details.

## Provider ownership

The CMS does not send email and does not configure the provider secret. Provider activation belongs to the Gaming API Worker. v1.8.6 defaults email delivery to disabled, initializes its event cursor without historical backfill, and may be deployed safely before a sender/provider is activated.

## Deployment

Deploy Gaming API v1.8.6 first, then CMS API/frontend v1.0.9. No new CMS secret is required; keep the existing `GAMING_CMS_OPERATIONS_TOKEN` synchronized on both Workers.

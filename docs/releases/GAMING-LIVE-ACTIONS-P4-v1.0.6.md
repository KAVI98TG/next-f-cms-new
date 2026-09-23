# NEXT F CMS v1.0.6 — Gaming Live Operations Actions (P4 RC)

## Purpose

This increment turns `Gaming Store → Live Operations` from a read plane into a guarded operations control plane for the two launch-critical commands already owned by the Gaming backend:

- manual payment verification/rejection;
- fulfillment retry.

The CMS does not duplicate Gaming financial or supplier business logic. Staff actions flow:

`CMS browser → CMS staff API → Gaming admin API → shared production D1`

## Staff authorization

- Payment verification/rejection requires `gaming.finance.manage`.
- Fulfillment retry requires `gaming.orders.manage` or `gaming.suppliers.manage`.
- `gaming.read` remains sufficient for the safe operations snapshot only.

All CMS commands use the existing staff command idempotency boundary.

## Least-privilege server bridge

The CMS Worker calls `gaming-api.nextf.lk` with the dedicated Worker secret `GAMING_CMS_OPERATIONS_TOKEN`.

The Gaming API accepts that credential only for:

- `POST /v1/gaming/admin/payment-proofs/:proofId/decision`
- `POST /v1/gaming/admin/fulfillment-jobs/:jobId/retry`

It does not authorize payment-method configuration, proof listing, supplier configuration, catalog sync, supplier health, manual fulfillment runs or any public/customer route.

The existing broad manual-payment and supplier admin tokens are not copied into the CMS Worker.

## Operator audit

The CMS Worker forwards the authenticated staff account/user identifiers only over the trusted server-to-server request. When the dedicated operations token is valid, the canonical Gaming audit event records the actual staff account as the principal.

The CMS also retains its own staff-command audit record for platform traceability, but the Live Operations commerce timeline projects only canonical `gaming.*` events so one operator action does not appear twice.

Payment reconciliation evidence remains finance-only in the CMS projection.

## Payment review UX

Pending payment proofs now expose a Review action. Verification requires the same receiving-account evidence already enforced by the Gaming API:

- receiving statement reference;
- exact credited amount;
- received date/time;
- explicit confirmation that funds reached the selected NEXT F destination.

Rejection can carry an internal review note. The Gaming API remains the authority for amount matching, duplicate transaction prevention and order/fulfillment state changes.

## Fulfillment retry UX

Any non-completed fulfillment job can be re-queued from Live Operations when the staff principal has the required permission and the command bridge is configured. The Gaming backend preserves the existing supplier-order identity and retry semantics.

## Worker secrets

Set the same strong random value on both Workers:

```powershell
npx wrangler@latest secret put GAMING_CMS_OPERATIONS_TOKEN --config infrastructure/cloudflare/wrangler.production.jsonc
npx wrangler@latest secret put GAMING_CMS_OPERATIONS_TOKEN --cwd <gaming-store>\infrastructure\cloudflare --config wrangler.production.jsonc
```

Never expose this secret through Vite variables, browser storage, D1 public projections, screenshots or chat.

## Acceptance

CMS:

```powershell
npm run check:gaming-live-operations
npm run check:gaming-live-actions
npm run check:gaming-live-control
```

The CMS Cloudflare Worker TypeScript project must compile before deployment. After deploying both Workers, verify one payment-review action and one safe fulfillment retry in production using controlled test records before enabling routine operator use.

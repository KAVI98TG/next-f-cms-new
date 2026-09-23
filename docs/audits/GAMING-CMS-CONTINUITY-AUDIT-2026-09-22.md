# Gaming / CMS continuity audit — 2026-09-22

> **Historical audit snapshot.** This records the repository state on 2026-09-22. Current documentation structure and release authority are defined by `docs/README.md`, `docs/current/PROJECT-STATUS.md`, and `RELEASE-STATE.json`.

## Gaming findings

1. Review-to-purchase association was ambiguous when a customer had multiple completed purchases. Fixed with an authenticated eligibility endpoint and explicit purchase selection.
2. Review eligibility used the global list cap and could eventually forget older reviewed orders. Fixed with an account-scoped D1 query.
3. Public review API outages looked the same as “zero reviews.” Fixed with separate loading/error/empty states and retry.
4. `/orders` and `/reviews/write` page views were reported as `/account`. Fixed in the browser analytics contract and Worker sanitizer.
5. Review UI -> AppState -> HTTP API type flow did not carry `orderId`. Fixed and regression-checked.
6. Current customer purchase, review, orders and support flows remain routed/non-modal. The Gaming React tree has no visible native `<select>` elements; custom select and scrollbar styling remain in place.

## CMS findings

1. Production Worker deployment did not declare required secret names, allowing a class of missing-runtime-binding failures to escape deployment. Fixed with Wrangler `secrets.required`.
2. Review moderation remains inline/non-modal with explicit status buttons.
3. Shared CMS SelectInput remains a custom portal/listbox control; its native select is hidden and used only for form semantics.
4. Overlay focus stability, funding bridge/idempotency boundary, Media, supplier controls, storefront merchandising, notifications, support and operations remain present.
5. The `/gaming` embedded storefront is local-development simulation only in production runtime; production directs customers to `gaming.nextf.lk`.

## Continuity controls added

Both projects now ship `docs/governance/NEXT-F-CONTINUITY-RULES.md`, `docs/governance/PROJECT-RULES.md`, `RELEASE-STATE.json`, `check:continuity`, and deploy release gates. New releases must declare their exact parent baseline and preserve critical accepted capabilities.

# NEXT F CMS - Current Project Status

**Source release:** v1.0.64 - Analytics Decision Dashboard

**Canonical parent:** v1.0.63

**Release authority:** `RELEASE-STATE.json`

**Production CMS:** `https://cms.nextf.lk`

**Production API:** `https://cms-api.nextf.lk`

**Runtime contract target:** Contract Registry v1.4.0 / Phase 41

**Cloudflare account migration:** CMS v1.0.64 remains the live production baseline. The owner is manually migrating production ownership to account `df47917ecc2d22a3612202862f42fb38` and has reported D1/R2 transfer complete. No new-account deployment is approved; CMS staging is excluded. Local config preparation and the pending verification/cutover plan are recorded in `docs/planning/NEW-CLOUDFLARE-PRODUCTION-ACCOUNT-MIGRATION.md`. Unreleased multi-Site analytics code must not be deployed as v1.0.64.

## Unreleased Gaming ownership cleanup

Branch: `feature/gaming-final-cleanup`.

The CMS source is being reduced to a read-only Gaming company summary. Duplicate Gaming catalog, supplier/FazerCards, storefront, operations, customers, reviews, finance/risk, analytics, support and media-write controls have been removed from this branch. The only active CMS Gaming surface is `/gaming-store/dashboard`, backed by a bounded server-to-server summary ingest.

This cleanup does not change the currently deployed v1.0.64 runtime until the branch is separately approved and deployed. It also does not perform the Gaming customer/checkout data cutover.

## Current release

v1.0.64 is the canonical, deployed analytics dashboard release. It turns the Platform Analytics surface into a decision-ready view of canonical page-view, CTA, form-start and form-submission aggregates, with range-aware trends, event progression, event mix, pipeline quality and hourly detail.

The main Site is pinned to Contract Registry v1.4.0. Its consent-aware SDK activation and production event collection completed on 2026-09-28.

This release changes only the CMS frontend. It does not alter collector ingestion, Queue processing, D1 aggregates, Analytics Engine delivery, reporting API semantics, bindings or secrets. The UI intentionally does not claim unique users, sessions, source attribution, revenue or user-level conversion because the current aggregate report does not provide those measures.

Release finalization and the Cloudflare Pages production deployment passed on 2026-09-28. Immutable deployment: `https://9dffa42d.nextf-cms.pages.dev`.

## Current UI baseline

- metric and summary cards do not carry filler footer/helper copy;
- CMS Gaming UI is limited to company-level read-only summary information;
- modal form controls keep their normal height even when a neighboring field has uploads or secondary actions;
- long descriptions, media controls, and multi-item pickers use full-width modal rows where appropriate;
- UI copy does not use em dash or en dash glyphs;
- the permanent UI content standard lives at `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Production foundation retained

The release preserves the existing production foundation: Cloudflare Access, production D1/R2/Queue resources, the CMS Worker/API boundary, the bounded Gaming summary ingest, Checkout controls, read-only legacy public media compatibility, production acceptance automation, contract validation, and current least-privilege secret boundaries.

No migration is included in v1.0.64.

## Deployment scope

v1.0.64 is **Pages/frontend only**. The application version label changes, but there is no API Worker or database change.

Use `docs/current/DEPLOYMENT.md` for the current deployment sequence.

## Current documentation

- Documentation index: `docs/README.md`
- Deployment: `docs/current/DEPLOYMENT.md`
- Release history: `docs/current/RELEASE-NOTES.md`
- Continuity: `docs/governance/NEXT-F-CONTINUITY-RULES.md`
- Architecture: `docs/architecture/NEXT-F-CMS-FINAL-ARCHITECTURE.md`
- v1.0.61 record: `docs/releases/V1.0.61-DOCUMENTATION-ORGANIZATION.md`

- v1.0.62 record: `docs/releases/V1.0.62-FORM-AND-CONTENT-CLARITY.md`
- v1.0.63 record: `docs/releases/V1.0.63-FIRST-PARTY-ANALYTICS-RUNTIME.md`
- v1.0.64 record: `docs/releases/V1.0.64-FIRST-PARTY-ANALYTICS-DASHBOARD.md`
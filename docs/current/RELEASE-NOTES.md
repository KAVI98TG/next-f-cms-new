# NEXT F CMS Release Notes

## v1.0.61 — Documentation Organization

Canonical parent: **v1.0.60**. Reorganizes all project documentation into a single `docs/` information architecture, creates current/governance/architecture/planning/release/QA/audit/archive areas, removes duplicate root documentation, archives stale verification material, and adds `check:docs` to prevent structure drift. No D1 migration, API contract change, Worker binding change, or new secret.

See `docs/releases/V1.0.61-DOCUMENTATION-ORGANIZATION.md` and `docs/README.md`.

## v1.0.60 — Gaming List & Status Clarity

Source parent: **v1.0.59**. Frontend/Pages-only UI cleanup. The live Contracts Registry remains Production **v1.2.0**. No D1 migration, Worker/API contract change, binding, or secret is required.

Cleans normal Gaming list/table/status surfaces: removes internal product/offer/provider identifiers from default rows, makes offer/routing secondary copy conditional, simplifies Customer Directory order/spend cells, and removes repeated healthy-state helper lines from Commerce Dashboard readiness. Search/detail/edit flows retain the identifiers and deeper operational context where needed.

Static regression **70/70** and the targeted release gate passed before packaging; frontend build and Worker/API typecheck remain pending until `npm run release:finalize`.

See `docs/releases/V1.0.60-GAMING-LIST-STATUS-CLARITY.md` and `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Previous release

# NEXT F CMS v1.0.59 — Gaming UI Clarity Build Fix

Canonical parent: **v1.0.57**. The v1.0.58 candidate did not become canonical because its frontend TypeScript build failed. v1.0.59 carries forward the Gaming UI clarity work and fixes that compile error.

The Support case commerce-context UI referenced `orderContext.paymentProvider`, but the canonical Support order-context type exposes `paymentState` and does not expose a payment-provider field. The unsupported helper line has been removed, leaving the canonical payment state.

This remains a Pages/frontend-only change. No D1 migration, Worker/API contract change, binding, or secret is required.

See `docs/releases/V1.0.59-GAMING-UI-CLARITY-BUILD-FIX.md` and `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Previous release


# NEXT F CMS v1.0.57 — Summary Card Cleanup

Canonical parent: **v1.0.56**. The package begins as a non-canonical candidate; `npm run release:finalize` marks it canonical only after the full static suite, release gate, frontend build and Worker/API typecheck pass.

Finishes the metric-card cleanup across feature-local summary/KPI strips that do not use the shared `MetricCard`. Removes the helper/footer line from Gaming Dashboard, Live Operations, Storefront Merchandising, Promotions, Analytics, Customers, Support and Reviews summary cards, plus Platform health and Website Platform header stats; tightens their card heights; normalizes the Dashboard “Open Live Operations” action; and simplifies the Catalog rows-per-page control. The UI hygiene gate now blocks local summary-card footers from returning. No D1 migration, Worker contract change or new secret.

See `docs/releases/V1.0.57-SUMMARY-CARD-CLEANUP.md` and `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Previous release

# NEXT F CMS v1.0.56 — Metric Card Cleanup

Canonical parent: **v1.0.55**. The package begins as a non-canonical candidate; `npm run release:finalize` marks it canonical only after the full static suite, release gate, frontend build and Worker/API typecheck pass.

Removes the shared metric-card footer/detail/trend area across the CMS. Shared `MetricCard` instances show only label, value and icon, with the global card height tightened to match the cleaner operational UI standard. `check:ui-hygiene` prevents the shared footer contract from returning. No D1 migration, Worker contract change or new secret.

See `docs/releases/V1.0.56-METRIC-CARD-CLEANUP.md` and `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Previous release

# NEXT F CMS v1.0.55 — CMS UI Clarity System

Canonical parent: **v1.0.54**. The distributed patch begins non-canonical; `npm run release:finalize` marks the manifest canonical only after the full static suite, release gate, frontend build and Worker/API typecheck pass.

Cleans the CMS as an operational surface: removes global guide/help chrome and sidebar microcopy, raises internal typography, shortens developer-facing UI text, trims tutorial-style Website Platform content, makes metric detail optional, and adds permanent UI content/typography guardrails for future features. No D1 migration, Worker contract change or new secret.

See `docs/releases/V1.0.55-CMS-UI-CLARITY-SYSTEM.md`, `docs/releases/V1.0.55-UI-INSPECTION-AUDIT.md` and `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Previous release

# NEXT F CMS v1.0.54 — Reviews Layout Consistency

Canonical parent: **v1.0.53**.

Restores the shared CMS page gutters on Reviews and adds consistent spacing between the header, summary, moderation queue, and policy notice. Keeps responsive spacing and the review API unchanged. No D1 migration or new secret.

The release gate and production build passed; the production page displayed v1.0.54 and loaded an empty Reviews queue. No approval/rejection action could be verified without a customer review. See `docs/releases/V1.0.54-REVIEWS-LAYOUT-CONSISTENCY.md`.

## Previous release

# NEXT F CMS v1.0.53 — Reviews Workspace UI

Canonical parent: **v1.0.52**.

Reworks the Customer Reviews summary, moderation toolbar, and empty state into a compact responsive workspace with clearer review flow guidance. The functioning Reviews API bridge is unchanged. No D1 migration or new secret.

See `docs/releases/V1.0.53-REVIEWS-WORKSPACE-UI.md`. The missing shared page gutters in this release were corrected in v1.0.54.

## Previous release

# NEXT F CMS v1.0.52 — Reviews Bridge Recovery

Canonical parent: **v1.0.51**.

Reviews use a dedicated CMS-to-Gaming credential, separate from promotions and operations. Unavailable metrics no longer appear as zero. No D1 migration.

See `docs/releases/V1.0.52-REVIEWS-BRIDGE-RECOVERY.md` for the two-Worker secret and rollout sequence.

## Previous release

# NEXT F CMS v1.0.51 — Continuity + Binding Hardening

## Baseline

Built forward only from validated CMS v1.0.50. No older CMS ZIP or snapshot was used as the source baseline.

## Changes

- Ships the NEXT F continuity rulebook in the project root and `docs/`.
- Adds `RELEASE-STATE.json` declaring the exact parent release, contract version, critical capabilities, and required secret names.
- Adds `check:continuity` and a deploy release gate that protects accepted Gaming CMS workflows.
- Declares current production Worker secrets through Wrangler `secrets.required`, so deployment fails instead of silently publishing an API version with a missing required credential.
- Preserves the v1.0.50 non-modal Reviews workflow, custom controls, overlay focus stability, supplier funding bridge, funding idempotency boundary, Media service, notifications, and the rest of the current control plane.

## Data / migrations

No D1 migration. No historical business data is changed or removed. No secret values are stored in the release.

## Deployment

Run the release gate and Worker typecheck, then deploy the CMS API and frontend. Existing required secret names must already be configured on `nextf-cms-api`.

## v1.0.59 build correction

The v1.0.58 candidate failed TypeScript compilation because `SupportPage.tsx` referenced `orderContext.paymentProvider`, which is not part of the canonical support order-context type. v1.0.59 removes that unsupported helper field and keeps the payment-state display only. This is a frontend-only correction; no Worker or D1 deployment is required.

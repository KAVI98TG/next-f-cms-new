# NEXT F CMS - Current Project Status

**Source release:** v1.0.64 - Analytics Decision Dashboard

**Canonical parent:** v1.0.63

**Release authority:** `RELEASE-STATE.json`

**Production CMS:** `https://cms.nextf.lk`

**Production API:** `https://cms-api.nextf.lk`

**Runtime contract target:** Contract Registry v1.4.0 / Phase 41

## Current release

v1.0.64 is the canonical, deployed analytics dashboard release. It turns the Platform Analytics surface into a decision-ready view of canonical page-view, CTA, form-start and form-submission aggregates, with range-aware trends, event progression, event mix, pipeline quality and hourly detail.

The main Site is pinned to Contract Registry v1.4.0. Its consent-aware SDK activation and production event collection completed on 2026-09-28.

This release changes only the CMS frontend. It does not alter collector ingestion, Queue processing, D1 aggregates, Analytics Engine delivery, reporting API semantics, bindings or secrets. The UI intentionally does not claim unique users, sessions, source attribution, revenue or user-level conversion because the current aggregate report does not provide those measures.

Release finalization and the Cloudflare Pages production deployment passed on 2026-09-28. Immutable deployment: `https://9dffa42d.nextf-cms.pages.dev`.

## Current UI baseline

- metric and summary cards do not carry filler footer/helper copy;
- Gaming operator screens prioritize controls, primary status, and actionable exceptions;
- normal Gaming list rows hide internal IDs and redundant healthy-state metadata;
- modal form controls keep their normal height even when a neighboring field has uploads or secondary actions;
- long descriptions, media controls, and multi-item pickers use full-width modal rows where appropriate;
- UI copy does not use em dash or en dash glyphs;
- the permanent UI content standard lives at `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Production foundation retained

The release preserves the existing production foundation: Cloudflare Access, production D1/R2/Queue resources, the CMS Worker/API boundary, Gaming bridges, Checkout controls, NEXT F Media, production acceptance automation, contract validation, and current least-privilege secret boundaries.

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

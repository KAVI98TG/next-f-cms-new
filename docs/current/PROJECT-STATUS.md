# NEXT F CMS - Current Project Status

**Source release:** v1.0.63 - First-Party Analytics Runtime

**Canonical parent:** v1.0.62

**Release authority:** `RELEASE-STATE.json`

**Production CMS:** `https://cms.nextf.lk`

**Production API:** `https://cms-api.nextf.lk`

**Runtime contract target:** Contract Registry v1.4.0 / Phase 41

## Current release

v1.0.63 is the canonical, deployed first-party analytics runtime release. It adds public and server collectors, queue processing, D1 aggregates, Analytics Engine delivery, a bounded browser SDK, health/reporting APIs, canonical permissions and a CMS analytics surface.

The main Site remains pinned to Contract Registry v1.0.0. The runtime is deployed dormant; SDK installation and production event collection require a separate explicit Site upgrade review to v1.4.0.

Release finalization, Worker typecheck, frontend build, remote D1 migration, Cloudflare resource provisioning, Worker deployment and Pages deployment passed on 2026-09-24. Live health and SDK-delivery checks passed; authenticated browser acceptance and production event ingestion remain intentionally unrun.

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

No migration is included in v1.0.62.

## Deployment scope

v1.0.62 is **Pages/frontend only** if deployed. The application version label changes, but there is no API Worker or database change.

Use `docs/current/DEPLOYMENT.md` for the current deployment sequence.

## Current documentation

- Documentation index: `docs/README.md`
- Deployment: `docs/current/DEPLOYMENT.md`
- Release history: `docs/current/RELEASE-NOTES.md`
- Continuity: `docs/governance/NEXT-F-CONTINUITY-RULES.md`
- Architecture: `docs/architecture/NEXT-F-CMS-FINAL-ARCHITECTURE.md`
- v1.0.61 record: `docs/releases/V1.0.61-DOCUMENTATION-ORGANIZATION.md`

- v1.0.62 record: `docs/releases/V1.0.62-FORM-AND-CONTENT-CLARITY.md`

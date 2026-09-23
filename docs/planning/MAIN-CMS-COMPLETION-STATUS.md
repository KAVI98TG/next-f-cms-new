# Main CMS Completion Status

> **Planning/history note.** This file is retained for architectural and release history. Current release state lives in `docs/current/PROJECT-STATUS.md` and `RELEASE-STATE.json`.

## Source roadmap

- Phase 0 — baseline freeze: complete.
- Phase 1 / V0.12 — Website Platform foundation: complete.
- Phase 2 / V0.13 — identity, organizations, memberships: complete.
- Phase 3 / V0.14 — provisioning + Demo governance: complete.
- Phase 4 / V0.15 — Contract Registry/Site Manifest foundation: complete, canonical external inputs still required.
- Phase 5 / V0.16 — entitlements + capability access policy: complete.
- Phase 6 / V0.17 — changes, approvals, revisions, publishing: complete.
- Phase 7 / V0.18 — shared backend/API boundary: complete.
- Phase 8 / V0.19 — `nextf.lk` first-party boundary: complete, exact public-site source wiring still requires source evidence.
- Phase 8.5 / V0.20 — runtime/release source hardening: complete; dependency-backed runtime acceptance external.
- Phase 9 / V0.21 — Cloudflare production infrastructure foundation: complete in source; account-specific deployment/bindings/credentials external.
- Phase 10 — Customer Workspace: removed from the main-CMS roadmap and will be a new project at `workspace.nextf.lk`.
- Phase 11 / V0.22 — lifecycle/offboarding/portability/production acceptance ledger: complete in source.
- Production Go-Live P0 / V0.23 — root CMS deployment routing + Light/Dark/System frontend foundation: complete in source.
- Production Go-Live P1 / V0.24 — D1-backed durable operational-state bridge + staff query/command handlers: complete in source.
- Production Go-Live P2 / V0.25 — verified Cloudflare Access production staff session + production impersonation removal: complete in source.
- Next — Production Go-Live P3: deploy/bind the real Cloudflare staging/production resources and collect environment evidence.

## Release state

**Main CMS source roadmap: complete.**

**Production V1.0 approval: blocked until all critical external acceptance gates have concrete evidence.**

This distinction is deliberate. V0.25.0 is the current production go-live source candidate. The internal CMS should only be tagged/deployed as `1.0.0` after the real Cloudflare deployment and the acceptance ledger are fully passed in NEXT F's actual deployment environment. The separate Customer Workspace project starts after the CMS production release is proven.

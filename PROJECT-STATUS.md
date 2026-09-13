# NEXT F CMS V0.25.0 — Project Status

## Status

**Main internal CMS source roadmap and Production Go-Live P0–P2 source work are complete. Production V1.0 remains evidence-gated.**

V0.25.0 preserves root deployment, global Light/Dark/System theming and the P1 D1 durable-state bridge, then replaces the production frontend local-development session with a verified Cloudflare Access-bound staff principal. Production startup now authenticates before durable state initialization and fails closed when Access verification or the exact active D1 staff binding fails.

The separate Customer Workspace remains outside the main-CMS roadmap and will be built as a separate application at `workspace.nextf.lk` after the CMS production release is proven.

## Completed main-CMS phases

- Website Platform foundation.
- NEXT F Account / customer organization / workspace / membership model.
- Real customer provisioning and isolated Demo governance.
- Contract Registry / Site Manifest resolver foundation.
- Service entitlements and Customer Capability Access Policy.
- Change requests, approvals, external revisions and publishing governance.
- Shared backend/API trust boundary.
- `nextf.lk` first-party projection/ingress boundary.
- Runtime/release source hardening.
- Cloudflare production infrastructure foundation.
- Lifecycle/offboarding/portability and production acceptance ledger.
- Production Go-Live P0 — root routing, global theming, SPA/deployment frontend cleanup.
- Production Go-Live P1 — D1 durable operational-state bridge and connected staff query/command handlers.
- Production Go-Live P2 — verified Cloudflare Access frontend identity and production impersonation removal.

## P2 production identity properties

- `staff.session.get` returns only a verified, D1-bound staff principal.
- JWT signature, expiry, issued-at sanity, issuer and audience are checked at the Worker.
- Active binding and exact Access `sub` matching are required.
- Production frontend permissions come from the server principal, not a browser-selected user.
- React renders only after production identity initialization succeeds.
- Local staff switching is not exposed in production API mode and is hard-guarded if invoked.
- Server-side authorization from P1 remains the actual security boundary.

## Still pending before production V1.0

The next phase is **P3 — Cloudflare Deployment & Environment Proof**: create/bind the real staging and production resources, apply D1 migrations, configure the Access application/policy and real staff binding, set secrets/environment values, deploy the Worker/frontend and collect acceptance evidence.

After P3, production acceptance still includes dependency-backed `npm ci && npm run build`, browser/E2E/security/concurrency tests, backup/restore evidence, authoritative Contracts/Site Manifest deployment, real managed-site adapter receipts and the remaining lifecycle/public-ingress acceptance gates.

V0.25.0 therefore remains a **production go-live source candidate**, not production V1.0.

See `docs/V0.25.0-PRODUCTION-GO-LIVE-P2-PRODUCTION-IDENTITY.md`, `docs/QA-V0.25.0.md`, `docs/MAIN-CMS-COMPLETION-STATUS.md` and Website Platform → Lifecycle & Production Acceptance.

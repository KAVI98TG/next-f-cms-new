# NEXT F CMS V0.25.0 — Project Status

## Status

**Main internal CMS source roadmap and Production Go-Live P0–P2 source work are complete. P3 staging proof is complete through authenticated browser bootstrap; production deployment remains evidence-gated.**

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

## P3 deployment checkpoint

Completed staging evidence:
- Dependency-backed `npm ci` and `npm run build` passed on the deployment machine.
- P0/P1/P2, production-infrastructure and lifecycle acceptance source checks passed.
- Staging D1, R2, Queue and DLQ resources are provisioned and D1 migrations are applied.
- `cms-staging.nextf.lk` and `cms-api-staging.nextf.lk` are live.
- Cloudflare Access protects both staging hostnames; CORS `OPTIONS` bypass is enabled for the Worker origin.
- Worker secrets are installed, the real Super Admin Access subject is bound in D1, and `staff.session.get` returns the verified principal.
- Authenticated browser bootstrap into the staging CMS succeeds.

Current UI refinement work:
- Global card/surface elevation uses a subtle 1px surface shadow while true floating UI keeps elevated shadows.
- Website Platform uses a SaaS-style Overview with grouped Operations, Customer controls and Platform governance navigation.
- Website Platform nested-card artifacts are removed; table headers retain a single divider and Demo review uses a compact inline header stat.
- Route-scoped error boundaries preserve the CMS shell when a single module fails.
- Top-level cards use a consistent 14px vertical rhythm so adjacent borders never merge into double horizontal seams.
- Identity/Sales mojibake artifacts in visible UI copy are cleaned up.

## Still pending before production V1.0

Continue **P3 production deployment** after the staging UI pass: create/bind production resources, production Access policy/MFA, production D1 staff binding, deploy `cms.nextf.lk` + `cms-api.nextf.lk`, then collect production acceptance evidence.

Production acceptance still includes browser/E2E/security/concurrency tests, backup/restore evidence, authoritative Contracts/Site Manifest deployment, real managed-site adapter receipts and the remaining lifecycle/public-ingress acceptance gates.

V0.25.0 therefore remains a **production go-live source candidate**, not production V1.0.

See `docs/V0.25.0-PRODUCTION-GO-LIVE-P2-PRODUCTION-IDENTITY.md`, `docs/QA-V0.25.0.md`, `docs/MAIN-CMS-COMPLETION-STATUS.md` and Website Platform → Lifecycle & Production Acceptance.

- Step 2 source acceptance rerun on UI Pass 6: build, P0, P1, P2, infrastructure, Website Platform and final acceptance pass; lifecycle acceptance was corrected to validate the lifecycle route/section rather than an obsolete display label.

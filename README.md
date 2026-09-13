# NEXT F CMS V0.25.0

Unified internal NEXT F staff CMS covering Platform, NEXT F Digital, Gaming Store, Software and shared Website Platform governance.

## Current milestone

**V0.25.0 — Production Go-Live P2 · Production Identity**

V0.25.0 retains the P0/P1 deployment and durable-data foundations and completes the production frontend identity path. In `production-api` mode the CMS now resolves a verified Cloudflare Access-bound staff principal before React renders, requires an active exact-subject D1 identity binding, uses the server permission set for the session and exposes no production staff impersonation switcher.

### Implemented through V0.25.0

- Existing Platform and NEXT F Digital operational CMS.
- Staff Website Platform control surface.
- Canonical NEXT F Account identity records separate from staff RBAC.
- Customer Organizations and explicit Digital client relationships.
- Customer Workspaces, memberships and customer roles.
- Controlled real-customer provisioning and isolated Demo Access.
- Contract Registry trust/evidence and Site Manifest validation lifecycle.
- Resolver-derived Customer Capability Access Policy foundation.
- Service entitlements, field policy, exact customer-role Permission grants and security restrictions.
- External managed-resource revision evidence, customer change requests and separate publishing governance.
- Shared V1 backend query/command operation registry.
- Staff/customer/demo/public/service principal trust zones.
- Exact Customer Account → Organization → Workspace → Membership scope binding.
- Mandatory command idempotency and backend audit contracts.
- Managed-site adapter interfaces with server-side credential references.
- Dedicated first-party `nextf.lk` identity owned by NEXT F Digital.
- Safe public Service / Case Study / Help projection publication lifecycle.
- General public lead/contact ingress into authoritative Digital Sales.
- Governed Demo Access Request ingress.
- PII-safe first-party conversion-event definitions.
- Evidence-based `nextf.lk` route/component inventory.
- Staff `Website Platform → nextf.lk Integration` surface.
- Root deployment readiness for `https://cms.nextf.lk/`.
- Global Light / Dark / System appearance architecture.
- Cloudflare static SPA fallback and production frontend environment template.
- Shared production durable-state adapter with fail-closed initialization.
- Permission-filtered D1 staff-state snapshot and document APIs.
- D1-backed idempotency for staff durable mutations.
- Optimistic document-version concurrency protection.
- Server-side durable-state audit evidence with request/correlation IDs.
- Data Management export/import through the shared durable boundary.
- Operational business stores no longer call browser `localStorage` directly.
- Production staff session bootstrap through `staff.session.get`.
- Cloudflare Access JWT issuer/audience/expiry/signature validation with explicit authentication errors.
- Exact active D1 staff subject binding before CMS startup.
- Server-authoritative frontend permission session with `cloudflare-access` assurance.
- Production staff impersonation unavailable; local role preview retained only in local prototype mode.
- Reviewed staff-binding SQL generator for staging/production bootstrap.

## Important boundaries

- Internal Admin CMS is for NEXT F staff only.
- Customer Workspace is a separate customer-facing application.
- `nextf.lk` is first-party, but public browser traffic remains low-trust.
- `nextf.lk` is not represented as a Customer Workspace or fake Digital Client.
- Public content is explicitly projected; internal `active/published/completed` state alone never implies public exposure.
- Public website forms never write directly to internal CMS stores or future D1 tables.
- Customer workspace scope comes from authenticated server principals, not browser-selected IDs.
- Connected customer websites remain authoritative for managed website content.
- In production API mode, D1-backed Worker state is the persistence source; seeded prototype arrays are not silently promoted into production records.
- Browser `localStorage` is limited to local-prototype storage, appearance preference and the explicitly local-only staff selector; it is not a production identity source.
- P1's `app_documents` bridge preserves current store contracts; it is not presented as final relational normalization of every business domain.
- No canonical Contract IDs are invented while authoritative Registry source material is unavailable.
- Exact live `nextf.lk` routes/components are not guessed while its source/crawl is unavailable.
- Gaming Store and NEXT F Software remain outside the current Digital architecture scope except genuinely shared Platform capabilities.

## Documentation

- `docs/NEXT-F-CMS-UPGRADE-MASTER-PLAN.md`
- `docs/NEXT-F-CMS-SCOPE-AND-ARCHITECTURE-DIRECTION.md`
- `docs/CMS-CONTRACT-INTEGRATION-GUIDE.md`
- `docs/V0.12.0-WEBSITE-PLATFORM-FOUNDATION.md`
- `docs/V0.13.0-IDENTITY-MEMBERSHIP-FOUNDATION.md`
- `docs/V0.14.0-WORKSPACE-PROVISIONING-DEMO-GOVERNANCE.md`
- `docs/V0.15.0-CONTRACT-REGISTRY-RESOLVER-FOUNDATION.md`
- `docs/V0.16.0-SERVICE-ENTITLEMENTS-CUSTOMER-CAPABILITY-POLICY.md`
- `docs/V0.17.0-CHANGE-APPROVALS-REVISIONS-PUBLISHING.md`
- `docs/V0.18.0-SHARED-BACKEND-API-BOUNDARY.md`
- `docs/V0.19.0-NEXTF-LK-FIRST-PARTY-INTEGRATION.md`
- `docs/V0.23.0-PRODUCTION-GO-LIVE-P0.md`
- `docs/QA-V0.23.0.md`
- `docs/V0.24.0-PRODUCTION-GO-LIVE-P1-DURABLE-BACKEND.md`
- `docs/QA-V0.24.0.md`
- `docs/V0.25.0-PRODUCTION-GO-LIVE-P2-PRODUCTION-IDENTITY.md`
- `docs/QA-V0.25.0.md`

## Quality checks

```bash
npm run check:architecture
npm run check:platform
npm run check:digital
npm run check:digital-operations
npm run check:gaming
npm run check:software
npm run check:saas
npm run check:product
npm run check:acceptance
npm run check:architecture-completion
npm run check:help-center
npm run check:website-platform
npm run check:identity-membership
npm run check:provisioning-demo
npm run check:contract-registry
npm run check:capability-policy
npm run check:change-approvals
npm run check:backend-api
npm run check:public-site
npm run check:runtime-readiness
npm run check:production-infrastructure
npm run check:lifecycle-acceptance
npm run check:go-live-p0
npm run check:go-live-p1
npm run check:go-live-p2
```

The source archive intentionally does not include installed `node_modules`. Run `npm ci` in an internet-enabled development environment before the dependency-backed production build and visual smoke QA.

# NEXT F CMS Upgrade Master Plan

## 1. Objective

Upgrade the existing NEXT F internal CMS carefully from its completed V0.11.0 local-product architecture into the approved Platform + NEXT F Digital operating system, while preparing the backend and staff controls required by a completely separate Customer Workspace application.

The upgrade must preserve the working CMS, avoid duplicated business records, avoid inventing parallel website contracts, and keep every customer-facing authorization decision enforceable on a trusted backend rather than in UI state.

This plan uses four sources in order of authority for the work available in this repository:

1. `NEXT-F-CMS-SCOPE-AND-ARCHITECTURE-DIRECTION.md` — approved business/system boundary for the current phase.
2. `CMS-CONTRACT-INTEGRATION-GUIDE.md` — repository handoff for how the Contract Registry must be consumed.
3. Existing CMS implementation and its regression suites — working conventions and backward-compatibility baseline.
4. The Website Platform / Customer CMS prototype — UX and feature-coverage reference, not an authorization or data-contract authority.

`contracts.nextf.lk` remains the technical authority for website schemas, modules, capabilities, APIs, permissions, events, webhooks, Site Manifests, CMS metadata, security and compatibility. The actual Registry files are not included in this CMS archive; therefore contract-specific IDs must not be invented from the prototype.

---

## 2. Non-negotiable product boundaries

### Platform

Platform owns shared foundations:

- NEXT F identity foundation.
- Staff identity and administrative authentication.
- Roles and permissions.
- Organizations and workspaces.
- Security.
- Shared notifications.
- Audit and system logs.
- Shared integrations.
- Health and infrastructure visibility.
- Help Center infrastructure.
- Shared file/communication services where genuinely cross-business.

Identity and authorization must remain separate. Registration proves/creates identity; it does not create Customer Workspace access.

### NEXT F Digital

NEXT F Digital owns the operating records of the Digital business:

- Leads and contacts.
- Customer/client profiles.
- Opportunities.
- Proposals and contracts.
- Services/packages.
- Projects, milestones, tasks and deliverables.
- Approvals.
- Sites.
- Support.
- Billing, invoices, payments, subscriptions and renewals.
- Digital content/SEO/marketing operations where they are business operations.
- Website Platform administration for sites managed by NEXT F.
- Demo Access business workflow for the Customer Workspace product.

### Internal Admin CMS

Only NEXT F staff use this application. Customers must never log into it.

The staff CMS may manage:

- customer provisioning,
- site connection,
- capability exposure policy,
- approvals,
- operations,
- customer-visible business records,
- support and audit,

but it must not be repurposed into the customer-facing CMS frontend.

### Separate Customer Workspace

The Customer Workspace is a separate frontend/application with separate customer authentication/session behavior. It may share controlled APIs and business data, but it cannot share the internal admin authorization boundary.

### Connected websites

A NEXT F-managed site exposes only capabilities declared by its pinned Site Manifest and canonical contract version. Website code must not gain direct access to internal CMS tables.

---

## 3. Baseline audit — completed before V0.12.0

The received source is package version `0.11.0` and contains 162 TypeScript/TSX implementation files according to its own QA. The current application architecture includes Platform, NEXT F Digital, Gaming Store and Software domains plus shared services.

All existing regression suites were executed before the first upgrade change. They passed at baseline:

- Architecture: 18/18.
- Platform: 24/24.
- Digital Core: 29/29.
- Digital Operations: 41/41.
- Gaming: 50/50.
- Software: 70/70.
- SaaS Completion: passed.
- Product Completion: 49/49.
- Final Product Acceptance: 67/67.
- Architecture Completion: 76/76.
- Platform Help Center: 72/72.

This is the upgrade safety baseline. Every phase must retain these gates unless a gate is intentionally revised with an explicit migration reason.

### Existing assets we should extend

The current CMS already provides useful foundations:

- Route-level staff permissions.
- Staff roles.
- Platform organizations/workspaces.
- Platform audit.
- Notifications.
- Security/health/log/backup/retention surfaces.
- NEXT F Digital Clients.
- Services.
- Projects and approvals.
- Billing/subscriptions.
- Client Sites.
- Support.
- Automation.
- Digital Settings.
- Repository interfaces suitable for later infrastructure adapters.

### Existing concepts that must not be mistaken for the final model

#### `PlatformUser`

This is a staff-CMS user. It should not become the customer account table.

#### `SharedAccount`

The current Shared Accounts page normalizes customer profiles by email across Digital/Gaming/Software. It is a commerce/customer aggregation view, not a verified NEXT F identity/authentication account. It must not be silently reused as the Customer Workspace authentication model.

#### `Platform WorkspaceRecord`

The current workspace type is an administrative business-domain boundary. It does not yet contain the customer tenancy/membership model required by the new scope. We should evolve Platform workspace infrastructure carefully rather than assuming the existing record already satisfies customer tenancy.

#### `PortalAccess`

The legacy Digital portal model is one client + one email + invited/active/suspended. It is insufficient for Account → Organization → Workspace → Membership → Project/Site/Service authorization. It should be migrated, not extended as the new authority.

#### `DigitalSite`

The current site object tracks operational details such as domain, public URL, status, SSL, maintenance, response time and billing state. It does not yet represent contract pinning, Site Manifest identity, workspace ownership, customer capabilities, service entitlements, publishing governance or customer access policy.

---

## 4. Target relationship model

The target business relationship should converge toward:

```text
NEXT F Account / Identity
        │
        ├── staff authorization (only for NEXT F employees/admins)
        │
        └── customer memberships
                │
                ▼
        Customer Organization
                │
                ▼
        Customer Workspace
          ├── members + customer roles
          ├── service entitlements
          ├── projects
          ├── support
          ├── invoices/subscriptions
          └── managed sites
                    │
                    ▼
              Site Connection
              ├── DigitalSite reference
              ├── contract version
              ├── Site Manifest identity
              ├── manifest validation
              ├── connection state
              └── customer capability policy
```

The Digital client/customer profile remains the commercial/business profile and links to the appropriate customer organization. It does not become the authentication record.

---

## 5. Target internal CMS navigation

We should not copy the prototype's Admin menu literally because several prototype sections already have authoritative homes in the CMS.

### Platform

Keep/evolve:

- Dashboard.
- Staff Users.
- NEXT F Accounts / Identity directory — future evolution of the current account concept, not staff users.
- Organizations & Workspaces.
- Roles & Permissions.
- Audit.
- Notifications.
- Customer Help Center.
- Integrations.
- Security.
- System Logs.
- Infrastructure.
- Health.
- Backup / Retention / Data Management.
- Global Settings.

### NEXT F Digital

Keep/evolve:

- Dashboard.
- Sales.
- Clients.
- Services.
- Projects.
- Billing.
- Client Sites.
- **Website Platform**.
- Support.
- Automation.
- Reports.
- Digital Settings.

### Website Platform staff surface

The Website Platform area should progressively own staff administration for:

- Customer Workspace provisioning.
- Demo Access requests/lifecycle.
- Managed Site connections.
- Contract/manifest readiness.
- Customer memberships summary.
- Service entitlement summary.
- Customer capability policy.
- Approval-required website change queue.
- Publishing governance/operations.
- Website integration health.
- Website CMS module visibility resolved from contracts.
- Customer Workspace support/admin access actions when safely designed.

It should not duplicate Clients, Sites, Support, Platform Users, Platform Audit or Platform Integrations as separate competing tables. It should link to those existing sources of truth.

---

## 6. Phase plan

## Phase 0 — Baseline freeze and architecture map — COMPLETE

### Goals

- Unpack source.
- Record package version and architecture.
- Run every regression suite.
- Identify existing entities that overlap the approved new scope.
- Copy approved scope into the repository.
- Establish no-regression policy.

### Result

Completed before V0.12.0 changes.

---

## Phase 1 — Staff Website Platform foundation — IMPLEMENTED IN V0.12.0

### Goals

- Add internal staff Website Platform route.
- Add a dedicated staff permission.
- Introduce real Customer Workspace provisioning records without granting customer access.
- Introduce managed Site Connection records.
- Introduce separate Demo Access lifecycle records.
- Pin site connections to the documented contract version and manifest filename.
- Fail closed while manifest validation is unavailable.
- Remove the unsafe legacy portal activate/invite shortcut from Client 360.
- Preserve legacy data for later migration.

### Done criteria

- New regression check passes.
- All old checks pass.
- No Customer Workspace frontend is added to the internal CMS.
- No customer authorization is inferred from a client email.
- No canonical website contract IDs are invented.

---

## Phase 2 — Platform identity, organizations, customer workspaces and memberships — IMPLEMENTED IN V0.13.0

This is the most important data-model phase and should be completed before building real Customer Workspace authentication.

### 2.1 NEXT F Account identity

Create a true identity model separate from `PlatformUser` and `SharedAccount`.

Minimum conceptual fields:

- Account ID.
- Primary verified email.
- Display name.
- Verification state.
- Account state.
- Created/updated timestamps.
- Authentication/security references supplied by the production identity adapter later.

Do not put staff role IDs or customer workspace rights directly on the account.

### 2.2 Staff identity link

Staff CMS access should link a NEXT F identity to a staff principal/role assignment. Existing Platform Users can later migrate into that structure.

### 2.3 Customer Organization

Add explicit customer organization records or evolve Platform Organizations with a safe organization kind/classification.

Need to support:

- One organization with multiple people.
- One person in multiple organizations when required.
- One organization with several workspaces/sites/projects/services.
- Organization status/lifecycle.

### 2.4 Customer Workspace

Evolve the V0.12 Customer Workspace record into a Platform-backed tenancy entity while preserving its Digital relationship.

Required lifecycle should cover at least:

- requested,
- provisioning,
- active,
- read-only,
- suspended,
- closed/offboarded.

### 2.5 Membership

Create explicit membership records:

- accountId,
- workspaceId,
- customerRoleId,
- membership status,
- invitation state,
- acceptedAt,
- revokedAt,
- createdBy,
- relevant audit metadata.

A membership is the bridge between identity and customer authorization.

### 2.6 Customer roles

Keep customer roles distinct from staff Platform roles.

The approved scope gives examples such as:

- Owner.
- Customer Admin.
- Content Editor.
- Marketing User.
- Billing Contact.
- Contributor.
- Read Only.

Exact canonical website permissions must still come from Contracts. These business roles should aggregate only valid permissions/entitlements and must not invent website operations.

### 2.7 Migration

Legacy `PortalAccess` rows should be migrated only when the corresponding identity and organization can be resolved safely. No blind email-only conversion should activate production access.

### V0.13.0 implementation result

- Canonical NEXT F Account records are separate from Platform Users and Shared Accounts.
- Staff identity links are separate from staff RBAC.
- Customer organizations are explicitly classified.
- Digital client → customer organization relationships are explicit.
- Customer Workspaces now carry customer organization ownership.
- Membership and invitation records are explicit.
- Customer roles are separate from staff roles.
- Contract permission bindings remain empty/fail-closed until the Registry is available.
- Legacy PortalAccess is assessed only; no automatic production migration occurs.

---

## Phase 3 — Customer Workspace provisioning and Demo Access governance — IMPLEMENTED IN V0.14.0

### Real customer provisioning

Admin workflow should require deliberate steps:

1. Identity/account exists and is verified as required.
2. Digital client/customer relationship exists.
3. Customer organization exists.
4. Eligible project/service relationship exists.
5. Customer Workspace is requested.
6. Staff reviews provisioning requirements.
7. Workspace is created/provisioned.
8. Sites/projects/services are attached explicitly.
9. Membership invitations are issued.
10. Customer accepts invitation.
11. Effective authorization is evaluated from membership + entitlement + contract/capability policy.

Registration alone never performs steps 3–11.

### Demo Access

Implement the full independent lifecycle:

- submitted,
- under review,
- approved,
- rejected,
- active,
- expired,
- revoked,
- extended.

Demo-specific records should include expiry, reviewer, restrictions and environment identity. Demo data must be isolated from production customer data. A demo record must never become a production workspace through a flag flip.

### Admin CMS UX

Website Platform should provide separate tabs/views for:

- Customer Workspaces.
- Memberships.
- Demo Requests.
- Demo Environments.
- Provisioning activity.

### V0.14.0 implementation result

- Workspace request, provisioning review, approval, scoped resource attachment and activation are separate transitions.
- Provisioning checks verified identity, active Digital client, active customer organization, explicit client→organization link and eligible project/subscription-service relationship.
- Projects and services are attached by reference to authoritative Digital records.
- Managed sites remain Digital Sites connected through Site Connection records.
- Workspace activation requires an approved review plus explicit project and service scope and does not create membership access.
- Membership invitation expiry/resend/customer-side acceptance foundations are implemented.
- Demo requests use deliberate review/approval transitions.
- Demo environments are separate synthetic-only records with expiry, reset, extension and revocation.
- Demo environments do not carry production workspace/client/project/site identifiers.
- Provisioning activity is recorded separately while Platform Audit remains the shared audit authority.

---

## Phase 4 — Contract Registry resolver and Site Manifest integration — IMPLEMENTED IN V0.15.0

This phase must not start its canonical mapping implementation until the Contract Registry source/snapshot is available to the development environment.

### Required inputs

- Contract Registry `1.0.0` files or a supported immutable Registry API/snapshot.
- Registry root guidance.
- Relevant starter(s).
- Actual `nextf.site.json` for the site being connected.

### Staff CMS responsibilities

Build a trusted resolver that can:

1. Load exact pinned contract version.
2. Validate Site Manifest schema.
3. Resolve enabled Modules.
4. Resolve dependencies/capabilities.
5. Reject unknown modules/capabilities.
6. Resolve Admin metadata relevant to staff controls.
7. Resolve Customer CMS metadata for visibility/reference where appropriate.
8. Resolve exact API operations.
9. Resolve exact permissions and site scopes.
10. Resolve event/webhook/integration eligibility.
11. Store validation evidence and compatibility status.

### Site connection lifecycle

A Site Connection should advance through explicit states such as:

- registered,
- identity pending,
- manifest received,
- validating,
- incompatible,
- ready,
- connected,
- suspended/revoked.

Exact state names can be finalized during implementation; they are not canonical contract IDs.

### V0.15.0 implementation status

V0.15.0 implements the CMS-side resolver foundation, trust/evidence stores, Site Manifest receipt, canonical validation evidence model and explicit Site Connection lifecycle. The canonical Contract mapping remains intentionally blocked because the Contract Registry `1.0.0` files/API snapshot, Registry root guidance, starters/CMS mappings and actual managed-site `nextf.site.json` inputs are not present in the development environment. No canonical IDs are seeded or invented.

A Registry snapshot can become trusted only through evidence from the official Registry CLI or immutable Registry API. Valid JSON receipt alone never marks a Site Manifest valid.

### Secret rule

Never store secrets in Site Manifest/public registry content. Production service credentials belong in trusted secret storage.

---

## Phase 5 — Service entitlements + Customer Capability Access Policy — IMPLEMENTED IN V0.16.0

The approved authorization rule is the intersection of restrictions, with the most restrictive result winning.

Conceptually:

```text
Canonical contract maximum
∩ Site Manifest support
∩ Workspace/service entitlement
∩ Customer role permission
∩ Resource lifecycle/state
∩ Field-level policy
∩ Privacy/security restriction
= Effective customer capability
```

### Business exposure modes

Support the approved business-level modes:

- hidden,
- read only,
- direct edit,
- approval required.

Editing permission and publishing permission must be independent.

### Policy storage

Do not duplicate canonical permission definitions. Store customer exposure/override policy that references valid contract resources/operations/fields.

### Fail closed

If contract resolution, scope, permission or customer-write policy is missing/ambiguous, deny the customer write.

### Staff UX

Website Platform should show, per connected site:

- Supported modules from manifest.
- Contract maximum.
- Service entitlement.
- Customer exposure mode.
- Customer roles with access.
- Field restrictions.
- Edit permission.
- Publish permission.
- Reason when a capability is unavailable.

### V0.16.0 implementation status

V0.16.0 implements the service-entitlement records, resolver-derived canonical customer access projection, customer capability exposure policy, independent publishing policy, canonical field restrictions, Site-scoped customer-role exact Permission grants, privacy/security reduction overlays and the most-restrictive effective authorization evaluator.

The evaluator requires a connected/valid Site, active or read-only Customer Workspace, accepted active membership, active customer role, current canonical access projection matching current Site validation evidence, Site Manifest capability support, active service entitlement, explicit customer capability policy, resource-state authorization, field policy/security restrictions and exact canonical role permission requirements. Missing or stale information fails closed.

Canonical access projections are immutable evidence tied to a specific V0.15 validation result. A later Site revalidation automatically makes older projections stale for authorization purposes.

Because the authoritative Contract Registry files/API snapshot and actual managed-site manifests are still unavailable in this environment, V0.16.0 contains **no fabricated canonical capability, field or permission seeds**. The staff policy UI remains empty/disabled until official resolver output supplies those values.

---

## Phase 6 — Change requests, approvals, revisions and publishing governance — IMPLEMENTED IN V0.17.0

### Approval-required edits

A customer proposal must remain separate from authoritative/published content until approved.

A change request should capture:

- Workspace.
- Site/resource.
- Requester.
- Base revision/version.
- Proposed changes.
- Status.
- Staff reviewer.
- Review notes.
- Timestamps.
- Resulting revision if applied.
- Audit/event references.

### Concurrency

If the authoritative resource changes after the proposal was created, the system must detect the stale base revision. Do not silently overwrite newer changes.

### Publishing

Treat separately:

- edit permission,
- submit-for-approval permission,
- approve permission,
- publish permission.

Publishing may be direct for some contract/service combinations and staff-only for others.

### Internal CMS surfaces

Add:

- Change Request queue.
- Approval detail.
- Diff/revision context.
- Conflict state.
- Publish operation status.
- Audit evidence.

### V0.17.0 implementation status

V0.17.0 implements an external-revision evidence model rather than copying authoritative website content into the staff CMS. Customer proposals are anchored to explicit base revisions and are accepted only when V0.16 evaluates each proposed field to the `change_request` execution path.

Review history is recorded separately from the proposal. Starting review, approval and adapter application all re-check revision concurrency. A newer authoritative site revision moves stale proposals to `conflict` rather than rebasing or overwriting silently. Approval does not mutate the connected website; an adapter application receipt is required before a resulting external revision becomes the current observed head.

Publishing is a separate workflow. V0.16 `publish_request` decisions create staff-review publication requests while `direct_publish` decisions create direct-authorized publication requests. Neither approval nor authorization is recorded as published until an adapter publishing receipt confirms the exact target revision/hash and publication reference.

The staff Website Platform now exposes **Approvals & Publishing** queues. No customer-facing UI, fake resource revisions, or fabricated Contract IDs are seeded in this release.

---

## Phase 7 — Shared backend/API boundary for Admin CMS and Customer Workspace — IMPLEMENTED IN V0.18.0

The Admin CMS and Customer Workspace should display the same authoritative business entities instead of copying them.

### Shared business entities

Examples:

- projects,
- milestones,
- deliverables,
- approvals,
- invoices,
- subscriptions,
- support tickets,
- sites,
- files/metadata,
- website change requests.

### View models

Staff and customers can receive different projections of the same entity. Sensitive/internal fields are filtered server-side.

### Mutation paths

Customer operations must use customer-authenticated APIs that enforce:

- principal,
- membership,
- workspace/tenant scope,
- exact permission,
- service entitlement,
- site capability,
- resource state,
- field policy,
- risk/recent-auth rules when applicable.

The Admin CMS can use staff-authorized APIs with staff roles but should still respect scope and audit rules.

### V0.18 implementation additions

- V1 operation registry with query/command separation.
- Server-derived staff/customer/demo/public/service principal models.
- Customer organization/workspace/membership binding and cross-workspace denial.
- Synthetic-only Demo principal isolation.
- Public `nextf.lk` lead and Demo Access Request ingress as low-trust commands.
- Mandatory idempotency for every registered mutation.
- Backend audit contract with request/correlation IDs.
- Separate staff/customer/demo projections.
- Managed-site adapter interfaces that preserve V0.17 optimistic concurrency and receipt requirements.
- Explicit production-adapter readiness; V0.18 does not claim a deployed backend.

---

## Phase 8 — `nextf.lk` first-party integration

The public NEXT F Digital website should become a first-party consumer of controlled platform APIs/events, not a direct database client.

### Public-site flows to connect

Based on the approved scope, likely categories include:

- Account registration/login entry.
- Customer Workspace product/demo discovery.
- Demo Access Request submission.
- Contact/lead forms into Digital Sales.
- Service/package public projection.
- Projects/case-study public content where deliberately published.
- Help/knowledge public projection where applicable.
- Customer Workspace sign-in link.

Exact page/route/component mapping must be based on the live site source, not guessed.

### Public write rule

Forms and demo requests should enter dedicated public APIs with validation, spam/abuse protection, rate limiting and event/audit evidence. They should not post directly into internal browser stores or D1 tables from the frontend.

### V0.19 implementation additions

- Dedicated `nextf.lk` first-party site identity owned by NEXT F Digital rather than a fake Customer Workspace tenant or Digital Client.
- Explicit public publication records over authoritative Services, completed Projects and published Digital/All Help Center content.
- Safe-field allowlists and publication/withdrawal lifecycle; source records remain authoritative.
- V1 public reads: bootstrap, Services, Case Studies and Help resources.
- Governed public lead mapping into Digital Sales, including privacy/marketing evidence and support for general enquiries without a selected service.
- Demo Access Requests mapped into the existing V0.14 review/provisioning lifecycle.
- PII-rejecting first-party conversion-event registry and idempotent `public.conversion.track`.
- Staff `Website Platform → nextf.lk Integration` surface.
- Logical route/component inventory remains fail-closed/unmapped until the real public-site source or a verifiable live crawl is available.
- Platform domain seed corrected to `nextf.lk`.

---

## Phase 8.5 — Dependency-backed build and visual smoke QA — SOURCE HARDENING IMPLEMENTED IN V0.20.0

Before production infrastructure adapters, install the locked dependency tree in an internet-enabled development environment and run the real application build/runtime.

Required work:

- `npm ci`;
- full `npm run build`;
- start Vite production preview/development runtime;
- smoke-test Platform + NEXT F Digital + Website Platform;
- inspect the new `nextf.lk Integration` staff surface;
- desktop/tablet/mobile responsive checks;
- console/runtime error review;
- correct any dependency/type/runtime/UI regressions before infrastructure migration.

This phase is deliberately separate from source-level `transpileModule` verification.

---

## Phase 9 — Production infrastructure adapters — FOUNDATION IMPLEMENTED IN V0.21.0

Only after the domain models/API contracts stabilize should the project replace browser-persistent repositories with production adapters.

The current source already expects this as a later stage.

Production work will need deliberate design for:

- Cloudflare Workers/API layer.
- D1 schema/migrations if D1 remains the selected database.
- R2 for files/media where applicable.
- Queues/Workflows for asynchronous operations where required.
- Secret storage.
- Staff authentication/Cloudflare Access integration.
- Customer authentication/session architecture.
- Email provider.
- Rate limiting/abuse prevention.
- Scheduled expiry/renewal/demo jobs.
- Observability/logging.
- Backup/restore.
- Environment separation.

Do not let infrastructure shape bypass the domain/authorization model.

---

## Phase 10 — Separate Customer Workspace application — SPLIT INTO A SEPARATE NEW PROJECT

This phase is no longer part of the main-CMS execution roadmap. `workspace.nextf.lk` will be built as a separate new project/product repository after the main CMS source roadmap is closed. It will consume the shared backend/contracts rather than sharing the internal CMS frontend.

The prototype can guide information architecture for customer website-management modules such as Pages, Collections, Blog, Documentation, Media, SEO, Analytics, Conversions, Forms/Leads, Navigation, Integrations, Consent, Health, Publishing, Versions, Settings, Users, Webhooks and Activity — but only modules/capabilities actually enabled by the Site Manifest and entitlements may appear.

The Customer Workspace will also show NEXT F Digital business relationship data such as projects, deliverables, approvals, billing and support, using the same system of record as staff.

---

## Phase 11 — Lifecycle, offboarding, portability and production acceptance — SOURCE IMPLEMENTED IN V0.22.0

Before go-live, complete:

- Project/service completion behavior.
- Subscription/entitlement expiry behavior.
- Payment-related restrictions without unsafe automatic site shutdown.
- Workspace read-only transitions.
- Membership revocation.
- Site disconnection/revocation.
- Data export.
- Retention.
- Contract/version migration.
- Customer asset ownership rules.
- Audit retention.
- Demo cleanup/reset.
- Production security review.
- Disaster/restore test.
- End-to-end acceptance tests.

---

## 7. Phase QA policy

Every phase must include four layers of verification.

### A. Existing regression preservation

Run all existing suites. A new feature is not accepted when it breaks an unrelated completed subsystem.

### B. New phase-specific regression

Add a deterministic script/test suite that asserts the new architecture rules, not just UI files.

### C. Type/build validation

Run the actual dependency-backed TypeScript/Vite build in a normal environment with dependencies installed.

The received source notes that dependency installation previously timed out in its execution environment. This remains a production prerequisite.

### D. Visual/interaction smoke test

Verify desktop and mobile behavior, keyboard access, empty/loading/error states, confirmations, permission denial and route access.

---

## 8. Migration policy

### Never silently reinterpret legacy data

Examples:

- A legacy portal email is not automatically a verified Account.
- A Digital Client is not automatically a Customer Organization.
- A site is not automatically Customer Workspace-connected.
- A service is not automatically a website entitlement.
- A prototype module label is not automatically a canonical Contract Module ID.

### Prefer additive migration

During local architecture phases:

1. Add new versioned stores/entities.
2. Keep old store readable.
3. Build mapping/preview.
4. Validate conflicts.
5. Apply explicit migration.
6. Keep audit/migration evidence.
7. Remove legacy path only after acceptance.

---

## 9. What we should not do

Do not:

- Merge the Customer Workspace into the internal CMS.
- Give customers staff Platform roles.
- Treat account registration as workspace access.
- Use one email/client row as customer authorization.
- Create a second copy of projects/invoices/tickets for customers.
- Let UI visibility act as authorization.
- Guess contract IDs from the prototype.
- Put secrets in Site Manifests.
- Let the public website read internal tables directly.
- Turn Customer Workspace into unrestricted hosting/server/code administration.
- Let Gaming Store or Software business-specific architecture complicate this Digital phase.
- Delete completed modules merely because they are out of current scope; freeze them unless a deliberate product decision says otherwise.

---

## 10. Current implementation status after V0.25.0

### Main CMS source roadmap complete

- V0.11 baseline through V0.19 domain/API/public-site foundations preserved.
- V0.20 runtime/release source hardening implemented; real dependency-backed build/browser smoke remains an external acceptance gate.
- V0.21 Cloudflare production infrastructure foundation implemented in source: Workers/D1/R2/Queues/Access/Rate Limiting/Turnstile/secrets contracts, D1 migration, production runtime client and fail-closed deployment model.
- V0.22 lifecycle/offboarding/portability/contract-migration governance and production acceptance ledger implemented.
- V0.23 Production Go-Live P0 implemented: root `cms.nextf.lk` routing, Light/Dark/System themes, SPA fallback and production frontend environment scaffolding.
- V0.24 Production Go-Live P1 implemented: operational business stores use a shared production durable boundary; Cloudflare Worker staff state handlers persist to D1 with server permissions, idempotency, optimistic concurrency and audit evidence.
- V0.25 Production Go-Live P2 implemented: production frontend startup resolves the verified Cloudflare Access principal from an exact active D1 staff binding before loading durable state; local staff impersonation is unavailable in production mode.
- Phase 10 Customer Workspace removed from this repository and moved to a new `workspace.nextf.lk` project.

### External gates still required before production V1.0

Source completion must not be confused with production deployment acceptance. The Website Platform production acceptance ledger remains authoritative for the final release decision. Critical open gates now include deployed Cloudflare bindings and Access policy evidence, real staff binding/bootstrap, dependency-backed build/browser smoke, migrations/restore drill, authoritative Contract Registry + real Site Manifest, real managed-site adapter receipts, public ingress abuse controls in the deployed environment and a real offboarding/export/revocation E2E exercise.

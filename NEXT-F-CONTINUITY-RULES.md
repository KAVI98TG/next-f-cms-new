# NEXT F Project Continuity Rules

## Core rule

**Migrate forward. Never build backward.**

Every change must start from the latest validated canonical release, not from an older ZIP, branch, source snapshot, or partially reconstructed package.

The live contract registry at `https://contracts.nextf.lk/` is the canonical integration reference. If local code, old documentation, or a ZIP conflicts with the live contract registry, stop and reconcile before changing production code.

## 1. Canonical release baseline

Each repo must contain a `RELEASE-STATE.json` (or equivalent checked-in manifest) recording:

- application name
- current version
- parent/baseline version
- release date
- schema version
- contract version
- enabled production features
- required routes/workflows
- required secrets/bindings by name only
- migration IDs already required

A new release may only be produced from the version named as the current canonical baseline.

If the working tree does not match the manifest, **stop instead of packaging**.

## 2. No feature rollback by accident

New work is additive unless removal is explicitly approved.

Before release, regression gates must verify that previously accepted production capabilities still exist. At minimum this includes the major NEXT F Gaming/CMS workflows: storefront/product pages, checkout, account/orders, support, suppliers, funding, reviews, notifications, media, storefront merchandising, operations, and current non-modal UX rules.

A feature may not disappear merely because a newer package was created from an older source baseline.

## 3. Source history vs active source

Keep old code, but keep it **out of the active runtime tree**.

Use Git commits/tags/releases for historical source. ZIP releases are immutable artifacts for recovery/reference only. Never use an older ZIP as the source parent for a newer release when a newer canonical release already exists.

Recommended tags:

- `cms-vX.Y.Z`
- `gaming-vX.Y.Z`

## 4. Production data classification

### A. Authoritative business records — preserve

Do not delete or overwrite historical business facts during normal releases:

- orders
- payment attempts and confirmations
- refunds
- fulfillment/delivery events
- supplier funding records
- customer reviews and moderation history
- support cases and audit history
- price/cost/FX/margin snapshots used for completed transactions
- consent/policy acceptance records where required
- finance/accounting records
- immutable commerce/security audit events

Corrections should normally create a new event/status/change record rather than rewriting history.

### B. Current configuration — version and audit

Keep one current effective configuration plus change history for important settings:

- supplier configuration
- payment availability
- pricing rules
- storefront merchandising
- feature flags
- notification configuration
- risk/limits

Configuration changes should record who changed what and when.

### C. Operational/derived data — retain by policy, not forever

Examples:

- webhook raw payloads
- notification delivery attempts
- supplier sync runs
- API/worker operational logs
- analytics events
- health snapshots

Keep them for a documented retention window, then aggregate/archive/delete as appropriate. They must never be treated as the only copy of an authoritative business record.

### D. Ephemeral data — safe to expire

Examples:

- caches
- temporary upload state
- UI drafts not explicitly saved
- temporary session artifacts
- expired preview data

These may be deleted automatically and must not be required to reconstruct a completed order/payment/review/funding action.

## 5. Database migration rule

Use forward-only, numbered migrations. Never edit a migration that has already reached production.

Preferred sequence for schema changes:

1. Add new columns/tables/indexes in a backward-compatible way.
2. Deploy code that can read old + new shapes.
3. Backfill old data if needed using an idempotent job/migration.
4. Switch writes to the new shape.
5. Verify production.
6. Only in a later release remove deprecated fields/tables, after backup and explicit approval.

Destructive migrations require a backup/export and a documented rollback/recovery plan.

## 6. Legacy data must not conflict with current data

When old data must remain, isolate it instead of mixing meanings:

- use stable internal IDs
- store provider IDs in dedicated fields with unique constraints where appropriate
- keep `source/provider` fields explicit
- keep schema/data version fields when meaning changes
- archive retired structures as read-only rather than letting old and new writers update both
- never reuse an idempotency key namespace for a different operation

For cross-service idempotency, derive a deterministic service/operation namespace before forwarding keys, e.g. `cms-gaming:<operation>:<fingerprint>`.

## 7. API and contract compatibility

Public/internal API changes should be additive first.

- new fields: optional until all consumers understand them
- renamed fields: support old + new during a compatibility window
- removed fields/routes: only after all known consumers migrate
- contract version changes: update the live registry and release manifest together

No local type should silently redefine a canonical contract differently from the live registry.

## 8. Secrets and runtime bindings

Required production secrets/bindings must be declared and checked by deployment validation.

- never store secret values in Git/release artifacts
- never use dummy production secrets
- validate required secret names before deployment
- distinguish “secret exists” from “runtime binding is usable” with safe boolean diagnostics where needed

## 9. Release gate

A release is not canonical until all applicable gates pass:

- frontend full build
- Worker/API TypeScript build
- targeted feature checks
- regression checks for previously accepted workflows
- schema/migration verification
- contract compatibility check
- release hygiene check
- no unexpected deleted routes/features

If any gate fails, the previous canonical release remains current.

## 10. Packaging rule

Full release packages must be created from the validated canonical working tree only.

Before packaging, compare the new tree against the current canonical release and review unexpected deletions. A release that unexpectedly removes established files/routes/features must fail packaging.

Delta patches must declare the exact parent version and refuse to apply to another baseline.

## 11. Recovery rule

Before risky production changes, preserve:

- Git/tagged source
- migration state
- database backup/export where appropriate
- current Worker deployment/version IDs
- current non-secret configuration

Secrets should have a separate documented recovery/rotation procedure; never export them into release ZIPs.

## 12. Current project principle

NEXT F is a continuously evolving commerce platform. Historical facts remain historical; software and schemas move forward. We preserve the data needed for commerce, finance, support, trust, and auditability, while preventing old code/data shapes from becoming active competing sources of truth.

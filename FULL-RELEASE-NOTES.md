# NEXT F CMS v1.0.54 — Reviews Layout Consistency

Canonical parent: **v1.0.53**.

Restores the shared CMS page gutters on Reviews and adds consistent spacing between the header, summary, moderation queue, and policy notice. Keeps responsive spacing and the review API unchanged. No D1 migration or new secret.

## Previous release

# NEXT F CMS v1.0.53 — Reviews Workspace UI

Canonical parent: **v1.0.52**.

Reworks the Customer Reviews summary, moderation toolbar, and empty state into a compact responsive workspace with clearer review flow guidance. The functioning Reviews API bridge is unchanged. No D1 migration or new secret.

## Previous release

# NEXT F CMS v1.0.52 — Reviews Bridge Recovery

Canonical parent: **v1.0.51**.

Reviews use a dedicated CMS-to-Gaming credential, separate from promotions and operations. Unavailable metrics no longer appear as zero. No D1 migration.

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

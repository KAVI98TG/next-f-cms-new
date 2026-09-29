# CMS production account migration — deployment hold

**Status:** local configuration preparation only. No deployment or remote mutation is authorized. The live CMS v1.0.64 remains the production baseline on the existing account until the owner explicitly approves a new-account deployment. CMS staging is out of scope and will not be migrated.

## Target and known facts

- New Cloudflare production account: `df47917ecc2d22a3612202862f42fb38`.
- Intended Cloudflare production super-admin identity: `nextf.cms.lk@gmail.com`. Account-level Super Administrator membership must be verified in Cloudflare; this email alone does not prove membership or grant CMS application permissions.
- New-account D1 `nextf-cms-production`: `0784f4cf-85c1-4fe5-9f4f-b4c3af11f13e`.
- The owner reports D1 and R2 data migration complete. Their contents, destination bucket names, migration records, and recovery points have not yet been independently verified.
- Local Worker production config now pins the target account and D1 ID. Old Access issuer/AUD values were removed and replaced with unresolved markers. The npm production deploy entrypoints fail closed until the new Access values, explicit new-account ID in the execution environment, and a one-command approval flag are supplied.
- The `FILES` and `MEDIA` R2 binding names/bucket names remain as previously configured. Their existence and contents in the new account are **unverified**; matching names must not be assumed to prove a complete migration.

## Required inventory before approval

Read-only checks must target the **new account ID explicitly**. Do not run commands against the old production account or infer the active Wrangler login account.

1. Verify new-account Super Administrator membership for the intended identity and verify that the `nextf.lk` zone/custom domains can be attached in that account. Do not move DNS or domains as part of inventory.
2. Verify the migrated D1 name/ID, table/schema and migration history, representative row counts, staff identity bindings, and a usable recovery point. Do not apply analytics migrations or alter records yet.
3. Verify the new-account `FILES` and `MEDIA` R2 bucket names, representative object counts/checksums/access policy, and any media-serving credentials. `NEXTF_MEDIA_R2_ACCOUNT_ID` and R2 access-key secrets are account-specific and must be reissued for the new account rather than copied blindly.
4. Inventory both Queue producers/consumers and dead-letter queues, the tracking Analytics Engine dataset, rate limiter, Pages project, Worker name/routes/cron, Turnstile widget and secret, and all required Worker secrets. Confirm exact new-account resource names and creation/migration state. Do not migrate CMS staging.
5. Create or verify the new Cloudflare Access applications/policies for CMS/API, including required MFA and the public-path exception for the dedicated project-request endpoint. Record the new team domain and application AUD. The old account's issuer/AUD must never be reused.
6. Verify the new Access JWT subject for `nextf.cms.lk@gmail.com`. A separate active CMS `staff_identity_bindings` record with authorized canonical permissions is required in the new D1; Cloudflare Super Administrator status does not bypass CMS authorization. Review migrated staff grants before any activation.
7. Verify dependent Gaming, Checkout, main-Site ingestion, media and tracking integrations have corresponding new-account endpoints/credentials where needed. Rotate or rebind secrets; never place values in source or a Site Manifest.

## Proposed deployment sequence — only after explicit approval

1. Freeze a reviewed CMS v1.0.64 artifact or exact source revision. The current local worktree contains **unreleased multi-Site analytics changes**; deploying it under a v1.0.64 label would be incorrect. Keep analytics property routing disabled and do not include Phase 42 migrations in a baseline migration deploy.
2. Record the new-account resource inventory and recovery evidence. Fill in the new Access team domain/AUD and confirmed resource binding names, then run local config/release/type/build checks. Perform a no-mutation Wrangler dry run using explicit new-account credentials and inspect its target/bindings.
3. Prepare the new-account Worker, Pages project, Access policies, Queue consumers, secrets and domain cutover according to the verified inventory. Use a route-free or otherwise non-public canary first; the current production Worker config includes live custom domains and must not be used for an early canary deploy.
4. Verify the canary API against the new D1/R2 and new Access identity. Confirm CMS staff authorization, representative media reads, Queue processing, integration health, and no data writes to the old account.
5. Coordinate the production domain/DNS cutover manually, then deploy the reviewed v1.0.64 baseline to the new Worker/Pages targets. Verify login, API, CMS UI, project-request public path, media, tracking, and rollback. Keep the old environment untouched until a separately approved retirement decision.
6. Treat the unreleased V1.5.0 multi-Site analytics work as a **separate later release**. Only after a new-account baseline is stable: review migration `0003`–`0005`, stage validated Site evidence, provision properties, test isolation/consent/rollback, finalize a new CMS release, and request explicit deployment approval for that release.

## Hard stop conditions

- No deployment approval; do not run `wrangler deploy`, Pages deploy, remote D1 migrations, or production write commands.
- New Access issuer/AUD, R2 bindings, Queue/DLQ, dataset, required secrets, staff binding, zone/custom domains, or recovery evidence unresolved.
- Wrangler authentication/account does not match `df47917ecc2d22a3612202862f42fb38`.
- The artifact to be deployed is the current dirty multi-Site analytics worktree mislabeled as v1.0.64.
- Any command would mutate or route traffic through the old production account, or migrate CMS staging.

## Rollback boundary

Keep the old-account production resources and data unchanged during new-account preparation. A DNS/route rollback, if later approved and technically available, is a separate operational action; do not assume copied D1/R2 data remains synchronized after cutover. Record a recovery point and post-cutover write ownership before changing traffic.

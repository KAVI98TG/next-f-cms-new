# NEXT F CMS Cloudflare Production Adapter

This directory is the production-infrastructure foundation for the internal NEXT F CMS and the shared backend boundary.

## Bindings

- **Workers** — HTTP API/edge runtime.
- **D1** — durable business documents, audit, idempotency, staff identity bindings and outbox metadata.
- **R2** — file/object payloads; D1 stores metadata only.
- **Queues** — asynchronous events and integration delivery. Consumers must be idempotent because delivery is at-least-once.
- **Workflows** — recommended for durable multi-step provisioning, offboarding, export and long-running integration jobs.
- **Rate Limiting + Turnstile** — public `nextf.lk` mutation protection.
- **Cloudflare Access** — staff CMS perimeter. The Worker still validates the Access JWT and maps it to an active staff identity binding.
- **Workers Secrets** — Access/service/Turnstile and provider secrets. No secrets belong in source, Site Manifest or D1 public projections.

## Required secrets

Set using Wrangler/Cloudflare secret management, never commit values:

- `TURNSTILE_SECRET_KEY`
- `SERVICE_CREDENTIAL_SECRET`
- `NEXTF_MAIN_SITE_INGEST_TOKEN` — dedicated bearer credential for the `nextf.lk` server-to-server project-request receiver. Do not reuse the service credential or Turnstile secret.

Additional provider credentials should use separate least-privilege secrets.

## Recovery

Use D1 Time Travel for short-horizon point-in-time recovery. For retention beyond the platform Time Travel window, schedule encrypted/exported database artifacts into a restricted R2 backup bucket and test restoration regularly.

## Staff identity boundary

Staff routes verify the Cloudflare Access JWT and then require an active exact-subject `staff_identity_bindings` row. `staff.session.get` provides the frontend with the bound server principal and permissions. Production frontend bootstrap fails closed before rendering when identity verification/binding fails. Configure the deployed Access policy (including the required MFA policy) separately; source code does not claim that the Access JWT proves a specific MFA factor.

## Main website project-request integration

The canonical production project form uses `nextf.lk` server-side Turnstile verification and then calls `POST /v1/integrations/nextf/project-requests` with a dedicated bearer token. Cloudflare Access must bypass only that exact path; the Worker still enforces the dedicated token, live Contracts authority, payload relationships and D1 idempotency. See `docs/V1.0.0-NEXTF-MAIN-SITE-PROJECT-REQUEST-INGESTION.md`.

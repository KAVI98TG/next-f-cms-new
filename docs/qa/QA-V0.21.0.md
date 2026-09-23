# QA — V0.21.0 Production Infrastructure Foundation

Run `npm run check:production-infrastructure` plus every historical regression gate.

The source gate verifies bindings, JWT validation behavior, public abuse protection, durable idempotency, D1 schema, optimistic concurrency, fail-closed production runtime selection and Infrastructure UI disclosure.

Deployment acceptance remains separate because Cloudflare account resources, credentials, DNS/Access configuration and real remote data cannot be created from a source-only handoff.

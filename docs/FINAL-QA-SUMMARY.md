# NEXT F Main CMS — Final Source QA Summary

## Release candidate

`0.22.0` — Main CMS Completion Candidate

## Deterministic regression matrix

All 22 source regression gates pass.

**Total: 1,225 / 1,225 assertions passed.**

The matrix covers the original architecture and business-domain suites plus Website Platform, identity/membership, provisioning/demo, Contract Registry, capability policy, approvals/publishing, shared backend/API, `nextf.lk`, runtime readiness, production infrastructure and lifecycle/production acceptance.

## Source integrity

- Executable TypeScript/TSX files checked: **189**
- Syntax diagnostics: **0**
- Relative imports checked: **685**
- Unresolved relative imports: **0**
- Cloudflare infrastructure adapter independent TypeScript check: **PASS**
- Lifecycle governance store independent TypeScript check: **PASS**

## External production gates intentionally not marked passed

The source handoff cannot prove account/environment-specific operations that require NEXT F infrastructure or unavailable external inputs. These remain explicit production acceptance gates:

- successful `npm ci` and full `npm run build` in an internet-enabled environment;
- browser/runtime/visual smoke testing;
- deployed Cloudflare Workers/D1/R2/Queues/Rate Limiter bindings;
- Cloudflare Access application/audience and real staff identity mapping;
- D1 migration + restore drill;
- deployed public Turnstile/rate-limit/idempotency checks;
- authoritative `contracts.nextf.lk` Registry input and real managed-site `nextf.site.json`;
- real managed-site revision/change/publish adapters and credentials;
- real-customer offboarding/export/revocation end-to-end acceptance.

The Website Platform production acceptance ledger is designed to record concrete evidence for these gates. Until all critical gates are passed, the package must not be represented as deployed production `1.0.0`.

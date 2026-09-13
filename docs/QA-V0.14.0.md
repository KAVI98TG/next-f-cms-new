# QA — NEXT F CMS V0.14.0

## Regression result

All quality gates are green after the V0.14.0 provisioning/demo upgrade:

- Architecture: 18/18
- Platform: 24/24
- Digital Core: 29/29
- Digital Operations: 41/41
- Gaming Store: 50/50
- Software: 70/70
- SaaS Completion: 34/34
- Product Completion: 49/49
- Final Product Acceptance: 67/67
- Architecture Completion: 76/76
- Help Center: 72/72
- Website Platform Foundation: 21/21
- Identity & Membership Foundation: 27/27
- Workspace Provisioning & Demo Governance: 42/42

## Source integrity

- 171 TypeScript/TSX source files discovered including declaration source.
- 170 executable TypeScript/TSX files syntax-transpiled with TypeScript 5.8.3.
- 0 syntax diagnostics.
- 614 relative imports inspected.
- 0 unresolved relative imports.

## Production build attempt

`npm run build` was executed from the V0.14.0 source root.

It stops before application compilation because the delivered archive intentionally contains no installed `node_modules`. The environment therefore cannot resolve:

- `react` type definitions;
- `react-dom` type definitions;
- `vite/client` type definitions;
- `node` type definitions.

This is recorded as an environment/dependency limitation, **not** as a successful production build and **not** as evidence of an application source failure.

Run the following in an internet-enabled development/CI environment before deployment verification:

```bash
npm ci
npm run build
```

Then rerun every QA command listed in `README.md`.

## V0.14-specific safety assertions

The V0.14 suite verifies that:

- verified identity is required for real-customer provisioning review;
- Digital client and Customer Organization must be active;
- the client→organization relationship must be explicit;
- an eligible project/subscription service relationship must exist;
- lifecycle movement uses validated workspace transitions;
- projects/services/sites are attached deliberately;
- workspace activation requires explicit project + service scope;
- activation does not grant membership;
- demo environments are independent, synthetic-only records;
- demo environments contain no production workspace/client/project/site IDs;
- production integrations, publishing, secrets and real customer data are restricted from demo environments;
- demo lifecycle includes provision, activate, extend, reset, expire and revoke;
- generic public demo-status mutation is not exposed;
- invitation expiry/resend/customer-side acceptance are distinct;
- Contract/Site Manifest behavior remains fail-closed.

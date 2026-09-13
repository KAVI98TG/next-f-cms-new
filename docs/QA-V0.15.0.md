# QA — NEXT F CMS V0.15.0

## Regression result

All 15 repository QA gates passed after the Contract Registry resolver foundation upgrade:

| Gate | Result |
|---|---:|
| Architecture | 18 / 18 |
| Platform | 24 / 24 |
| NEXT F Digital Core | 29 / 29 |
| NEXT F Digital Operations | 41 / 41 |
| Gaming Store regression | 50 / 50 |
| NEXT F Software regression | 70 / 70 |
| SaaS completion | 34 / 34 |
| Product completion | 49 / 49 |
| Final acceptance | 67 / 67 |
| Architecture completion | 76 / 76 |
| Help Center | 72 / 72 |
| Website Platform V0.12 | 21 / 21 |
| Identity & Membership V0.13 | 27 / 27 |
| Provisioning & Demo V0.14 | 42 / 42 |
| Contract Registry V0.15 | 49 / 49 |

## Source integrity

Global TypeScript `transpileModule` syntax validation:

- 171 executable TS/TSX files checked;
- 0 syntax diagnostics.

Relative-import integrity:

- 617 relative imports checked;
- 0 unresolved imports.

## Contract safety checks

V0.15 verifies that:

- Contract Version remains exactly `1.0.0`;
- Site Manifest filename remains `nextf.site.json`;
- Registry evidence is staged/trusted/rejected separately;
- staff UI has no manual Registry-trust action;
- trusted Registry evidence requires official CLI/API authority plus immutable reference, content hash and verifier identity;
- conflicting trusted hashes for the immutable `1.0.0` Registry are rejected as drift;
- every Site Manifest receipt is retained as immutable evidence instead of overwriting prior JSON;
- raw JSON receipt is not treated as canonical manifest validation;
- validation requires trusted Registry evidence;
- validation results are accepted only for the exact manifest and Registry snapshot already bound in an active validation cycle;
- exact manifest Contract Version must match the Site Connection;
- unknown Modules or Capabilities block readiness;
- incompatible results stay fail-closed;
- exact canonical IDs are stored only from resolver output;
- Managed Sites cannot connect until ready + canonically valid;
- legacy `pending` Site Connections normalize to `registered`.

## Production build attempt

`npm run build` was executed.

It stops before application type-check/build because this source handoff intentionally has no installed `node_modules`. The available compiler reports missing external type definitions:

- `react`
- `react-dom`
- `vite/client`
- `node`

This is an environment/dependency-installation limitation, not a successful production build and not being reported as one.

Run in an internet-enabled development environment:

```bash
npm ci
npm run build
```

A dependency-backed build and browser smoke pass remain required before production infrastructure work.

## External Contract Registry availability

The current execution environment could not resolve `contracts.nextf.lk`, and the source handoff does not contain the authoritative Registry `1.0.0` snapshot or real Site Manifests. Therefore canonical Contract mapping was deliberately not fabricated. See `V0.15.0-CONTRACT-REGISTRY-RESOLVER-FOUNDATION.md`.

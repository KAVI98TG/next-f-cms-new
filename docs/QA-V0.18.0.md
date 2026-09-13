# NEXT F CMS V0.18.0 — QA Report

## Result

**PASS — all deterministic regression gates are green.**

V0.18.0 adds the Shared Backend/API Boundary while preserving every prior completed CMS regression gate.

## Regression matrix

| Gate | Result |
| --- | ---: |
| Architecture | 18 / 18 |
| Platform | 24 / 24 |
| NEXT F Digital Core | 29 / 29 |
| NEXT F Digital Operations | 41 / 41 |
| Gaming Store regression | 50 / 50 |
| NEXT F Software regression | 70 / 70 |
| SaaS | 34 / 34 |
| Product completion | 49 / 49 |
| Final acceptance | 67 / 67 |
| Architecture completion | 76 / 76 |
| Help Center | 72 / 72 |
| Website Platform V0.12 | 21 / 21 |
| Identity / Membership V0.13 | 27 / 27 |
| Provisioning / Demo V0.14 | 42 / 42 |
| Contract Registry V0.15 | 49 / 49 |
| Capability Policy V0.16 | 84 / 84 |
| Change / Approvals / Publishing V0.17 | 73 / 73 |
| Shared Backend/API Boundary V0.18 | 119 / 119 |
| **Total** | **945 / 945** |

## V0.18-specific assertions

The V0.18 gate verifies, among other items:

- staff/customer/demo/public/service trust zones;
- Customer principal binding to Account + Organization + Workspace + Membership + Customer Role;
- explicit cross-workspace denial;
- active/accepted Membership requirement;
- synthetic-only Demo Environment isolation;
- low-trust `nextf.lk` public ingress without Customer Workspace scope;
- public abuse-protection prerequisite;
- service scope enforcement;
- V1 query/command operation registry;
- required idempotency for registered mutations;
- idempotency binding to command + principal + normalized request fingerprint;
- separate staff/customer/demo projections;
- customer projection secret/internal-field exclusion rule;
- managed-site adapter observe/apply/publish interfaces;
- Contract/Manifest validation evidence pinning;
- optimistic-concurrency revision/hash inputs;
- adapter receipt requirements;
- backend audit request/correlation IDs;
- development-only nature of the memory idempotency repository;
- explicit production-adapter readiness UI;
- approved scope requirements for separate Customer Workspace/backend authorization;
- master-plan rule that `nextf.lk` must not become a direct internal database client.

## Source syntax / import verification

A TypeScript `transpileModule` syntax pass was run over all executable source files.

- Executable TS/TSX files: **183**
- Syntax diagnostics: **0**
- Relative imports inspected: **663**
- Unresolved relative imports: **0**

The V0.18 backend core (`types`, operation registry, authorization, idempotency, boundary, projections, audit and managed-site adapter contracts) was also independently type-checked with TypeScript and passed.

## Full production build attempt

Command:

```bash
npm run build
```

Result: **environment/dependency blocked before application compilation**.

The source handoff does not include installed `node_modules`. TypeScript therefore cannot resolve:

- `react` type definitions;
- `react-dom` type definitions;
- `vite/client` type definitions;
- `node` type definitions.

This is the same source-only handoff constraint as prior phases. It is not reported as a successful production build.

In an internet-enabled development/CI environment, run:

```bash
npm ci
npm run build
```

before deployment acceptance.

## Visual/runtime smoke limitation

A browser runtime smoke test was not possible in this execution environment because the project dependencies are not installed and therefore the Vite development server cannot be started. The new Website Platform UI source passes syntax/import checks and its deterministic architecture assertions.

## Production items intentionally not claimed by V0.18

The following are contracts/interfaces only and remain future adapters:

- production HTTP/API transport;
- staff/customer production identity/session provider;
- D1/remote persistence repositories;
- durable distributed idempotency;
- production abuse/rate-limit implementation;
- server secret storage;
- managed-site adapter credentials and concrete adapters;
- Customer Workspace frontend.

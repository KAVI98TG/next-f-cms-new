# QA — V0.19.0 `nextf.lk` First-Party Integration

## Result

**PASS at source/architecture level.**

All historical and current regression gates are green after the V0.19 first-party integration work.

- QA gates: **19 / 19 passed**
- Aggregate assertions: **1,061 / 1,061 passed**
- V0.19 dedicated assertions: **116 / 116 passed**
- Executable TS/TSX files: **185**
- TypeScript `transpileModule` syntax errors: **0**
- Relative imports checked: **675**
- Unresolved relative imports: **0**
- Backend/public-integration core independent TypeScript type-check: **PASS**

## Regression matrix

| Gate | Result |
|---|---:|
| Architecture | 18 / 18 |
| Platform | 24 / 24 |
| NEXT F Digital Core | 29 / 29 |
| NEXT F Digital Operations | 41 / 41 |
| Gaming regression | 50 / 50 |
| Software regression | 70 / 70 |
| SaaS | 34 / 34 |
| Product completion | 49 / 49 |
| Final acceptance | 67 / 67 |
| Architecture completion | 76 / 76 |
| Help Center | 72 / 72 |
| Website Platform V0.12 | 21 / 21 |
| Identity/Membership V0.13 | 27 / 27 |
| Provisioning/Demo V0.14 | 42 / 42 |
| Contract Registry V0.15 | 49 / 49 |
| Capability Policy V0.16 | 84 / 84 |
| Change/Approval/Publishing V0.17 | 73 / 73 |
| Backend/API Boundary V0.18 | 119 / 119 |
| **nextf.lk First-Party Integration V0.19** | **116 / 116** |

## V0.19 checks cover

- dedicated `nextf.lk` first-party identity;
- no fake Customer Workspace/Digital Client tenancy for the NEXT F main site;
- Platform Digital domain normalized to `nextf.lk`, including migration from the old local `nextf.com.lk` placeholder;
- no direct public/internal database coupling;
- draft-by-default public projection seed configuration;
- explicit Service / Case Study / Help publication lifecycle;
- safe-field allowlists;
- explicit Service price exposure;
- completed-project requirement for case-study eligibility;
- Digital/All published Help source requirement;
- evidence-based live route inventory;
- no guessed route/component wiring;
- public lead privacy validation and normalized email;
- general public enquiry support without forced service attribution;
- staff service assignment prerequisite before Opportunity qualification;
- System rather than Admin audit actor for `nextf.lk` ingress;
- public Demo Request mapping into the governed V0.14 lifecycle;
- PII-rejecting conversion payload contract;
- four first-party public queries;
- three first-party public commands;
- idempotency/abuse-protection preservation;
- public workspace-scope denial;
- public-source restriction;
- safe bootstrap DTO;
- concrete public API handler functions over the V0.18 boundary;
- wrong-principal denial delegated to the shared authorization/audit path;
- Staff `Website Platform → nextf.lk Integration` visibility;
- release/package/package-lock consistency.

## Source limitation

The current execution environment cannot resolve `nextf.lk`, and this CMS handoff does not contain the public-site source repository.

Therefore V0.19 deliberately leaves exact live route/component bindings as `unmapped`. The architecture does **not** infer page paths, component names, current form fields, current analytics wiring or CTA identifiers from assumptions.

A route can only be marked verified when actual `nextf.lk` path/URL and component/source evidence are supplied.

## Core type-check

The non-React backend/public integration closure was checked independently with the available global TypeScript compiler. This includes:

- backend types/contracts;
- authorization;
- idempotency;
- query/command boundary;
- projections;
- adapter/audit contracts;
- V0.19 public API handlers;
- V0.19 public-site integration store and its dependency closure.

Result: **PASS**.

During this broader type-check, one old backup-restore typing ambiguity in `platformOperationsStore.ts` was exposed and safely corrected by typing the snapshot payload entries as `Record<string,string>`. No behavior was changed.

## Production build attempt

`npm run build` was run.

It stops before application compilation because the source handoff contains no installed `node_modules` and therefore the configured type libraries cannot be resolved:

- `react`
- `react-dom`
- `vite/client`
- `node`

This remains an environment/dependency limitation, not a source-level V0.19 regression.

The next phase should run `npm ci` in an internet-enabled development environment, followed by the full build and browser visual smoke QA.

## Public projection safety

V0.19 intentionally changed the seed exposure configuration to **draft** rather than published. This is important because the current environment cannot verify the exact Services/Help items presently shown on the live public site.

Staff must explicitly publish safe projections before the local proof API returns those items publicly.

## Final acceptance for V0.19

V0.19 is accepted at the source/architecture boundary level because:

1. `nextf.lk` has the correct first-party identity boundary.
2. Public reads are deliberate projections rather than internal-record serialization.
3. Public writes enter governed V1 commands.
4. Public Sales/Demo workflows reuse authoritative systems of record.
5. Public conversion telemetry rejects direct PII fields.
6. Customer Workspace tenancy and permissions remain isolated.
7. Exact live-site wiring is not fabricated.
8. Every historical regression gate remains green.

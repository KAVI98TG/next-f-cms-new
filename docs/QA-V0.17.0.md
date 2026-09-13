# QA — NEXT F CMS V0.17.0

## Scope

V0.17.0 adds Change Requests, approval evidence, revision/concurrency governance, application receipts, publication requests, and publishing receipts on top of V0.16.0.

## Dedicated gate

Run:

```bash
npm run check:change-approvals
```

The dedicated gate verifies the presence and safety semantics of:

- separate authoritative revision references;
- base-revision proposals;
- V0.16 authorization reuse;
- field-level approval routing;
- review event history;
- stale revision/conflict detection;
- approval/application separation;
- application receipts;
- publishing authorization/review separation;
- publishing receipts;
- internal staff Approvals & Publishing surface;
- exact V0.17 release metadata.

## Regression policy

Every historical check remains mandatory. V0.16's historical release assertion was made forward-compatible (`>=0.16.0`) without weakening any of its capability-policy behavior checks.

## Production build note

The source handoff intentionally does not contain installed `node_modules`. A full `npm run build` can therefore only succeed in an environment where the package dependencies are installed. Source-level transpilation and relative-import integrity are checked separately during handoff.

## Final handoff result

- Historical + current QA gates: **17/17 green**.
- Total static/regression assertions: **826/826 passed**.
- V0.17 dedicated gate: **73/73 passed**.
- Executable TypeScript/TSX files transpiled for syntax: **173**.
- Syntax diagnostics: **0**.
- Relative imports inspected: **629**.
- Unresolved relative imports: **0**.
- Full `npm run build`: dependency-blocked before application compilation because installed React/React DOM/Vite/Node typings are absent from this source handoff.

A targeted TypeScript check of the new workflow module reaches an existing pre-V0.17 type error in `platformOperationsStore.ts`; V0.17 itself introduces no syntax/import regression detected by the source verification gates.

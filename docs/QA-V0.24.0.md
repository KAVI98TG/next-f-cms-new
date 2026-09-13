# QA — NEXT F CMS V0.24.0

## P1 source acceptance

Run:

```bash
npm run check:go-live-p1
```

The P1 gate verifies release metadata, production bootstrap behavior, D1 staff-state API routing, Access identity binding, server permission enforcement, D1 idempotency, optimistic concurrency, audit evidence, durable Data Management export/import and removal of direct business-domain `window.localStorage` calls.

The full existing regression suite must also remain green, including the P0 foundation gate.

## Type-level source checks used during P1

Because the execution environment could not complete `npm ci`, P1 additionally used dependency-independent temporary TypeScript configurations to validate:

- Cloudflare Worker infrastructure source;
- production service source;
- non-React business/data source.

These checks are supplemental and do not replace the real repository build.

## Still required outside this package

Production acceptance remains pending until an internet-enabled CI/deployment environment runs at minimum:

```bash
npm ci
npm run build
```

Then deploy staging bindings and prove Access identity, D1 migration/state persistence, multi-browser concurrency, audit/idempotency behavior, failure modes, browser smoke coverage and production rollback/restore evidence.

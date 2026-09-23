# QA — V0.20.0

## Deterministic source gate

Run:

```bash
npm run check:runtime-readiness
```

The gate verifies release metadata, locked runtime/build dependencies, TypeScript/Vite build configuration, build commands, documentation and source baseline.

## Required external runtime gate

The following cannot be replaced by source inspection:

```bash
npm ci
npm run build
```

Follow with browser smoke testing across Platform, NEXT F Digital and Website Platform. The current execution environment could not complete registry package retrieval, so this external runtime gate remains an explicit release blocker rather than being marked green.

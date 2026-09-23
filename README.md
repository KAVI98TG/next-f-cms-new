# NEXT F CMS

Production administration application for NEXT F Platform, Digital, Website Platform, Gaming Store, and Software.

Current source version: **v1.0.62**. The checked-in release state is authoritative: see `RELEASE-STATE.json`.

## Start here

All project documentation is organized under [`docs/`](docs/README.md).

- Current status: `docs/current/PROJECT-STATUS.md`
- Deployment: `docs/current/DEPLOYMENT.md`
- Release history: `docs/current/RELEASE-NOTES.md`
- Architecture: `docs/architecture/`
- Governance and UI standards: `docs/governance/`
- Versioned release records: `docs/releases/`
- QA history: `docs/qa/`

## Local development

```powershell
npm ci
npm run dev
```

## Release validation

```powershell
npm ci
npm run release:finalize
```

A release is canonical only after the static regression suite, release gate, frontend production build, and Worker/API typecheck pass.

## Frontend deployment

For frontend-only releases:

```powershell
npm run deploy
```

Do not deploy the API Worker or run D1 migrations unless the release record explicitly requires them.

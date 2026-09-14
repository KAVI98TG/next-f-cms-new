# NEXT F CMS V1.0.0

Production CMS for NEXT F Platform, Digital, Website Platform, Gaming Store administration and Software operations.

## Production endpoints

- CMS: `https://cms.nextf.lk`
- API: `https://cms-api.nextf.lk`
- Contracts: `https://contracts.nextf.lk`
- Customer Workspace: `https://workspace.nextf.lk`

## Local setup

```powershell
npm ci
npm run dev
```

## Production acceptance

The V1 package consolidates the remaining production checks into one guarded runner:

Validate the package first:

```powershell
npm ci
npm run acceptance:source
```

After deploying this V1 source, run the deployed production acceptance:

```powershell
npm run acceptance:production:final
```

The production runner repeats the build/source gates and then executes the deployed runtime acceptance. Evidence is written under `artifacts/production-acceptance/`.

A fresh real Turnstile token is required for the public idempotency runtime proof. The runner deliberately refuses to manufacture or bypass that evidence.

Source-only package validation is available with:

```powershell
npm run acceptance:source
```

## Production deployment

```powershell
$env:VITE_NEXTF_ENVIRONMENT = "production"
$env:VITE_NEXTF_BACKEND_MODE = "production-api"
$env:VITE_NEXTF_API_BASE_URL = "https://cms-api.nextf.lk"
npm run build
npx wrangler@latest deploy --config infrastructure/cloudflare/wrangler.production.jsonc
npx wrangler@latest pages deploy dist --project-name nextf-cms --branch main
npm run acceptance:production:final
```

`infrastructure/cloudflare/wrangler.production.jsonc` contains non-secret production identifiers only. `TURNSTILE_SECRET_KEY` and `SERVICE_CREDENTIAL_SECRET` remain Cloudflare Worker Secrets and must never be committed.

## Authentication

Production is fail closed. The login/bootstrap UI verifies Cloudflare Access and the server-side staff binding before durable CMS data is initialized. `/auth/complete` is the API-host login completion route used when the API Access cookie needs authorization.

## Release documentation

- `docs/V1.0.0-PRODUCTION-RELEASE.md`
- `docs/GAMING-INTEGRATION-HANDOFF.md`
- `PROJECT-STATUS.md`

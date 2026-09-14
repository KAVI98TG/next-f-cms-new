# NEXT F CMS — Project Status

**Release:** V1.0.0 final production package  
**Production CMS:** `https://cms.nextf.lk`  
**Production API:** `https://cms-api.nextf.lk`

## Completed production foundation

- Staging acceptance completed.
- Production D1/R2/Queue/DLQ/Pages/Worker created and deployed.
- Production Cloudflare Access configured for CMS + staff API; public `/v1/public/*` is path-scoped bypass only.
- Production D1 migrations, Worker secrets, cron and custom domains configured.
- Super Admin exact Access subject binding verified with 29 permissions.
- Production browser smoke passed.
- D1 Time Travel restore drill passed.
- Tenant isolation runtime proof passed and disposable fixture was cleaned.
- Anonymous public ingress and invalid Turnstile rejection passed.

## V1.0.0 final package

The final source adds:

- fail-closed branded production login/bootstrap UI;
- API `/auth/complete` login completion route;
- durable exact public idempotency replay compatible with single-use Turnstile tokens;
- shared scheduled/staff maintenance for demo expiry, retention and idempotency cleanup;
- guarded production acceptance automation from the remaining 4D gates through release readiness;
- stable Contracts Registry / Site Manifest 1.0.0 runtime validation;
- managed-site evidence gate that fails closed when a real connection exists and records N/A only while no managed site exists;
- V1 release hygiene and production/staging leakage checks;
- Gaming integration handoff.

## Final operator gate

Run:

```powershell
npm ci
npm run acceptance:source
```

Deploy the V1 Worker/frontend, then run `npm run acceptance:production:final`. The final runner must print `FINAL RESULT: READY FOR V1.0` before the release is declared complete. A fresh legitimate production Turnstile token is intentionally required to prove the public exact-replay path; the runner will not bypass or fake that control.

After the V1 source is deployed, run `npm run acceptance:production:final` as the final production proof.

## Next stream

Customer Workspace is already live. After CMS V1 acceptance, begin Gaming G0 contract/API design, then storefront implementation. Gaming should not consume staff state APIs directly.

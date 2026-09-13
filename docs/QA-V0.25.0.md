# QA — NEXT F CMS V0.25.0

## P2 source acceptance

Run:

```bash
npm run check:go-live-p2
```

The P2 gate verifies that production authentication initializes before durable state, the frontend session is sourced from `staff.session.get`, production impersonation is unavailable, Cloudflare Access verification checks signature/expiry/issuer/audience, authentication failures are mapped explicitly, exact active D1 staff bindings remain mandatory and a safe binding-SQL generation helper exists.

The entire historical regression suite must remain green, including P0 and P1.

## Production evidence still required

Source tests cannot prove the live Cloudflare perimeter. In staging/production, record evidence for:

- Cloudflare Access application attached to the CMS/API route;
- Access policy requiring the intended staff identity provider and MFA policy;
- successful login for an active exact-subject D1 binding;
- rejection of missing, expired, wrong-audience and wrong-subject sessions;
- suspended/revoked binding rejection;
- frontend route visibility matching server permissions;
- direct API mutation rejection when permission is absent;
- logout/session expiry behavior;
- `npm ci && npm run build` and browser smoke on the deployed build.

These results belong in the production acceptance ledger; they must not be marked passed from source inspection alone.

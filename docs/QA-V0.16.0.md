# QA — NEXT F CMS V0.16.0

## Result

V0.16.0 passes the complete historical regression suite plus the new Service Entitlements + Customer Capability Access Policy gate.

| Gate | Result |
|---|---:|
| Architecture | 18 / 18 |
| Platform | 24 / 24 |
| Digital Core | 29 / 29 |
| Digital Operations | 41 / 41 |
| Gaming regression | 50 / 50 |
| Software regression | 70 / 70 |
| SaaS | 34 / 34 |
| Product completion | 49 / 49 |
| Final acceptance | 67 / 67 |
| Architecture completion | 76 / 76 |
| Help Center | 72 / 72 |
| Website Platform V0.12 | 21 / 21 |
| Identity & Membership V0.13 | 27 / 27 |
| Provisioning & Demo V0.14 | 42 / 42 |
| Contract Registry V0.15 | 49 / 49 |
| Capability Access Policy V0.16 | 84 / 84 |
| **Total** | **753 / 753** |

## Source verification

- 172 executable `.ts` / `.tsx` files transpile with **0 syntax diagnostics**.
- 623 relative imports were checked with **0 unresolved imports**.
- The V0.15 historical QA gate was made forward-compatible with later version numbers while retaining every V0.15 behavioral assertion.

## V0.16 authorization checks

The new gate verifies that:

- approved customer exposure modes exist;
- editing and publishing are separate policy dimensions;
- canonical customer access projection has no fabricated seed data;
- projection evidence must match exact current Site validation evidence and trusted Registry snapshot;
- unresolved Module, Capability and Permission IDs are rejected;
- canonical field paths are validated and duplicate paths are rejected;
- old projections remain evidence history while only the current validation projection is usable;
- service entitlements require an attached active Digital service, matching workspace/site and canonical capability;
- entitlement lifecycle is guarded and revoked entitlement is immutable;
- capability policy cannot exceed canonical Contract maximums;
- field policy cannot exceed canonical field or parent capability policy;
- customer role grants use exact canonical Permission IDs and Site scope;
- privacy/security overlays are reduction-only;
- effective authorization requires connected/valid Site, active membership/role, Site Manifest support, active entitlement, explicit policy, resource state and exact permissions;
- hidden/read-only/approval/direct-edit behavior is enforced;
- staff-only/approval/direct-publish behavior is enforced independently;
- customer direct edit/publish decisions explicitly require future trusted API re-evaluation;
- staff Website Platform exposes entitlement, access policy, field restriction and privacy/security surfaces without inventing canonical IDs.

## Production build attempt

`npm run build` was executed.

It stops before application compilation because this source handoff does not contain installed `node_modules` and the local environment cannot resolve these configured type libraries:

- `react`
- `react-dom`
- `vite/client`
- `node`

The relevant TypeScript errors are `TS2688: Cannot find type definition file` for those dependency-provided types.

This is an environment/dependency gate rather than a reported successful production build. Run `npm ci` in an internet-enabled development environment and rerun `npm run build` before production acceptance.

## Contract Registry source limitation

The authoritative Contract Registry `1.0.0` source/API snapshot and real managed-site Site Manifest remain unavailable in this execution environment. V0.16 therefore contains no fabricated canonical Capability, field or Permission IDs. Real policy population remains blocked until official resolver output is supplied.

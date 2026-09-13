# QA — V0.23.0 Production Go-Live P0

## Source regression result

All repository source/regression checks pass after the P0 changes:

- 23/23 check commands passed.
- The dedicated `check:go-live-p0` gate passes 25/25 assertions.
- No runtime `/admin/` route or asset references remain in `src`, `public`, `index.html` or `vite.config.ts`.
- Release metadata is consistently `0.23.0` in `package.json`, `package-lock.json`, `VERSION` and `src/app/version.ts`.

## P0-specific verification

The P0 gate verifies:

- Vite root base (`/`).
- Root browser routing and history navigation.
- Root brand/favicon/app-icon paths.
- Cloudflare SPA fallback via `public/_redirects`.
- Global ThemeProvider mount.
- Light, Dark and System modes.
- Persisted browser appearance preference.
- Runtime reaction to OS theme changes.
- Initial head theme bootstrap to reduce flash.
- Light and dark global design-token sets.
- Shared overlay, scrollbar, accent and error tokens.
- Topbar theme toggle.
- Platform Settings appearance selector.
- Production frontend env example for `cms.nextf.lk` with the API Worker hostname intentionally left as a deployment-time value.

## Dependency-backed build status

`npm ci --no-audit --no-fund` was attempted in the packaging sandbox but dependency retrieval timed out. The partial install was insufficient for TypeScript and reported missing type definitions for React, React DOM, Vite client and Node when `npm run build` was attempted.

This is an environment/dependency-fetch limitation, not a passed production build claim. The `dependency_build` production acceptance gate must remain pending until the locked install and `npm run build` pass in the internet-enabled CI/deployment environment.

# NEXT F CMS — Current Project Status

**Source release:** v1.0.61 — Documentation Organization  
**Canonical parent:** v1.0.60  
**Release authority:** `RELEASE-STATE.json`  
**Production CMS:** `https://cms.nextf.lk`  
**Production API:** `https://cms-api.nextf.lk`  
**Live Contracts Registry:** `https://contracts.nextf.lk/` — Production v1.2.0 at release preparation time

## Current release

v1.0.61 is a documentation/information-architecture cleanup built forward from v1.0.60. It does not change CMS business behavior, the production API contract, D1 schema, Worker bindings, or required secrets.

The release:

- moves project documentation out of the repository root into a single organized `docs/` tree;
- creates clear `current`, `governance`, `architecture`, `planning`, `releases`, `qa`, `audits`, and `archive` areas;
- removes duplicate continuity documentation from the root;
- converts the old `RULESE.txt` project rule file into `docs/governance/PROJECT-RULES.md`;
- archives the stale v1.0.32 P4 verification record instead of presenting it beside current release material;
- replaces the oversized root README with a short project entrypoint;
- adds `docs/README.md` as the documentation index;
- adds `check:docs` so future releases cannot scatter documentation back into the root or use old paths.

The package starts as a candidate. Run `npm run release:finalize`; only a successful static suite, release gate, frontend build, and Worker/API typecheck may mark it canonical.

## Current UI baseline

The current production-facing UI baseline includes the v1.0.55–v1.0.60 clarity work:

- no generic metric-card footer/detail/trend copy;
- no redundant local summary-card footer copy;
- Gaming operator screens prioritize controls, primary status, and actionable exceptions over developer explanations;
- normal Gaming list rows hide internal IDs and redundant healthy-state metadata while retaining those identifiers for search/detail/edit flows;
- the permanent UI content standard lives at `docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md`.

## Production foundation retained

The release preserves the existing production foundation: Cloudflare Access, production D1/R2/Queue resources, the CMS Worker/API boundary, Gaming bridges, Checkout controls, NEXT F Media, production acceptance automation, contract validation, and current least-privilege secret boundaries.

No migration is included in v1.0.61.

## Deployment scope

v1.0.61 is **Pages/frontend only** if deployed. The application version label changes, but there is no API Worker or database change.

Use `docs/current/DEPLOYMENT.md` for the current deployment sequence.

## Current documentation

- Documentation index: `docs/README.md`
- Deployment: `docs/current/DEPLOYMENT.md`
- Release history: `docs/current/RELEASE-NOTES.md`
- Continuity: `docs/governance/NEXT-F-CONTINUITY-RULES.md`
- Architecture: `docs/architecture/NEXT-F-CMS-FINAL-ARCHITECTURE.md`
- v1.0.61 record: `docs/releases/V1.0.61-DOCUMENTATION-ORGANIZATION.md`

# NEXT F CMS Documentation

This directory is the single home for NEXT F CMS documentation. Runtime configuration and release authority remain in source files such as `RELEASE-STATE.json`, `package.json`, and Cloudflare configuration; explanatory project documentation belongs here.

## Authority order

When sources disagree, use this order:

1. Live NEXT F Contracts Registry: `https://contracts.nextf.lk/`
2. `RELEASE-STATE.json` for the checked-in release version, baseline, contract version, capabilities, and validation state
3. `current/PROJECT-STATUS.md` for the concise current project state
4. Current production configuration and source code
5. Governance and architecture documents
6. Historical release, QA, planning, audit, and archive documents

Historical documents must not override the live Contracts Registry or current release manifest.

## Directory map

| Directory | Purpose |
| --- | --- |
| `current/` | Current project status, deployment procedure, and consolidated release notes |
| `governance/` | Continuity rules, project rules, contract integration guidance, UI/content standards |
| `architecture/` | Current architecture and integration boundaries |
| `planning/` | Retained planning/master-plan records; not current release authority |
| `releases/` | Immutable versioned release/change records |
| `qa/` | Historical QA reports and acceptance summaries |
| `audits/` | Point-in-time audits |
| `archive/` | Superseded verification documents retained only for history |

## Current documents

- `current/PROJECT-STATUS.md` — concise current state and deployment scope
- `current/DEPLOYMENT.md` — operator deployment commands and release rules
- `current/RELEASE-NOTES.md` — chronological release history
- `governance/NEXT-F-CONTINUITY-RULES.md` — forward-only development and release continuity
- `governance/PROJECT-RULES.md` — short mandatory project rules
- `governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md` — UI content and readability standard
- `architecture/NEXT-F-CMS-FINAL-ARCHITECTURE.md` — system architecture reference

## Documentation rules

- Keep only the repository entrypoint `README.md` at project root; all other explanatory documents belong under `docs/`.
- Put new version-specific change records in `releases/`.
- Update `current/PROJECT-STATUS.md` and `current/RELEASE-NOTES.md` with each release.
- Do not copy the same current-status document into multiple locations.
- Move superseded operational documents to `archive/` instead of leaving them beside current documentation.
- Do not store secret values, credentials, access tokens, or private keys in documentation.
- Use `npm run check:docs` to verify the documentation structure and references.

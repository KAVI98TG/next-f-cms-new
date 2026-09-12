# NEXT F Contracts -> Customer CMS Integration Guide

## Purpose

This document is the handoff for implementing NEXT F Contracts in the Customer CMS.
The Contract Registry is the versioned source of truth for data shapes, modules,
capabilities, CMS presentation metadata, API operations, permissions, events,
integrations, and compatibility rules. The Customer CMS is the runtime application
that renders editing experiences and stores customer data.

The Contract Registry is not the CMS database, authentication system, media store,
or customer website renderer.

## Authoritative Source

- Local Registry: `C:\Users\Heavy Duty\Music\My Project\NEXT-F-CONTRACTS`
- Planned public hub: `https://contracts.nextf.lk`
- Current Contract Version: `1.0.0`
- Site manifest filename: `nextf.site.json`
- Floating versions such as `latest` are invalid.

Do not modify the Contract Registry from the CMS project. If the CMS discovers a
missing or incorrect contract, record it as a Registry change and update the
Registry separately before consuming the new version.

## Start Here In The CMS Project

Before changing CMS code:

1. Study the CMS repository, its framework, authentication, API, database, routing,
   form system, validation library, and test conventions.
2. Read this guide and the Registry root `AGENTS.md` and `README.md`.
3. Select the closest starter under `starters/`.
4. Copy and customize its `nextf.site.json` for the CMS Site without changing the
   pinned Contract Version.
5. Validate the manifest before implementation.
6. Produce a short mapping of existing CMS features to canonical contract IDs.
7. Implement the smallest compatible vertical slice first.

Useful commands from the Registry root:

```powershell
node bin/nextf-contract.mjs validate path\to\nextf.site.json --verbose
node bin/nextf-contract.mjs compatibility path\to\nextf.site.json --json
```

## Core Architecture

```text
Pinned nextf.site.json
        |
Contract resolver / cached 1.0.0 Registry snapshot
        |
Enabled modules and capabilities
        |
CMS navigation + resource profiles + field editors
        |
Exact permission and Site-scope checks
        |
Customer CMS API
        |
CMS database, media storage, revisions, and publishing runtime
        |
Canonical Events / Webhooks / Integrations
```

The browser may use resolved presentation metadata, but it must not be the authority
for permissions, scope, validation, or publishing decisions. Those checks belong on
the trusted CMS server/API.

## Contract Resolution Order

Resolve CMS behavior in this order:

1. Read `nextf.site.json` and require exact Contract Version `1.0.0`.
2. Resolve enabled Modules from `registry/modules/`.
3. Resolve Module dependencies and enabled Capabilities.
4. Reject unknown or disabled Module and Capability IDs.
5. Resolve Customer CMS navigation from the selected starter's
   `CMS-MAPPING.json`.
6. Keep only navigation entries whose Modules are enabled.
7. Resolve each screen from `registry/cms-ui/profiles/`.
8. Resolve canonical resource fields from the profile's `targetContracts`.
9. Resolve Customer CMS API operations from `registry/api/`.
10. Resolve exact permissions and Site scopes from `registry/permissions/`.
11. Resolve Events, Webhooks, and Integrations only when declared by the Site.

Do not silently invent IDs, fields, relationships, permissions, or API operations.

## How To Build CMS Screens

Use the resource profiles under `registry/cms-ui/profiles/` as declarative UI
metadata. A profile provides the route, screen kind, layout template, responsive
policy, target contracts, field bindings, and permitted actions.

For every field binding:

- `editorId` selects the CMS control.
- `group`, `zone`, and `order` determine placement.
- `required` and `validationHint` drive friendly client validation.
- `customerEditable` determines whether a customer can change the value.
- `searchable`, `filterable`, and `sortable` configure list screens.
- `localizable` controls locale-aware values.
- `revisionTracked` controls revision evidence.

Example: `registry/cms-ui/profiles/content-pages.json` defines the Pages builder.
It maps the title to a text editor, slug to a slug control, sections to the block
composer, media to a media picker, and publishing to the canonical publishing
panel. The CMS should render those controls using its design system rather than
hard-coding a separate Page model.

## Data And API Boundaries

- Contracts define shapes and rules; the CMS database stores instances.
- Persist stable canonical IDs and Site scope with every record.
- Keep Organization, Site, and resource scope explicit.
- Validate every write on the server against the resolved contract.
- Use optimistic concurrency or revision checks for edits.
- Keep drafts, published snapshots, and revision history distinct.
- Public delivery returns published content only.
- Never place passwords, API keys, tokens, or provider secrets in
  `nextf.site.json`, contract files, or browser bundles.
- Integrations store only approved configuration in public data; secrets remain in
  the trusted server's secret store.

## Authorization

The UI may hide unavailable controls for usability, but this is never sufficient
authorization. Every protected API operation must independently evaluate:

1. Authenticated principal.
2. Role assignment.
3. Exact canonical permission ID.
4. Organization/Site/resource scope.
5. Any confirmation, recent-authentication, or risk requirement.
6. Allow or deny, with deny as the default.

Do not translate permission IDs into broad client-side roles and then trust the
browser.

## Recommended Implementation Sequence

1. **Foundation:** manifest loader, version pin, Registry resolver, validation, Site
   scope, authentication, and permission checks.
2. **CMS shell:** workspace, enabled-module navigation, routing, error states, and
   responsive layouts.
3. **First vertical slice:** Pages list -> Page editor -> validation -> save draft ->
   publish -> public read.
4. **Shared editors:** media picker, slug control, publishing panel, relation picker,
   rich content, localization, and revision history.
5. **Additional modules:** Blog, SEO, Forms, Leads, Commerce, Analytics, Marketing,
   and Integrations, only when enabled in the manifest.
6. **Events and operations:** canonical events, audit evidence, webhooks, background
   work, and integration health.
7. **Compatibility:** contract-diff review and explicit manifest pin changes for
   future upgrades.

Do not attempt to generate the entire CMS in one pass. Complete and verify one
canonical resource workflow before generalizing shared infrastructure.

## Registry Files Commonly Needed

- `registry/manifests/` - Site Manifest schema and declarations
- `registry/modules/` - Modules, dependencies, and Capabilities
- `registry/cms-ui/` - Customer CMS profiles, controls, layouts, and screen kinds
- `registry/content/` - Pages, Blog, navigation, reusable content, and related data
- `registry/blocks/` - Structured page-section contracts
- `registry/forms/` - Forms, Leads, consent, and submission contracts
- `registry/commerce/` - Commerce entities and rules
- `registry/api/` - API surfaces and operations
- `registry/permissions/` - exact permissions, roles, scopes, and risk levels
- `registry/events/` - canonical event definitions
- `registry/webhooks/` - webhook eligibility and transport contracts
- `registry/integrations/` - provider-neutral connector definitions
- `registry/validation/` - deterministic validation authority
- `starters/` - recommended Site compositions and CMS/Admin mappings

## Definition Of Done For Each CMS Resource

- The resource belongs to an enabled Site Module/Capability.
- Its canonical contract and CMS profile resolve under version `1.0.0`.
- List, detail, create, edit, and relevant operational states are implemented.
- Client validation improves usability; server validation remains authoritative.
- Every operation checks the exact permission and Site scope.
- Loading, empty, invalid, conflict, forbidden, and server-error states are handled.
- Draft, publish, archive, delete, and revision behavior match the contract.
- Canonical events are emitted only after the authoritative state change succeeds.
- Accessibility, responsive behavior, and keyboard operation are tested.
- Manifest validation and relevant CMS/API tests pass.
- Any deviation is documented instead of silently creating a parallel model.

## Prompt For A New CMS Chat

Use the following request when opening the CMS project in a new Codex chat:

> Study this CMS repository before making changes. Then read
> `C:\Users\Heavy Duty\Music\My Project\NEXT-F-CONTRACTS\CMS-CONTRACT-INTEGRATION-GUIDE.md`,
> the Contract Registry `AGENTS.md`, and the relevant `nextf.site.json` starter.
> Treat NEXT F Contracts `1.0.0` as the authoritative contract surface. First map
> the existing CMS architecture to the manifest, Modules, CMS UI profiles, API
> operations, and permissions. Do not modify the Contract Registry or invent
> parallel contracts. Propose the smallest complete vertical slice, then implement
> and verify it using the CMS repository's existing conventions.

When possible, copy this guide into the CMS repository so the implementation and
future maintenance chats can find it without depending on conversation history.

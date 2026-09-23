# NEXT F CMS UI Content & Typography Standard

This standard applies to the **internal NEXT F CMS**. The Customer Reviews workspace is the visual reference: clear page hierarchy, readable text, compact operational context, and no developer documentation inside daily workflows.

## Core rule

The CMS is an operating surface, not a manual. Every visible sentence must help staff understand the current state, make a decision, enter required data, or avoid a meaningful mistake.

## Keep in the UI

Keep only information that is needed at the point of use:

- page title and one short purpose sentence when the title alone is not enough;
- current operational status, counts, money, dates, ownership and business identifiers;
- validation errors and required input format;
- consequences for destructive, irreversible, financial, permission, publishing or customer-visible actions;
- integration-unavailable state when it disables an action, with one concise next requirement;
- provenance or trust state when staff must distinguish authoritative from untrusted data;
- compact empty-state workflow context only when it explains what will appear here or what the operator should do next.

## Remove from the UI

Move these to documentation, release notes or source comments instead of rendering them in the CMS:

- architecture explanations and implementation history;
- implementation vocabulary such as D1, Worker, API bridge, canonical/contract-bound storage, credentials, source-of-truth/control-plane language or supplier resync details unless it changes the operator decision; keep those details in engineering docs or diagnostics;
- roadmap language such as “later”, “future”, “next phase”, “foundation”, “deferred” or version-development commentary;
- repeated explanations of what a page already communicates through labels, status and controls;
- developer assurances that do not change the current operator decision;
- tutorials for obvious controls;
- filler text added only because a component requires a description or detail;
- long paragraphs where a status badge, short sentence or disabled-control reason is enough.

## Typography

- **14 px is the normal minimum for readable CMS copy**, including table metadata, form help and secondary descriptions.
- **12 px is reserved for sparse micro labels only**, such as short uppercase eyebrows or compact machine/status metadata. It must not be used for paragraphs or instructions.
- Do not add 13 px text. Use the 12 px micro tier or the 14 px readable tier so the hierarchy stays consistent.
- Page titles use the shared `SectionHeader` scale. Do not introduce page-local title sizes.
- Use the shared text tokens in `src/css/tokens.css`; do not invent smaller one-off font sizes.
- Internal CMS CSS must never render text below 12 px. The public Gaming storefront has its own separate presentation rules.

## Shared component rules

Use existing shared components before adding local UI primitives:

- `SectionHeader` for page/section hierarchy. `description` is optional; omit it when the title is self-explanatory.
- `MetricCard` for summary values. Metric cards contain only the metric label, value and optional icon. Do not add `detail`, footer, helper or trend copy to metric cards. The same rule applies to feature-local KPI, overview, health and summary cards: label + value (+ icon) only.
- `FormField` for labels, validation and only necessary input hints.
- `PageToolbar` for search/filter/action rows.
- `DataTable` for operational record sets. Normal list/table rows show the human-facing name and primary operational values. Keep internal IDs, slugs, provider IDs and diagnostic identifiers searchable or available in detail/edit views instead of rendering them under every row. Secondary row text is conditional: show it only for an exception, mismatch, multi-route/multi-supplier case, or other non-obvious state that changes the operator decision.
- `StatePanel` for loading, error and unavailable states.
- `Badge` / status components for state instead of explanatory paragraphs.
- Shared `Button`, `TextInput`, `SelectInput`, checkbox and toggle styles for controls.

Do not recreate native-looking selects, checkboxes, scrollbars, buttons or status pills inside a feature page. Extend the global system if a missing shared pattern is genuinely needed.

## Copy limits

Page header descriptions should normally be one sentence and are capped at **110 characters** by the UI hygiene check. If the explanation needs more space, ask whether it belongs in the UI at all. Safety-critical action consequences belong beside the action or in the confirmation dialog, not in the page introduction.

Prefer:

> Signed delivery unavailable. Connect the R2/license delivery integration to issue downloads.

Instead of implementation history explaining why simulated production behavior is not used.


### Punctuation and form layout

- Do not use em dash or en dash characters in CMS UI copy. Prefer a comma, colon, parentheses, or a normal hyphen for a numeric range.
- A form control must keep its normal control height even when the neighboring field contains extra actions or upload controls.
- In two-column modal forms, long selectors, media fields, descriptions, and multi-item pickers should use a full-width row when pairing them would create uneven or stretched controls.
- Secondary field actions such as reset/use-source should sit in the field header instead of creating a helper-text row under the input.

## New section checklist

Before merging a new section or feature:

1. Start with the shared page wrapper and shared components; do not create a local design system.
2. Use a clear title, then remove the page description if it does not add operational meaning.
3. Keep body/secondary copy at 14 px or above. Use 12 px only for sparse micro labels.
4. Remove architecture, roadmap and tutorial copy from the rendered UI.
5. In Gaming operator UI, keep D1, Worker, API bridge, canonical/contract-bound, credential, source-of-truth and similar implementation vocabulary out of daily workflows; keep it in engineering docs or dedicated diagnostics.
6. Make warnings local to the risky action and state the consequence briefly.
7. Keep every KPI/overview/summary card to label + value + optional icon. Do not recreate a local footer/helper line under the value. Put genuinely important state in the relevant operational section, badge or alert instead.
8. Use status, badges, disabled states and concise error messages before adding paragraphs. Healthy/zero states should not carry a second line that merely restates the label or value.
9. Keep internal IDs/slugs/provider identifiers out of normal list rows. Preserve them in search, edit/detail drawers, exports or diagnostics when operationally useful.
10. Verify dark/light theme, responsive layout, custom controls, keyboard focus and scroll behavior through the shared styles.
11. Run `npm run check:ui-hygiene`, `npm run check:font-floor`, `npm run check:global-ui`, the relevant feature checks, and `npm run build`.
12. Update `VERSION`, package metadata, `RELEASE-STATE.json`, release notes and the release-specific document before packaging.
13. Run `npm run release:finalize` before creating a full canonical ZIP; it must pass static regression, release gate, frontend build and Worker/API typecheck.

## Review rule

When reviewing UI copy, ask: **“If this sentence disappears, could an operator make a wrong decision or lose necessary context?”** If the answer is no, remove it from the interface and keep it in documentation if it is still valuable to developers.

# NEXT F CMS V0.11.0 - Project Status

## Status

**Platform Customer Help Center implemented.**

V0.11.0 adds a shared customer-help capability under Platform without collapsing the three business-specific support systems.

## Added in V0.11.0

### Customer Help Center
- Shared Help Center overview and internal customer-facing preview/search.
- Knowledge Base articles with draft/published state, category, audience and featured metadata.
- Categories scoped to all NEXT F, Digital, Gaming Store or Software.
- FAQs with audience and publish state.
- Customer announcements with audience, publish schedule and archive state.
- Unified customer help-request queue.
- Request priority and lifecycle: new, routed, in progress, waiting customer, resolved, closed.
- Business routing: unassigned, Digital, Gaming Store, Software.
- Saved agent replies with shortcuts and audience scope.
- Customer feedback tracking for helpful / not-helpful knowledge content.
- Customer Help Center settings for search, feedback, contact requests, anonymous requests and automatic business routing.

### Platform integration
- New `platform.help.manage` permission.
- Support role automatically receives shared Help Center management without privileged Platform configuration permissions.
- Global CMS search indexes Help Center articles, FAQs and requests.
- High/urgent Help Center requests surface in the Platform Operations Inbox.
- Help actions write Platform audit events and new requests create Platform notifications.
- Platform dashboard exposes the shared Help Center queue.
- System Health validates loaded Help Center content/request state.
- Final Product Acceptance now validates Help Center slugs, references, request identity/routing, saved-reply shortcuts, settings and announcements.
- Final architecture document updated to make Customer Help Center a permanent Platform capability.

## Architecture rule

The Help Center provides **one customer entry point**. It does not replace:
- NEXT F Digital → Support
- Gaming Store → Support
- NEXT F Software → Support

The Platform Help Center owns knowledge, discovery, contact entry and routing. Business support modules own fulfillment and domain-specific issue resolution.

## Infrastructure boundary

No public Help Center deployment, email provider, production authentication, D1, R2, Workers or Wrangler configuration is added in this release. The Help Center uses browser-persistent local stores and production-neutral contracts until infrastructure integration.

## V0.11.0 QA result

- Architecture regression: **18/18 passed**
- Platform Core regression: **24/24 passed**
- Digital Core regression: **29/29 passed**
- Digital Operations regression: **41/41 passed**
- Gaming Store Core regression: **50/50 passed**
- Software Core regression: **70/70 passed**
- SaaS Completion regression: **34/34 passed**
- Product Completion regression: **49/49 passed**
- Final Product Acceptance regression: **67/67 passed**
- Architecture Completion regression: **76/76 passed**
- Platform Help Center: **72/72 passed**
- Implementation TS/TSX files: **162**
- Relative import checks: **passed** through regression suites
- Dependency-independent semantic TypeScript pass: **passed** with temporary external-library declarations; temporary QA files were removed before packaging.
- Source placeholder check: **clean**

## Dependency-backed build status

A real `npm install --ignore-scripts --no-audit --no-fund` was attempted and timed out in this execution environment. No partial `node_modules` or package-lock artifact is shipped. Run `npm install` followed by `npm run build` in the normal development environment before production infrastructure integration.

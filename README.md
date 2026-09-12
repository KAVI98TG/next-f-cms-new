# NEXT F CMS V0.11.0

A SaaS-level business operating CMS rebuilt from scratch around four permanent domains: Platform, NEXT F Digital, Gaming Store and NEXT F Software.

## Current release

**V0.11.0 Platform Help Center**

This release extends the completed V0.10.0 architecture with a shared **Customer Help Center under Platform**. NEXT F customers get one help entry point across Digital, Gaming Store and NEXT F Software, while each business keeps its own operational support workflow.

## Platform Help Center

- Knowledge Base articles
- Categories
- FAQs
- Announcements
- Unified customer help requests
- Digital / Gaming / Software request routing
- Saved agent replies
- Customer help search
- Helpful / not-helpful feedback
- Help Center settings and customer-experience policy
- Global CMS search integration
- Operations Inbox alerts for high/urgent help requests
- Platform audit and notification integration
- Final Acceptance integrity checks

## Product domains

- **Platform** - staff identity, RBAC, organizations/workspaces, domains, security, audit, notifications, Customer Help Center, integrations, logs, health, backups, cleanup/retention, shared accounts/payments, data management and final acceptance.
- **NEXT F Digital** - sales, clients/client portal access, services/add-ons/project templates, projects, billing/adjustments/subscriptions/renewals, client sites, support, automation, reports and business settings.
- **Gaming Store** - supplier-powered catalog, product mapping, pricing, orders, customers, finance/reconciliation, support and supplier operations.
- **NEXT F Software** - products/editions, releases, licenses, activations, subscriptions, updates, downloads, support and analytics.

## Run locally

```bash
npm install
npm run dev
```

## QA

```bash
npm run check:architecture
npm run check:platform
npm run check:digital
npm run check:digital-operations
npm run check:gaming
npm run check:software
npm run check:saas
npm run check:product
npm run check:acceptance
npm run check:architecture-completion
npm run check:help-center
npm run build
```

## Architecture status

The V0.10.0 architecture-complete baseline is preserved. V0.11.0 adds the Customer Help Center as a new shared Platform capability and updates `docs/NEXT-F-CMS-FINAL-ARCHITECTURE.md` accordingly.

## Infrastructure boundary

Production infrastructure is intentionally not configured yet. Wrangler, Workers, D1, R2, production authentication, email delivery, public Help Center delivery, payment gateways, Gaming supplier credentials/webhooks, remote client-site monitoring and Software file/update delivery remain part of the final infrastructure stage.

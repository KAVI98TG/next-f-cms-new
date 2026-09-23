# V0.7.0 SaaS Completion Layer

V0.7.0 hardens the completed Platform, NEXT F Digital, Gaming Store and NEXT F Software business engines into one coherent local-development SaaS product.

## Added

- Shared account identity view across Digital clients, Gaming customers and Software customers.
- Provider-independent normalized payment ledger across all business domains.
- Operations inbox generated from Platform notifications plus live business conditions.
- Global search across modules, staff, clients, invoices, projects, sites, Gaming orders/products/customers, Software orders/products/licenses/customers.
- Route and sidebar permission enforcement based on the active staff role.
- Local permission preview by switching between active staff accounts.
- Local data export and restore bundle for development continuity.
- Global error boundary and reusable empty/loading/error state component.
- Skip navigation, improved modal focus restoration/Escape handling, scoped table headers, reduced-motion handling and horizontal table protection on small displays.

## Intentionally deferred

No production authentication, payment provider, remote database, object storage, email provider, Cloudflare bindings, Workers, D1, R2 or Wrangler configuration is introduced here. Those remain final-stage infrastructure work after the CMS product is complete and QA hardened.

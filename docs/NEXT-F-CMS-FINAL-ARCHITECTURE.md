# NEXT F CMS - Final Architecture

## 1. Final Product Model

The NEXT F CMS should be treated as one unified business operating platform with four clearly separated domains:

```text
NEXT F CMS
│
├── Platform
│   └── Shared administration, identity, security, infrastructure, audit, system settings
│
├── NEXT F Digital
│   └── Digital services / agency operations
│
├── Gaming Store
│   └── Supplier-API based gaming top-up / membership / digital goods resale operations
│
└── NEXT F Software
    └── Plugin / software product development, licensing, releases, updates and support
```

The rule is simple:

- **Platform** owns shared system capabilities.
- **NEXT F Digital** owns service-business workflows.
- **Gaming Store** owns supplier-reseller workflows.
- **NEXT F Software** owns software-product workflows.
- Public website content publishing controls do **not** belong in this CMS.

---

# 2. Final Admin Source Architecture

```text
admin/
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   ├── navigation.ts
│   │   ├── providers/
│   │   └── guards/
│   │
│   ├── platform/
│   │   │
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── organizations/
│   │   ├── workspaces/
│   │   ├── permissions/
│   │   ├── audit/
│   │   ├── notifications/
│   │   ├── help-center/
│   │   │   ├── knowledge/
│   │   │   ├── categories/
│   │   │   ├── faqs/
│   │   │   ├── announcements/
│   │   │   ├── requests/
│   │   │   ├── saved-replies/
│   │   │   ├── feedback/
│   │   │   └── settings/
│   │   ├── integrations/
│   │   ├── domains/
│   │   ├── infrastructure/
│   │   ├── health/
│   │   ├── backup/
│   │   ├── cleanup/
│   │   ├── security/
│   │   ├── logs/
│   │   ├── settings/
│   │   └── shared/
│   │
│   ├── next-f/
│   │   │
│   │   ├── dashboard/
│   │   ├── sales/
│   │   │   ├── leads/
│   │   │   ├── opportunities/
│   │   │   ├── pipeline/
│   │   │   └── proposals/
│   │   │
│   │   ├── clients/
│   │   │   ├── clients/
│   │   │   ├── contacts/
│   │   │   ├── portal-access/
│   │   │   └── client-360/
│   │   │
│   │   ├── services/
│   │   │   ├── packages/
│   │   │   ├── custom-services/
│   │   │   ├── pricing/
│   │   │   ├── add-ons/
│   │   │   └── templates/
│   │   │
│   │   ├── projects/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── milestones/
│   │   │   ├── approvals/
│   │   │   ├── deliverables/
│   │   │   └── project-templates/
│   │   │
│   │   ├── billing/
│   │   │   ├── orders/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── subscriptions/
│   │   │   ├── renewals/
│   │   │   └── adjustments/
│   │   │
│   │   ├── sites/
│   │   │   ├── websites/
│   │   │   ├── domains/
│   │   │   ├── deployments/
│   │   │   ├── maintenance/
│   │   │   ├── backups/
│   │   │   └── health/
│   │   │
│   │   ├── support/
│   │   │   ├── tickets/
│   │   │   ├── service-requests/
│   │   │   └── issues/
│   │   │
│   │   ├── automation/
│   │   │   ├── workflows/
│   │   │   ├── email/
│   │   │   ├── notifications/
│   │   │   └── templates/
│   │   │
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── shared/
│   │   └── services/
│   │
│   ├── gaming-store/
│   │   │
│   │   ├── dashboard/
│   │   ├── orders/
│   │   │   ├── all/
│   │   │   ├── processing/
│   │   │   ├── failed/
│   │   │   ├── completed/
│   │   │   ├── refunds/
│   │   │   └── components/
│   │   │
│   │   ├── products/
│   │   │   ├── catalog/
│   │   │   ├── product-mapping/
│   │   │   ├── categories/
│   │   │   ├── availability/
│   │   │   └── components/
│   │   │
│   │   ├── pricing/
│   │   │   ├── prices/
│   │   │   ├── margin-rules/
│   │   │   ├── currency/
│   │   │   └── safeguards/
│   │   │
│   │   ├── suppliers/
│   │   │   ├── connections/
│   │   │   ├── catalog-sync/
│   │   │   ├── balance/
│   │   │   ├── webhooks/
│   │   │   ├── api-health/
│   │   │   └── logs/
│   │   │
│   │   ├── customers/
│   │   │   ├── customers/
│   │   │   └── order-history/
│   │   │
│   │   ├── finance/
│   │   │   ├── payments/
│   │   │   ├── supplier-costs/
│   │   │   ├── reconciliation/
│   │   │   └── profitability/
│   │   │
│   │   ├── support/
│   │   │   ├── failed-orders/
│   │   │   ├── stuck-orders/
│   │   │   ├── customer-issues/
│   │   │   └── refunds/
│   │   │
│   │   ├── settings/
│   │   ├── shared/
│   │   └── services/
│   │
│   ├── software/
│   │   │
│   │   ├── dashboard/
│   │   ├── products/
│   │   │   ├── plugins/
│   │   │   ├── editions/
│   │   │   ├── add-ons/
│   │   │   └── bundles/
│   │   │
│   │   ├── releases/
│   │   │   ├── versions/
│   │   │   ├── channels/
│   │   │   ├── changelogs/
│   │   │   ├── compatibility/
│   │   │   └── files/
│   │   │
│   │   ├── licenses/
│   │   │   ├── licenses/
│   │   │   ├── activations/
│   │   │   ├── expirations/
│   │   │   └── revocations/
│   │   │
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── subscriptions/
│   │   │   ├── plans/
│   │   │   ├── renewals/
│   │   │   └── expirations/
│   │   │
│   │   ├── updates/
│   │   │   ├── update-api/
│   │   │   ├── rollout/
│   │   │   └── compatibility/
│   │   │
│   │   ├── downloads/
│   │   ├── support/
│   │   ├── analytics/
│   │   ├── settings/
│   │   ├── shared/
│   │   └── services/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── dialogs/
│   │   ├── drawers/
│   │   ├── charts/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── validation/
│   │
│   ├── services/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── storage/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   └── observability/
│   │
│   ├── css/
│   │   ├── tokens/
│   │   ├── base/
│   │   ├── layout/
│   │   ├── components/
│   │   └── sections/
│   │
│   └── main.tsx
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── wrangler.jsonc
```

---

# 3. Platform Domain

The Platform section must contain only capabilities shared across all businesses.

## Keep

```text
Platform
├── Dashboard
├── Users
├── Roles
├── Permissions
├── Organizations / Workspaces
├── Audit
├── Notifications
├── Customer Help Center
├── Integrations
├── Domains
├── Infrastructure
├── Health
├── Backup
├── Cleanup
├── Security
├── Logs
└── Settings
```

## Responsibilities

### Users
- Admin users
- Staff
- Access status
- MFA state
- Last login
- Account suspension

### Roles & Permissions
Examples:

```text
Super Admin
Digital Manager
Gaming Store Operator
Software Manager
Finance
Support
Read Only
```

Permissions must be domain-scoped.

Example:

```text
gaming.orders.read
gaming.orders.refund
digital.projects.edit
software.releases.publish
platform.users.manage
```

### Audit
All sensitive actions:

```text
User created
Role changed
Refund issued
Supplier disabled
License revoked
Release published
Invoice adjusted
Website maintenance mode enabled
```

### Customer Help Center

Shared customer-facing help management across all NEXT F businesses:

```text
Knowledge Base
Categories
FAQs
Announcements
Customer Help Requests
Business Routing
Saved Replies
Search
Feedback
Settings
```

The Help Center is shared under Platform because it provides one NEXT F customer-help entry point. Operational support execution remains inside NEXT F Digital, Gaming Store and NEXT F Software. Requests are routed to the appropriate business rather than replacing each business support workflow.

### Infrastructure
Cloudflare operational controls only:

```text
Workers
D1
R2
KV
Queues
Durable Objects
Workflows
Domains
DNS
Deployment health
```

### Global Settings
Only truly global settings:

```text
Organization
Brand
Timezone
Currency defaults
Email identity
Security
System limits
Notification defaults
```

---

# 4. NEXT F Digital Business

## Business Model

```text
Lead
 ↓
Opportunity
 ↓
Proposal
 ↓
Approval
 ↓
Payment
 ↓
Project
 ↓
Delivery
 ↓
Client Approval
 ↓
Completion
 ↓
Recurring Service
 ↓
Renewal
```

## Dashboard

Main KPIs:

```text
Revenue this month
Open opportunities
New leads
Proposal conversion
Active projects
Delayed projects
Outstanding invoices
Recurring revenue
Renewals due
Open support tickets
Client sites with issues
```

### Attention Required

```text
Overdue invoice
Proposal awaiting response
Project blocked
Client approval pending
Website offline
Domain expiring
Maintenance renewal due
Support ticket overdue
```

---

# 5. NEXT F Digital - Sales

```text
Sales
├── Leads
├── Opportunities
├── Pipeline
└── Proposals
```

## Pipeline

```text
New Lead
Contacted
Qualified
Discovery
Proposal Sent
Negotiation
Won
Lost
```

## Lead Sources

```text
Website
Email
Facebook
Instagram
WhatsApp
Referral
Organic
Paid Ads
Manual
Other
```

## Proposal

A proposal should connect:

```text
Client
Opportunity
Services
Pricing
Discounts
Terms
Timeline
Attachments
Approval status
Expiration
```

When accepted:

```text
Proposal Accepted
        ↓
Create Client if needed
Create Order
Create Invoice
Create Project
Create Project Template
Create Portal Access
```

---

# 6. NEXT F Digital - Clients

```text
Clients
├── Clients
├── Contacts
├── Client 360
└── Portal Access
```

## Client 360

One page must show:

```text
Client identity
Contacts
Active services
Projects
Invoices
Payments
Subscriptions
Websites
Domains
Support tickets
Files
Reports
Activity history
Portal access
```

Avoid separate disconnected CRM pages.

---

# 7. NEXT F Digital - Services

```text
Services
├── Packages
├── Custom Services
├── Pricing
├── Add-ons
└── Templates
```

## Initial Service Families

```text
Website Design & Development
Digital Marketing
SEO
Website Maintenance
Content Services
Analytics
Social Media Marketing
Custom Digital Solutions
```

## Package Model

```text
Service
├── Starter
├── Business
├── Professional
└── Custom
```

Each package can define:

```text
Price
Billing model
Duration
Deliverables
Included revisions
Support period
Recurring or one-time
Add-ons
Project template
```

---

# 8. NEXT F Digital - Projects

```text
Projects
├── Projects
├── Tasks
├── Milestones
├── Approvals
├── Deliverables
└── Project Templates
```

## Example Website Project Template

```text
Discovery
Requirements
Wireframe
UI Design
Development
Content
QA
Client Review
Deployment
Handover
```

## Example SEO Template

```text
SEO Audit
Technical Fixes
Keyword Research
On-page Work
Content
Backlink Work
Tracking
Monthly Report
```

## Example Social Media Template

```text
Monthly Planning
Creative Preparation
Client Approval
Scheduling
Publishing
Monitoring
Performance Report
```

One project engine should support all service types.

---

# 9. NEXT F Digital - Billing

```text
Billing
├── Orders
├── Invoices
├── Payments
├── Subscriptions
├── Renewals
└── Adjustments
```

## Billing Models

```text
One-time
Deposit + milestones
Monthly recurring
Annual recurring
Retainer
Custom
```

## Billing Status

```text
Draft
Issued
Partially Paid
Paid
Overdue
Cancelled
Refunded
```

## Renewal Flow

```text
Renewal approaching
 ↓
Reminder
 ↓
Invoice
 ↓
Payment
 ↓
Renew service
```

Do not automatically disable client websites immediately after a missed payment.

Use:

```text
Due
 ↓
Reminder
 ↓
Overdue
 ↓
Grace period
 ↓
Admin warning
 ↓
Policy/manual action
```

---

# 10. NEXT F Digital - Client Sites

```text
Sites
├── Websites
├── Domains
├── Deployments
├── Maintenance
├── Backups
└── Health
```

## Site Record

```text
Client
Domain
Production URL
Project
Maintenance plan
Hosting/deployment reference
SSL
Domain expiry
Latest deployment
Last backup
Health status
Billing status
Renewal date
```

## Health

```text
Online
Degraded
Offline
SSL issue
Domain issue
Deployment issue
```

This is a key NEXT F capability.

---

# 11. NEXT F Digital - Support

```text
Support
├── Tickets
├── Service Requests
└── Issues
```

Each ticket connects to:

```text
Client
Project
Website
Service
Invoice if relevant
Assigned staff
Priority
SLA
Activity
```

---

# 12. NEXT F Digital - Automation

```text
Automation
├── Workflows
├── Email
├── Notifications
└── Templates
```

Initial workflows:

```text
New lead → acknowledgement
Proposal sent → follow-up reminder
Proposal accepted → create project
Payment received → activate service
Milestone ready → client notification
Approval requested → portal notification
Invoice due → reminder
Invoice overdue → overdue flow
Renewal approaching → renewal reminder
Support ticket → acknowledgement
Website incident → admin alert
Monthly report ready → email client
```

---

# 13. Gaming Store Business

## Business Model

```text
Supplier API
 ↓
Catalog Sync
 ↓
NEXT F Product Mapping
 ↓
Pricing
 ↓
Customer Purchase
 ↓
Payment
 ↓
Player Validation
 ↓
Supplier Order
 ↓
Webhook
 ↓
Completed / Failed
 ↓
Customer Notification
 ↓
Reconciliation
```

## Final Gaming Store Structure

```text
Gaming Store
├── Dashboard
├── Orders
├── Products
├── Pricing
├── Suppliers
├── Customers
├── Finance
├── Support
└── Settings
```

No giant ERP.

---

# 14. Gaming Store - Dashboard

```text
Today's Revenue
Today's Profit
Orders Today
Processing Orders
Failed Orders
Supplier Balance
Supplier API Status
Webhook Status
Payment Status
```

Attention:

```text
Low supplier balance
Supplier API degraded
Orders stuck processing
Failed orders
Payment/supplier mismatch
```

---

# 15. Gaming Store - Orders

```text
Orders
├── All
├── Processing
├── Completed
├── Failed
└── Refunds
```

## Order Record

```text
NEXT F Order ID
Customer
Product
Player ID / Required Fields
Customer Payment
Supplier
Supplier Order ID
Supplier Cost
NEXT F Selling Price
Profit
Supplier Status
Delivery Status
Timeline
```

---

# 16. Gaming Store - Products

```text
Products
├── Catalog
├── Product Mapping
├── Categories
└── Availability
```

## Product Families

```text
Game Top-Ups
Memberships
Gift Cards / Codes
Subscriptions
```

## Example Games

```text
PUBG Mobile
Free Fire
Call of Duty Mobile
Mobile Legends
Genshin Impact
Other supported games
```

The CMS must not create one admin module per game.

Use supplier-defined required fields.

Example:

```text
Player ID
Server ID
Region
Account ID
```

---

# 17. Gaming Store - Pricing

```text
Pricing
├── Selling Prices
├── Margin Rules
├── Currency
└── Safeguards
```

Formula:

```text
Supplier Cost
+ Gateway Fee
+ Currency Cost
+ NEXT F Margin
= Customer Price
```

Rules:

```text
Default margin %
Per-category margin
Per-product margin
Minimum absolute profit
Minimum margin safeguard
Manual override
```

Never silently sell below configured minimum margin.

---

# 18. Gaming Store - Suppliers

```text
Suppliers
├── Connections
├── Catalog Sync
├── Balance
├── Webhooks
├── API Health
└── Logs
```

Supplier architecture must be provider-independent.

```text
NEXT F Product
├── Supplier A Mapping
└── Supplier B Mapping
```

This avoids permanent lock-in to one supplier.

---

# 19. Gaming Store - Finance

```text
Finance
├── Payments
├── Supplier Costs
├── Reconciliation
└── Profitability
```

Reconciliation states:

```text
Customer paid / supplier completed
Customer paid / supplier failed
Customer unpaid / supplier charged
Refund pending
Refund completed
```

---

# 20. Gaming Store - Support

```text
Support
├── Failed Orders
├── Stuck Orders
├── Customer Issues
└── Refunds
```

No separate heavy CRM.

---

# 21. NEXT F Software Business

## Business Model

```text
Develop
 ↓
Test
 ↓
Release
 ↓
Publish
 ↓
Purchase
 ↓
License
 ↓
Activation
 ↓
Updates
 ↓
Support
 ↓
Renewal
```

## Final Structure

```text
NEXT F Software
├── Dashboard
├── Products
├── Releases
├── Licenses
├── Customers
├── Orders
├── Subscriptions
├── Updates
├── Downloads
├── Support
├── Analytics
└── Settings
```

---

# 22. Software - Products

```text
Products
├── Plugins
├── Editions
├── Add-ons
└── Bundles
```

Example:

```text
NEXT F SEO Plugin
├── Personal
├── Business
└── Agency
```

Each edition can define:

```text
Price
Billing model
Activation limit
Update entitlement
Support entitlement
Features
Upgrade path
```

---

# 23. Software - Releases

```text
Releases
├── Versions
├── Release Channels
├── Changelogs
├── Compatibility
└── Files
```

Example:

```text
v1.4.0       Stable
v1.5.0-beta  Beta
v2.0.0       Development
```

Each release:

```text
Product
Version
Release channel
Release date
Minimum requirements
Compatibility
File
Checksum
Changelog
Rollback version
Status
```

---

# 24. Software - Licenses

```text
Licenses
├── Active
├── Activations
├── Expirations
└── Revocations
```

License record:

```text
License Key
Product
Edition
Customer
Activation Limit
Active Installations
Issued Date
Expiry Date
Update Access
Support Access
Status
```

---

# 25. Software - Commercial Models

Support:

```text
One-time purchase
Annual license
Monthly subscription
Annual subscription
Freemium
Paid add-ons
Bundles
Agency / multi-site license
```

Recommended primary commercial model:

```text
Annual license
├── Plugin usage
├── Updates
└── Support
```

---

# 26. Software - Update Infrastructure

```text
Installed Plugin
 ↓
NEXT F Update API
 ↓
Validate Product
 ↓
Validate License
 ↓
Validate Activation
 ↓
Check Release Channel
 ↓
Return Update Metadata
 ↓
Secure Download
```

Use signed or short-lived download authorization.

---

# 27. Shared Client / Customer Model

Do not create four incompatible customer tables.

Use a shared identity/account layer.

```text
Account
├── NEXT F Digital Client Profile
├── Gaming Store Customer Profile
└── Software Customer Profile
```

One person may buy from multiple businesses.

Example:

```text
Customer #123
├── Digital Services
│   └── Website Maintenance
├── Gaming Store
│   └── PUBG Orders
└── Software
    └── NEXT F SEO Agency License
```

Each business keeps domain-specific data while sharing the account identity.

---

# 28. Shared Payment Layer

All three businesses should use a shared payment abstraction.

```text
Payment
├── Business Domain
├── Order
├── Customer
├── Amount
├── Currency
├── Gateway
├── Gateway Transaction ID
├── Status
├── Paid At
└── Refund State
```

Business type:

```text
digital
gaming
software
```

Do not duplicate payment gateway integration three times.

---

# 29. Shared Notification Layer

```text
Notification Service
├── Email
├── Admin notification
├── Client portal
├── Gaming customer
└── Software customer
```

Event examples:

```text
digital.invoice.paid
digital.project.approval_requested

gaming.order.completed
gaming.order.failed
gaming.supplier.low_balance

software.license.expiring
software.release.published
software.subscription.renewed
```

---

# 30. Shared File Architecture

Use one file service, with domain ownership.

```text
R2
│
├── digital/
│   ├── proposals/
│   ├── deliverables/
│   ├── invoices/
│   └── reports/
│
├── gaming/
│   └── exports/
│
├── software/
│   ├── releases/
│   ├── downloads/
│   └── documentation-assets/
│
└── platform/
    ├── avatars/
    └── system/
```

Files should be referenced by metadata in the database, not exposed as uncontrolled public paths.

---

# 31. Cloudflare-Only Backend Architecture

```text
Public Apps / Admin
        │
        ▼
Cloudflare Workers
        │
        ├── Identity / Auth
        ├── Digital API
        ├── Gaming API
        ├── Software API
        ├── Payment Webhooks
        └── Supplier Webhooks
        │
        ├─────────────┐
        ▼             ▼
Cloudflare D1       Cloudflare R2
Structured Data     Files / releases
        │
        ├─────────────┐
        ▼             ▼
Cloudflare KV       Queues
Fast config/cache   Async jobs
        │             │
        ▼             ▼
Durable Objects    Workflows
Stateful control   Long-running processes
```

Use:

### Workers
- Admin API
- Client portal API
- Gaming supplier gateway
- Plugin update API
- Payment webhooks
- Auth/session APIs

### D1
- Core relational business data

### R2
- Project files
- Reports
- Software release ZIPs
- Secure downloads
- Backups where appropriate

### KV
- Fast configuration
- Feature flags
- short-lived lookup/cache data
- public metadata where appropriate

### Queues
- Email jobs
- supplier order processing
- webhook processing
- report delivery
- analytics/event processing

### Durable Objects
Use only when true state coordination is required.

Examples:
- order locking
- concurrency-sensitive workflows
- rate-limited supplier coordination
- live admin state if needed

### Workflows
- Digital project onboarding
- invoice / renewal sequences
- supplier retry/recovery
- software release publication
- license renewal workflows

---

# 32. Recommended D1 Domain Boundaries

Logical schema groups:

```text
platform_*
digital_*
gaming_*
software_*
shared_*
```

Example:

```text
platform_users
platform_roles
platform_permissions
platform_audit_logs

shared_accounts
shared_contacts
shared_payments
shared_notifications
shared_files

digital_leads
digital_opportunities
digital_proposals
digital_clients
digital_services
digital_projects
digital_tasks
digital_invoices
digital_subscriptions
digital_sites
digital_support_tickets

gaming_products
gaming_supplier_products
gaming_product_mappings
gaming_prices
gaming_orders
gaming_suppliers
gaming_supplier_transactions
gaming_reconciliation

software_products
software_editions
software_releases
software_licenses
software_activations
software_orders
software_subscriptions
software_downloads
```

---

# 33. Route Architecture

```text
/admin
│
├── /platform
│   ├── /dashboard
│   ├── /users
│   ├── /roles
│   ├── /audit
│   ├── /help-center
│   ├── /infrastructure
│   └── /settings
│
├── /next-f
│   ├── /dashboard
│   ├── /sales
│   ├── /clients
│   ├── /services
│   ├── /projects
│   ├── /billing
│   ├── /sites
│   ├── /support
│   ├── /automation
│   └── /reports
│
├── /gaming-store
│   ├── /dashboard
│   ├── /orders
│   ├── /products
│   ├── /pricing
│   ├── /suppliers
│   ├── /customers
│   ├── /finance
│   ├── /support
│   └── /settings
│
└── /software
    ├── /dashboard
    ├── /products
    ├── /releases
    ├── /licenses
    ├── /customers
    ├── /orders
    ├── /subscriptions
    ├── /updates
    ├── /downloads
    ├── /support
    ├── /analytics
    └── /settings
```

---

# 34. Navigation Design

Main sidebar:

```text
Dashboard

PLATFORM
Admin Controls

BUSINESSES
NEXT F Digital
Gaming Store
NEXT F Software
```

When a business is selected, show its second-level navigation.

Example:

```text
NEXT F Digital
├── Dashboard
├── Sales
├── Clients
├── Services
├── Projects
├── Billing
├── Client Sites
├── Support
├── Automation
└── Reports
```

Do not show 50 child items permanently in the main sidebar.

Use contextual sub-navigation inside each module.

---

# 35. What to Remove from Current Admin

Remove duplicated / fake architecture after migration.

## Gaming Store

Remove separate top-level pages for:

```text
customer-fields
sync
presentation
fulfillment
risk
verification
resellers
supplier-profiles
supplier-setup
supplier-operations
supplier-governance
supplier-certification
operations-cockpit
launch
production
retention
migration
restore
```

Any useful function from those should move into:

```text
Orders
Products
Suppliers
Finance
Support
Platform
```

## NEXT F Digital

Remove or merge:

```text
Separate CRM page
Separate Contacts app
Separate Delivery app
Generic Products model for services
Plugin releases inside Digital
Licenses inside Digital
Product files inside Digital
Public page controls
Visual builder
Public content manager
Duplicate analytics
Duplicate settings
```

## Public Website Controls

Remove from both NEXT F and Gaming Store admin:

```text
Pages
Visual Builder
Reusable Sections
Public Content Editor
Branding Editor
SEO Page Editor
Redirect Editor
Legal Page Editor
```

unless a future requirement explicitly restores them.

---

# 36. What Must Move from the Current Monolithic Files

Current large files such as:

```text
AdminGamingStorePage.tsx
AdminGamingConnectionsPage.tsx
AdminGamingOperationsWorkbench.tsx
AdminGamingRecordDrawer.tsx
```

should be treated as temporary sources of existing functionality.

Final target:

```text
Monolithic Page
      ↓
Extract logic
      ↓
Move to correct module
      ↓
Create module components
      ↓
Create module hooks/services
      ↓
Update routes
      ↓
Run QA
      ↓
Delete old monolith
```

The old file should not remain as a hidden dependency after migration.

---

# 37. Component Rules

Each feature module should prefer:

```text
feature/
├── Page.tsx
├── components/
├── hooks/
├── services/
├── types.ts
├── schema.ts
├── constants.ts
└── index.ts
```

Do not create files simply to make the tree look larger.

Create a folder only when it owns real behavior.

No `.gitkeep` architecture pretending that implementation exists.

---

# 38. Shared UI Rules

Reusable components live in:

```text
admin/src/shared/
```

Examples:

```text
DataTable
FilterBar
Search
StatusBadge
MetricCard
PageHeader
Drawer
Dialog
FormField
DatePicker
Money
EmptyState
ErrorState
LoadingState
ActivityTimeline
FileUploader
PermissionGate
```

Business-specific components stay inside their business module.

---

# 39. API Service Rules

Do not use one giant service file.

Bad:

```text
gamingAdmin.ts
```

with every action in one file.

Preferred:

```text
gaming-store/services/
├── orders.api.ts
├── products.api.ts
├── pricing.api.ts
├── suppliers.api.ts
├── finance.api.ts
└── support.api.ts
```

Same pattern for Digital and Software.

---

# 40. Core Status Models

Avoid arbitrary status strings.

Use explicit finite states.

## Digital Project

```text
draft
planned
active
blocked
awaiting_client
completed
cancelled
```

## Invoice

```text
draft
issued
partially_paid
paid
overdue
cancelled
refunded
```

## Gaming Order

```text
created
payment_pending
paid
validating
submitted
processing
completed
failed
refund_pending
refunded
```

## Software License

```text
active
grace
expired
suspended
revoked
```

## Software Release

```text
development
beta
release_candidate
stable
deprecated
withdrawn
```

---

# 41. Cross-Business Reporting

Platform-level executive dashboard may aggregate:

```text
NEXT F Digital Revenue
Gaming Store Revenue
Software Revenue

Total Revenue
Total Refunds
Recurring Revenue
Outstanding Receivables
Support Load
System Health
```

But detailed analytics remain inside each business.

---

# 42. Search Architecture

Global command search should understand domains.

Example queries:

```text
NF-1024
ABC Restaurant
PUBG Order 3021
NEXT F SEO License
invoice 948
abcrestaurant.lk
```

Results should indicate source:

```text
DIGITAL
Client: ABC Restaurant

GAMING
Order: GS-3021

SOFTWARE
License: NFSEO-XXXX
```

---

# 43. Notification Architecture

Admin notification center should categorize:

```text
Platform
Digital
Gaming
Software
Security
Finance
```

Critical events can be elevated.

Examples:

```text
Website offline
Supplier API unavailable
Supplier balance low
Payment webhook failing
Plugin release failed
License abuse threshold exceeded
Security event
```

---

# 44. Permissions Architecture

Permissions must be granular but manageable.

Example groups:

```text
platform.*
digital.sales.*
digital.projects.*
digital.billing.*
digital.sites.*

gaming.orders.*
gaming.products.*
gaming.suppliers.*
gaming.finance.*

software.products.*
software.releases.*
software.licenses.*
software.billing.*
```

Use roles to bundle them.

---

# 45. Final Business Separation

## NEXT F Digital

Purpose:

```text
Sell services
Manage clients
Run projects
Collect payments
Maintain client sites
Support clients
Renew recurring services
```

## Gaming Store

Purpose:

```text
Import supplier catalog
Map products
Set margins
Accept orders
Fulfill through supplier
Reconcile money
Handle failures/refunds
```

## NEXT F Software

Purpose:

```text
Develop products
Publish versions
Sell licenses
Manage activations
Deliver updates
Handle renewals
Support users
```

## Platform

Purpose:

```text
Identity
Permissions
Security
Infrastructure
Audit
Shared integrations
System configuration
```

---

# 46. Final Architecture Summary

```text
NEXT F CMS
│
├── PLATFORM
│   │
│   ├── Dashboard
│   ├── Users
│   ├── Roles & Permissions
│   ├── Audit
│   ├── Notifications
│   ├── Customer Help Center
│   ├── Integrations
│   ├── Infrastructure
│   ├── Domains
│   ├── Health
│   ├── Backup
│   ├── Security
│   ├── Logs
│   └── Settings
│
├── NEXT F DIGITAL
│   │
│   ├── Dashboard
│   ├── Sales
│   ├── Clients
│   ├── Services
│   ├── Projects
│   ├── Billing
│   ├── Client Sites
│   ├── Support
│   ├── Automation
│   └── Reports
│
├── GAMING STORE
│   │
│   ├── Dashboard
│   ├── Orders
│   ├── Products
│   ├── Pricing
│   ├── Suppliers
│   ├── Customers
│   ├── Finance
│   ├── Support
│   └── Settings
│
└── NEXT F SOFTWARE
    │
    ├── Dashboard
    ├── Products
    ├── Releases
    ├── Licenses
    ├── Customers
    ├── Orders
    ├── Subscriptions
    ├── Updates
    ├── Downloads
    ├── Support
    ├── Analytics
    └── Settings
```

---

# 47. Final Principle

The CMS must not be organized around every possible technical feature.

It must be organized around the real business workflows:

```text
NEXT F Digital
Sell → Deliver → Bill → Maintain → Renew

Gaming Store
Source → Price → Sell → Fulfill → Reconcile

NEXT F Software
Build → Release → License → Update → Renew

Platform
Secure → Control → Observe → Operate
```

That should be the permanent architecture baseline for the NEXT F CMS.

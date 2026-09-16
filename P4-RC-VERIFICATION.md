# P4 RC verification — CMS v1.0.18

Baseline: CMS v1.0.16 P4 RC.

This increment retires production-facing legacy Gaming CMS surfaces and introduces canonical Customer 360 built from authenticated accounts and real commerce history.

Verified in this build session:

- all local CMS `check:*` suites: 43/43 passed;
- canonical Gaming cleanup: 21/21 passed;
- Gaming vNext integration: 26/26 passed;
- production purity: 33/33 passed;
- Live Operations: 13/13 passed;
- Refund/Finance: 12/12 passed;
- Risk operations: 14/14 passed;
- Notification operations: 12/12 passed;
- Commerce Analytics: 16/16 passed;
- Promotions: 15/15 passed;
- Support: 16/16 passed;
- NEXT F Media: 25/25 passed;
- Final Acceptance regression: 67/67 passed;
- CMS Worker TypeScript compile passed;
- changed TS/TSX syntax transpilation passed.

The full Vite build remains a deployment-machine gate when dependency restoration is unavailable in the packaging runtime.

No D1 schema migration or new secret is required.

The live Contracts Registry remains authoritative if packaged documentation conflicts with production contracts.


## v1.0.18 build hotfix
- Corrected required StatePanel state props in Customers and Gaming Dashboard.
- Corrected Storefront hero search to use canonical product kind/merchandising kind rather than nonexistent category.

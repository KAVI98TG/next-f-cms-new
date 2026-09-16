# P4 RC verification — CMS v1.0.14

Baseline: CMS v1.0.13 P4 RC.

This hotfix hardens Storefront Merchandising layout and production frontend build configuration.

Verified in this build session:

- `check:gaming-storefront-merchandising`: 14/14 passed.
- `check:release-hygiene`: 34/34 passed.
- Source changes are limited to Storefront Merchandising layout, global top-level section rhythm, production Vite environment configuration, version/docs, and their regression checks.

The full Vite build remains a deployment-machine gate because npm registry dependency restoration is unavailable in this container. The same v1.0.13 source baseline built successfully in production immediately before this patch, and the TSX change is class-name-only.

The live Contracts Registry remains authoritative if packaged documentation conflicts with production contracts.

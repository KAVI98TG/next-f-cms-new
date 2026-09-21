# NEXT F CMS v1.0.45 — Full Source Release

This full source tree includes the supplier-funding safety workspace plus the funding idempotency boundary, live Gaming operational notification bridge, notification-provider health projection, and global UI badge safeguards retained in the assembled project state.

Funding safety highlights:
- live FazerCards funding methods are chosen before invoice creation;
- provider network/address become immutable payment instructions after creation;
- exact provider arrival amount is authoritative;
- sender network/withdrawal fee is explicitly separate;
- QR/address/exact-amount copy actions require an operator acknowledgement for on-chain payments;
- wider desktop funding workspace with responsive mobile fallback;
- balance-before/after reconciliation is displayed when supplied by Gaming;
- CMS → Gaming funding uses a separate deterministic downstream idempotency namespace.

No D1 migration is introduced by this release.

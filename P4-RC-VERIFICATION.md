# P4 RC verification — CMS v1.0.13

Baseline: CMS v1.0.12 P4 RC.

This increment adds the NEXT F Media Service on Cloudflare R2 for owned Gaming artwork and private Support evidence.

Verified in this build session:

- 42/42 local CMS `check:*` suites passed after final release versioning.
- `check:media-service`: 25/25 passed.
- `check:gaming-support`: 16/16 passed.
- `check:gaming-artwork`: 9/9 passed.
- `check:gaming-storefront-merchandising`: 12/12 passed.
- CMS Cloudflare Worker TypeScript compile passes.
- final post-version release hygiene passed before packaging.

Key release properties:

- dedicated private `nextf-media-production` R2 binding;
- `media.nextf.lk` public delivery is Worker-controlled rather than a public R2 bucket;
- browser uploads use five-minute S3 presigned PUT URLs with content-type signing;
- upload staging is promoted to a different immutable served object key during finalization;
- actual R2 size/content-type are validated before an asset becomes ready;
- product, family and homepage artwork can upload directly to NEXT F Media;
- Support evidence accepts private images/PDFs and downloads only through authenticated CMS API access;
- media metadata is stored canonically in shared D1 under `nextf.media.asset`;
- no D1 SQL migration is required.

Deployment requires the bucket, scoped R2 S3 credentials, CORS policy and staging lifecycle rule described in `docs/V1.0.13-NEXTF-MEDIA-R2-P4.md`.

Before deployment on a normal development machine run:

```powershell
npm ci
npm run build
npm run check:media-service
npm run check:gaming-support
npm run check:gaming-artwork
npm run check:gaming-storefront-merchandising
npm run check:release-hygiene
```

A full Vite build and live-network production acceptance remain deployment-machine gates because dependencies/live production are not bundled into this RC source archive.

The live Contracts Registry remains authoritative if packaged documentation conflicts with production contracts.

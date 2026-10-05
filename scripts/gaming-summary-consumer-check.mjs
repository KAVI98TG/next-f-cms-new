import fs from 'node:fs';

const env = fs.readFileSync('infrastructure/cloudflare/src/env.ts','utf8');
const index = fs.readFileSync('infrastructure/cloudflare/src/index.ts','utf8');
const summary = fs.readFileSync('infrastructure/cloudflare/src/gamingSummary.ts','utf8');
const config = fs.readFileSync('infrastructure/cloudflare/wrangler.production.jsonc','utf8');
const migration = fs.readFileSync('infrastructure/cloudflare/migrations/0006_gaming_summary_consumer.sql','utf8');

const checks = [
  ['Gaming browser origin removed from CMS env', !env.includes('GAMING_ADMIN_ORIGIN')],
  ['Gaming browser origin removed from CMS config', !config.includes('GAMING_ADMIN_ORIGIN')],
  ['Summary ingest secret is server-side', env.includes('GAMING_SUMMARY_INGEST_TOKEN') && config.includes('GAMING_SUMMARY_INGEST_TOKEN')],
  ['Summary endpoint is registered', index.includes('/v1/integrations/gaming/summary') && index.includes('handleGamingSummary')],
  ['Summary endpoint is bearer authenticated', summary.includes('GAMING_SUMMARY_INGEST_TOKEN') && summary.includes("authorization")],
  ['Summary contract is intentionally small', summary.includes("source: 'nextf-gaming-admin'") && summary.includes('commerce?:') && summary.includes('operations?:') && summary.includes('supplier?:')],
  ['Gaming summary has dedicated storage', migration.includes('gaming_summary_snapshots')],
  ['CMS auth completion returns only to CMS', index.includes('location:env.CMS_ORIGIN') && !index.includes('requestedReturn')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}
console.log(`\nGaming summary consumer: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed) process.exit(1);
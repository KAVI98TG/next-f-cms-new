import fs from 'node:fs';

const env = fs.readFileSync('infrastructure/cloudflare/src/env.ts', 'utf8');
const index = fs.readFileSync('infrastructure/cloudflare/src/index.ts', 'utf8');
const config = fs.readFileSync('infrastructure/cloudflare/wrangler.production.jsonc', 'utf8');

const checks = [
  ['Gaming admin origin exists in WorkerEnv', /GAMING_ADMIN_ORIGIN\?: string/.test(env)],
  ['Production config pins gaming.nextf.lk', /"GAMING_ADMIN_ORIGIN":\s*"https:\/\/gaming\.nextf\.lk"/.test(config)],
  ['Gaming origin participates in CORS allowlist', /env\.GAMING_ADMIN_ORIGIN/.test(index) && /filter\(\(value\):value is string=>Boolean\(value\)\)/.test(index)],
  ['Auth return is limited to admin paths', /target\.pathname==="\/admin"\|\|target\.pathname\.startsWith\("\/admin\/"\)/.test(index)],
  ['Invalid return target falls back to CMS origin', /let location=env\.CMS_ORIGIN/.test(index)],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\nGaming Admin origin: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);

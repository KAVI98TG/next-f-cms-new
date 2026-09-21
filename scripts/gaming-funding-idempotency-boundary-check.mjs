import fs from 'node:fs';
const control=fs.readFileSync(new URL('../infrastructure/cloudflare/src/gamingControl.ts',import.meta.url),'utf8');
let failed=0;const check=(n,o)=>{console.log(`${o?'PASS':'FAIL'}  ${n}`);if(!o)failed++;};
check('funding boundary derives downstream keys',control.includes('scopedGamingIdempotencyKey'));
check('create and verify use distinct scopes',control.includes('funding-create')&&control.includes('funding-verify'));
check('outer key is fingerprinted',control.includes('crypto.subtle.digest("SHA-256"'));
check('derived key is forwarded',control.includes('idempotencyKey:downstreamIdempotencyKey'));
if(failed)process.exit(1);console.log('\nFunding idempotency boundary checks passed.');

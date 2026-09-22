import fs from 'node:fs';
const gc=fs.readFileSync(new URL('../infrastructure/cloudflare/src/gamingControl.ts',import.meta.url),'utf8');
const env=fs.readFileSync(new URL('../infrastructure/cloudflare/src/env.ts',import.meta.url),'utf8');
let failed=0;
const check=(name,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed+=1;};
const reviewBlock=gc.slice(gc.indexOf('export type GamingCustomerReview'));
check('CMS environment exposes commerce bridge credential',env.includes('GAMING_CMS_COMMERCE_TOKEN?: string'));
check('review list uses commerce bridge credential',reviewBlock.includes('/v1/gaming/admin/reviews?status=')&&reviewBlock.includes('token:env.GAMING_CMS_COMMERCE_TOKEN'));
check('review decision uses commerce bridge credential',reviewBlock.includes('/decision`,token:env.GAMING_CMS_COMMERCE_TOKEN'));
check('review decision keeps scoped downstream idempotency',reviewBlock.includes('scopedGamingIdempotencyKey("review-decision"'));
if(failed){console.error(`\n${failed} review bridge auth checks failed.`);process.exit(1);}
console.log('\nCMS review bridge auth checks passed.');

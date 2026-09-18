import fs from 'node:fs';

const page=fs.readFileSync('src/gaming-store/pricing/PricingPage.tsx','utf8');
const css=fs.readFileSync('src/css/components.css','utf8');
const checks=[]; const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

check('pricing uses control-center page shell',page.includes('pricing-control-page')&&css.includes('.pricing-control-page'));
check('pricing overview exposes FX mode retail target and supplier',page.includes('USD → LKR')&&page.includes('Pricing mode')&&page.includes('Retail target')&&page.includes('Supplier'));
check('pricing policy is grouped into core pricing and fees',page.includes('Core pricing')&&page.includes('Fees & rounding'));
check('pricing simulator exists',page.includes('Live simulator')&&page.includes('Customer price preview')&&page.includes('Example supplier cost (USD)'));
check('simulator includes all protected policy inputs',page.includes('markupProfit')&&page.includes('minimumProfitLkr')&&page.includes('gatewayFeePercent')&&page.includes('fixedFeeLkr')&&page.includes('roundToLkr'));
check('simulator is explicitly non-authoritative',page.includes('Checkout remains authoritative')&&page.includes('recalculates and protects the final checkout price server-side'));
check('pricing save is dirty-state aware',page.includes('const dirty=useMemo')&&page.includes('Unsaved pricing changes')&&page.includes('Pricing policy saved'));
check('save action uses clear policy wording',page.includes('Save pricing policy')&&!page.includes('Save & refresh catalog pricing'));
check('discard action restores persisted policy',page.includes('setDraft(pricing)')&&page.includes('>Discard</Button>'));
check('refresh cannot overwrite unsaved pricing draft',page.includes('if(dirty)return')&&page.includes('disabled={busy||dirty}'));
check('unsaved pricing has unload protection',page.includes("beforeunload")&&page.includes('event.returnValue'));
check('markup changes do not require supplier resync',page.includes('no supplier API resync is required')&&page.includes('No supplier resync required'));
check('production safeguards are visually grouped',page.includes('Pricing authority & security')&&page.includes('pricing-safeguard-grid'));
check('pricing control center is responsive',css.includes('@media(max-width:1100px)')&&css.includes('.pricing-control-grid{grid-template-columns:1fr}'));
check('live preview is sticky on wide screens',css.includes('.pricing-preview-panel{position:sticky'));
check('local pricing sandbox remains separate',page.includes('function LocalPricingPage')&&page.includes('Local development pricing sandbox.'));

const failed=checks.filter((entry)=>!entry.ok);
for(const entry of checks) console.log(`${entry.ok?'PASS':'FAIL'}  ${entry.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Gaming pricing UI checks passed.`);
if(failed.length) process.exit(1);

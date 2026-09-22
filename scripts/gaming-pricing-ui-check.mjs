import fs from 'node:fs';

const page=fs.readFileSync('src/gaming-store/pricing/PricingPage.tsx','utf8');
const css=fs.readFileSync('src/css/components.css','utf8');
const checks=[]; const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

check('pricing uses control-center page shell',page.includes('pricing-control-page')&&css.includes('.pricing-control-page'));
check('pricing overview keeps only non-duplicate status metrics',page.includes('USD → LKR')&&page.includes('Supplier')&&!page.includes('<MetricCard label="Pricing mode"')&&!page.includes('<MetricCard label="Retail target"'));
check('pricing policy is grouped into core pricing and fees',page.includes('Core pricing')&&page.includes('Fees & rounding'));
check('pricing simulator exists',page.includes('Live simulator')&&page.includes('Customer price preview')&&page.includes('Example supplier cost (USD)'));
check('simulator includes all protected policy inputs',page.includes('markupProfit')&&page.includes('minimumProfitLkr')&&page.includes('gatewayFeePercent')&&page.includes('fixedFeeLkr')&&page.includes('roundToLkr'));
check('simulator uses compact preview-only state',page.includes('Preview only')&&!page.includes('Checkout remains authoritative')&&!page.includes('pricing-preview-note'));
check('pricing save is dirty-state aware',page.includes('const dirty=useMemo')&&page.includes('Unsaved')&&page.includes('Save pricing policy'));
check('save action uses clear policy wording',page.includes('Save pricing policy')&&!page.includes('Save & refresh catalog pricing'));
check('discard action restores persisted policy',page.includes('setDraft(pricing)')&&page.includes('>Discard</Button>'));
check('refresh cannot overwrite unsaved pricing draft',page.includes('if(dirty)return')&&page.includes('disabled={busy||dirty}'));
check('unsaved pricing has unload protection',page.includes('beforeunload')&&page.includes('event.returnValue'));
check('pricing UI does not expose supplier resync implementation copy',!page.includes('supplier API resync')&&!page.includes('No supplier resync required'));
check('pricing architecture safeguard explainer is removed',!page.includes('pricing-safeguards-panel')&&!page.includes('pricing-safeguard-grid')&&!page.includes('Pricing authority & security'));
check('pricing control center is responsive',css.includes('@media(max-width:1100px)')&&css.includes('.pricing-control-grid{grid-template-columns:1fr}'));
check('live preview is sticky on wide screens',css.includes('.pricing-preview-panel{position:sticky'));
check('local pricing controls remain separate',page.includes('function LocalPricingPage')&&page.includes('Local pricing controls.')&&page.includes('runtime.isProduction?<LivePricingPage/>:<LocalPricingPage/>'));

const failed=checks.filter((entry)=>!entry.ok);
for(const entry of checks) console.log(`${entry.ok?'PASS':'FAIL'}  ${entry.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Gaming pricing UI checks passed.`);
if(failed.length) process.exit(1);

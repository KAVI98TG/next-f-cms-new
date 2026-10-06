import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const pkg=JSON.parse(read('package.json'));
const state=JSON.parse(read('RELEASE-STATE.json'));
const wrangler=JSON.parse(read('infrastructure/cloudflare/wrangler.production.jsonc'));
let failed=0;
const check=(name,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;};

check('release manifest matches package version',state.version===pkg.version&&state.version==='1.0.64');
const candidateState=state.canonical===false&&state.releaseStatus==='candidate'&&state.validation?.frontendBuild==='pending'&&state.validation?.workerTypecheck==='pending';
const canonicalState=state.canonical===true&&state.releaseStatus==='canonical'&&state.validation?.frontendBuild==='passed'&&state.validation?.workerTypecheck==='passed';
check('release declares exact canonical parent and valid lifecycle state',state.baseline==='1.0.63'&&(candidateState||canonicalState));
check('live contract registry and production version are pinned',state.contractRegistry==='https://contracts.nextf.lk/'&&state.contractVersion==='1.4.0');
check('continuity governance docs are canonical under docs/governance',exists('docs/governance/NEXT-F-CONTINUITY-RULES.md')&&read('docs/governance/PROJECT-RULES.md').includes('MIGRATE FORWARD')&&!exists('NEXT-F-CONTINUITY-RULES.md')&&!exists('RULESE.txt'));

const form=read('src/shared/components/FormField.tsx');
check('global select remains a custom listbox',form.includes('aria-haspopup="listbox"')&&form.includes('createPortal')&&form.includes('select-input__native'));
const componentsCss=read('src/css/components.css');
check('hidden native select cannot surface visually',componentsCss.includes('.select-input__native')&&componentsCss.includes('opacity:0')&&componentsCss.includes('pointer-events:none'));
const focus=read('src/shared/components/useOverlayFocus.ts');
check('global overlay focus stability remains installed',focus.includes('useOverlayFocus'));

const app=read('src/app/App.tsx');
const nav=read('src/app/navigation.ts');
const staff=read('infrastructure/cloudflare/src/staff.ts');
const gamingSummary=read('infrastructure/cloudflare/src/gamingSummary.ts');
check('CMS Gaming UI continuity is summary only',exists('src/gaming-store/summary/GamingSummaryPage.tsx')&&nav.includes('label: "Summary"')&&app.includes('"/gaming-store/dashboard": <GamingSummaryPage />'));
check('retired CMS Gaming controls stay absent',!exists('infrastructure/cloudflare/src/gamingControl.ts')&&!exists('src/gaming-store/suppliers/SuppliersPage.tsx')&&!exists('src/gaming-store/reviews/ReviewsPage.tsx')&&!exists('src/gaming-store/support/SupportPage.tsx'));
check('CMS staff contract keeps summary query and rejects Gaming controls',staff.includes('staff.gaming.summary.get')&&staff.includes('GAMING_CONTROL_MOVED')&&!staff.includes('staff.gaming.supplier.')&&!staff.includes('staff.gaming.operations.'));
check('Gaming summary ingestion remains bounded and server authenticated',gamingSummary.includes('GAMING_SUMMARY_INGEST_TOKEN')&&gamingSummary.includes('MAX_SUMMARY_BYTES=16*1024')&&gamingSummary.includes('normalizeSummary'));

const required=new Set(state.requiredSecretNames||[]);
const declared=new Set(wrangler.secrets?.required||[]);
check('all manifest secrets are declared required in Wrangler',[...required].every((s)=>declared.has(s))&&required.size===declared.size);
check('Gaming CMS secret surface is summary-only',required.has('GAMING_SUMMARY_INGEST_TOKEN')&&![...required].some((s)=>/^GAMING_CMS_/.test(s)));
check('secret names only; no secret values in release manifest',(state.requiredSecretNames||[]).every((s)=>typeof s==='string'&&/^[A-Z0-9_]+$/.test(s))&&!JSON.stringify(state).match(/sk-|Bearer |BEGIN PRIVATE KEY|api[_-]?key\s*[:=]\s*["'][^"']+/i));

if(failed){console.error(`\n${failed} CMS continuity checks failed.`);process.exit(1);}
console.log('\nNEXT F CMS continuity checks passed.');

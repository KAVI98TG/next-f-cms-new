import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const app=read("src/app/App.tsx");
const nav=read("src/app/navigation.ts");
const staff=read("infrastructure/cloudflare/src/staff.ts");
const worker=read("infrastructure/cloudflare/src/index.ts");
const summary=read("infrastructure/cloudflare/src/gamingSummary.ts");
const config=read("infrastructure/cloudflare/wrangler.production.jsonc");

check("CMS active Gaming UI is summary only",/GamingSummaryPage/.test(app)&&!/GamingDashboard/.test(app)&&!/GamingSuppliersPage/.test(app)&&!/StorefrontVNextPage/.test(app));
check("CMS Gaming navigation exposes one read-only summary",/id: "gaming-store"[\s\S]*label: "Summary"/.test(nav)&&!/id: "gaming-store"[\s\S]*label: "Suppliers"[\s\S]*id: "software"/.test(nav));
check("Legacy Gaming CMS routes redirect to summary",/\/gaming-store\/suppliers"[^\n]+LegacyGamingRedirect to="\/gaming-store\/dashboard"/.test(app)&&/\/gaming-store\/storefront"[^\n]+LegacyGamingRedirect to="\/gaming-store\/dashboard"/.test(app));
check("CMS Gaming state is no longer readable or writable",/if\(key\.startsWith\("nextf\.vnext\.gaming\."\)\) return false;/.test(staff));
check("CMS exposes only staff.gaming.summary.get",/staff\.gaming\.summary\.get/.test(staff)&&/GAMING_CONTROL_MOVED/.test(staff)&&!/staff\.gaming\.operations\.snapshot\.get/.test(staff)&&!/staff\.gaming\.supplier\.funding\.create/.test(staff));
check("CMS accepts bounded server-to-server Gaming summary",/\/v1\/integrations\/gaming\/summary/.test(worker)&&/GAMING_SUMMARY_INGEST_TOKEN/.test(summary)&&/MAX_SUMMARY_BYTES/.test(summary));
check("CMS production secrets removed old Gaming control tokens",/GAMING_SUMMARY_INGEST_TOKEN/.test(config)&&!/GAMING_CMS_OPERATIONS_TOKEN/.test(config)&&!/GAMING_CMS_COMMERCE_TOKEN/.test(config)&&!/GAMING_CMS_SUPPORT_TOKEN/.test(config)&&!/GAMING_CMS_SUPPLIER_FUNDING_TOKEN/.test(config)&&!/GAMING_CMS_REVIEWS_TOKEN/.test(config));
check("CMS no longer allows Gaming Admin browser origin",!/GAMING_ADMIN_ORIGIN/.test(config)&&!/GAMING_ADMIN_ORIGIN/.test(worker));

const failed=checks.filter((row)=>!row.ok);
for(const row of checks)console.log(`${row.ok?"PASS":"FAIL"}  ${row.name}`);
console.log(`\nGaming downstream cleanup: ${checks.length-failed.length}/${checks.length} checks passed.`);
if(failed.length)process.exit(1);

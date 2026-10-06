import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const walk=(dir)=>fs.existsSync(path.join(root,dir))?fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name).replaceAll("\\","/")]):[];

const app=read("src/app/App.tsx");
const nav=read("src/app/navigation.ts");
const permissions=read("src/app/auth/permissions.ts");
const staff=read("infrastructure/cloudflare/src/staff.ts");
const worker=read("infrastructure/cloudflare/src/index.ts");
const env=read("infrastructure/cloudflare/src/env.ts");
const config=read("infrastructure/cloudflare/wrangler.production.jsonc");
const summary=read("infrastructure/cloudflare/src/gamingSummary.ts");
const summaryPage=read("src/gaming-store/summary/GamingSummaryPage.tsx");
const media=read("infrastructure/cloudflare/src/media.ts");
const operations=read("src/services/shared/operationsCenter.ts");
const operationsHook=read("src/services/shared/useOperationsCenter.ts");
const search=read("src/services/shared/searchIndex.ts");
const acceptance=read("src/services/acceptance/finalAcceptance.ts");
const authTypes=read("src/app/auth/types.ts");
const session=read("src/app/auth/SessionProvider.tsx");
const backendContracts=read("src/services/backend/contracts.ts");
const platformStore=read("src/platform/services/platformStore.ts");
const pkg=JSON.parse(read("package.json"));

const gamingUi=walk("src/gaming-store").filter((p)=>p!=="src/gaming-store/summary/GamingSummaryPage.tsx");
check("CMS Gaming UI contains only the read-only summary",gamingUi.length===0&&exists("src/gaming-store/summary/GamingSummaryPage.tsx"));
check("Gaming navigation exposes only Summary",/id: "gaming-store"[\s\S]*?navigation: \[[\s\S]*?label: "Summary"/.test(nav)&&!/gaming-store\/(?:catalog|products|orders|suppliers|support|finance|analytics|promotions|reviews|storefront)"/.test(nav));
check("Retired Gaming paths use one compatibility catch-all",/const gamingLegacy = pathname\.startsWith\("\/gaming-store\/"\)/.test(app)&&!/gaming-store\/suppliers": <LegacyGamingRedirect/.test(app));
check("CMS Gaming route permission is read-only",permissions.includes('["/gaming-store", "gaming.read"]')&&!permissions.includes("gaming.orders.manage")&&!permissions.includes("gaming.products.manage")&&!permissions.includes("gaming.suppliers.manage")&&!permissions.includes("gaming.finance.manage"));
check("CMS permission vocabulary contains only gaming.read",authTypes.includes('"gaming.read"')&&!authTypes.includes("gaming.orders.manage")&&!authTypes.includes("gaming.products.manage")&&!authTypes.includes("gaming.suppliers.manage")&&!authTypes.includes("gaming.finance.manage")&&!session.includes("gaming.orders.manage"));
check("Shared backend registry contains no Gaming control commands",!backendContracts.includes("staff.gaming.supplier")&&!backendContracts.includes("gaming.suppliers.manage")&&!backendContracts.includes("gaming.finance.manage"));
check("CMS local platform catalog advertises Gaming viewer only",platformStore.includes('name: "Gaming Viewer"')&&platformStore.includes('{ group: "Gaming Store", permissions: ["gaming.read"] }')&&!platformStore.includes('name: "Gaming Supplier API"'));

const retiredWorker=["gamingAnalytics.ts","gamingControl.ts","gamingCustomers.ts","gamingOperations.ts","gamingPromotions.ts","gamingSupport.ts"];
check("Retired CMS Gaming Worker modules are deleted",retiredWorker.every((file)=>!exists("infrastructure/cloudflare/src/"+file))&&exists("infrastructure/cloudflare/src/gamingSummary.ts"));
check("CMS staff API exposes Gaming summary only",staff.includes('input.operation==="staff.gaming.summary.get"')&&staff.includes("GAMING_CONTROL_MOVED")&&!staff.includes("staff.gaming.operations")&&!staff.includes("staff.gaming.supplier")&&!staff.includes("staff.gaming.support"));
check("CMS has no Gaming media write commands",!staff.includes("staff.media.upload.create")&&!staff.includes("staff.media.upload.finalize")&&!worker.includes("/v1/staff/media/")&&!media.includes("createMediaUpload")&&!media.includes("finalizeMediaUpload")&&!media.includes("servePrivateMedia"));
check("Legacy CMS media host is read-only compatibility",media.includes("Read-only compatibility delivery")&&media.includes("servePublicMedia")&&!media.includes("presignedPut"));

check("CMS environment keeps only summary Gaming credential",env.includes("GAMING_SUMMARY_INGEST_TOKEN")&&!env.includes("GAMING_API_ORIGIN")&&!env.includes("GAMING_CMS_OPERATIONS_TOKEN")&&!env.includes("GAMING_CMS_COMMERCE_TOKEN")&&!env.includes("GAMING_CMS_REVIEWS_TOKEN")&&!env.includes("GAMING_CMS_SUPPORT_TOKEN")&&!env.includes("GAMING_CMS_SUPPLIER_FUNDING_TOKEN"));
check("CMS production config has no supplier or Gaming control secrets",config.includes("GAMING_SUMMARY_INGEST_TOKEN")&&!config.includes("FAZERCARDS")&&!config.includes("GAMING_API_ORIGIN")&&!config.includes("GAMING_CMS_OPERATIONS_TOKEN")&&!config.includes("GAMING_CMS_COMMERCE_TOKEN")&&!config.includes("GAMING_CMS_SUPPORT_TOKEN")&&!config.includes("GAMING_CMS_SUPPLIER_FUNDING_TOKEN"));

check("Gaming summary ingest is server-to-server and size bounded",worker.includes("/v1/integrations/gaming/summary")&&summary.includes("GAMING_SUMMARY_INGEST_TOKEN")&&summary.includes("MAX_SUMMARY_BYTES=16*1024")&&summary.includes("request.text()"));
check("Gaming summary normalizes exact company fields",summary.includes("normalizeSummary")&&summary.includes("orders:{")&&summary.includes("finance:{")&&summary.includes("support:{")&&summary.includes("suppliers:{fazercards:{connected")&&summary.includes("promotions:{")&&summary.includes("analytics:{"));
check("CMS does not persist supplier sync or error detail",!summary.includes("lastSync")&&!summary.includes("lastError"));
check("Gaming Summary UI points operators to Gaming Admin",summaryPage.includes("https://gaming.nextf.lk/admin")&&summaryPage.includes("Open Gaming Admin")&&summaryPage.includes("Read only"));

check("CMS global search no longer indexes Gaming operational state",!search.includes("gamingVNextStore")&&!search.includes("/gaming-store/catalog"));
check("CMS operations center no longer polls Gaming APIs",!operations.includes("loadGamingOperationsSnapshot")&&!operations.includes("loadGamingSupportSnapshot")&&!operationsHook.includes("loadGamingOperationsNotifications"));
check("CMS acceptance no longer loads Gaming product or supplier state",!acceptance.includes("gamingVNextStore")&&!acceptance.includes("Supplier routing relationships")&&acceptance.includes("Read-only Gaming summary surface"));

const forbiddenSource=["api.fzr.cards","FAZERCARDS_API_KEY","FazerCardsAdapter","scopedGamingIdempotencyKey"];
const activeText=walk("src").concat(walk("infrastructure/cloudflare/src")).filter((p)=>/\.(?:ts|tsx)$/.test(p)).map(read).join("\n");
check("CMS active source contains no FazerCards integration",forbiddenSource.every((value)=>!activeText.includes(value)));

const retiredScripts=Object.keys(pkg.scripts||{}).filter((name)=>/^check:gaming-/.test(name)&&name!=="check:gaming-final-cleanup");
check("Package scripts contain no retired Gaming checks",retiredScripts.length===0&&!pkg.scripts["check:fazercards-funding"]&&!pkg.scripts["check:review-bridge-auth"]&&!pkg.scripts["check:media-service"]);
check("Final Gaming cleanup is part of release gate",String(pkg.scripts["release:gate"]||"").includes("check:gaming-final-cleanup"));

const failed=checks.filter((row)=>!row.ok);
for(const row of checks)console.log(`${row.ok?"PASS":"FAIL"}  ${row.name}`);
console.log(`\nGaming final cleanup: ${checks.length-failed.length}/${checks.length} checks passed.`);
if(failed.length)process.exit(1);
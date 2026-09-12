import fs from "node:fs";
import path from "node:path";

const root=process.cwd(); const passes=[]; const failures=[]; const check=(name,ok)=>ok?passes.push(name):failures.push(name);
const required=[
"src/software/dashboard/SoftwareDashboard.tsx","src/software/products/ProductsPage.tsx","src/software/releases/ReleasesPage.tsx","src/software/licenses/LicensesPage.tsx","src/software/customers/CustomersPage.tsx","src/software/orders/OrdersPage.tsx","src/software/subscriptions/SubscriptionsPage.tsx","src/software/updates/UpdatesPage.tsx","src/software/downloads/DownloadsPage.tsx","src/software/support/SupportPage.tsx","src/software/analytics/AnalyticsPage.tsx","src/software/settings/SettingsPage.tsx","src/software/data/softwareStore.ts","src/software/shared/useSoftwareStore.ts","src/software/shared/SoftwareStatus.tsx","src/software/shared/format.ts"];
for(const file of required)check(`file ${file}`,fs.existsSync(path.join(root,file)));
const routes=["/software/dashboard","/software/products","/software/releases","/software/licenses","/software/customers","/software/orders","/software/subscriptions","/software/updates","/software/downloads","/software/support","/software/analytics","/software/settings"];
const app=fs.readFileSync(path.join(root,"src/app/App.tsx"),"utf8"); for(const route of routes)check(`route ${route}`,app.includes(`"${route}"`));
const dataRoot=path.join(root,"src/software/data"); const store=fs.readdirSync(dataRoot,{recursive:true}).filter((name)=>String(name).endsWith(".ts")).map((name)=>fs.readFileSync(path.join(dataRoot,String(name)),"utf8")).join("\n");
for(const op of ["addProduct","updateProduct","addEdition","createRelease","publishRelease","deprecateRelease","addCustomer","createOrder","markOrderPaid","refundOrder","updateLicense","addActivation","deactivateActivation","renewSubscription","toggleAutoRenew","checkUpdate","issueDownload","recordDownload","expireDownload","addSupportCase","updateSupportCase","saveSettings"])check(`operation ${op}`,store.includes(`${op}(`));
check("products separated from editions",store.includes("SoftwareProduct")&&store.includes("SoftwareEdition"));
check("versioned release channels",store.includes("ReleaseChannel")&&store.includes("release_candidate")&&store.includes("stable"));
check("license activation limits",store.includes("activationLimit")&&store.includes("Activation limit reached"));
check("license update entitlement",store.includes("updateAccessUntil"));
check("license support entitlement",store.includes("supportAccessUntil"));
check("annual and monthly subscriptions",store.includes('"annual"')&&store.includes('"monthly"'));
check("renewal advances license entitlement",store.includes("renewSubscription")&&store.includes("expiresAt:updated.nextRenewalAt"));
check("update checks require entitlement",store.includes("checkUpdate")&&store.includes("Update entitlement has expired"));
check("downloads tied to release and license",store.includes("releaseId")&&store.includes("licenseId")&&store.includes("issueDownload"));
check("download attempts limited",store.includes("maxDownloadAttempts"));
check("support cases product aware",store.includes("SoftwareSupportCase")&&store.includes("productId"));
check("payment issues license",store.includes("License")&&store.includes("License ${license.key} issued"));
check("refund revokes license",store.includes("Associated license revoked"));
check("browser-persistent software store",store.includes("localStorage"));
check("platform audit integration",store.includes("platformStore.addAudit"));
check("no cloudflare setup in software core",!store.includes("D1Database")&&!store.includes("R2Bucket")&&!store.includes("wrangler"));
const softwareFiles=fs.readdirSync(path.join(root,"src/software"),{recursive:true}); check("no software placeholder READMEs",!softwareFiles.some((n)=>String(n).endsWith("README.md"))); check("no software .gitkeep placeholders",!softwareFiles.some((n)=>String(n).endsWith(".gitkeep")));
const sourceFiles=[]; function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())walk(full);else if(/\.(ts|tsx)$/.test(e.name))sourceFiles.push(full);}} walk(path.join(root,"src")); let importErrors=0; for(const file of sourceFiles){const source=fs.readFileSync(file,"utf8"); for(const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)){const base=path.resolve(path.dirname(file),match[1]); const candidates=[base,`${base}.ts`,`${base}.tsx`,path.join(base,"index.ts"),path.join(base,"index.tsx")]; if(!candidates.some((c)=>fs.existsSync(c)))importErrors++;}}
check(`${sourceFiles.length} TS/TSX files discovered`,sourceFiles.length>0); check("relative imports resolve",importErrors===0);
console.log("NEXT F CMS V0.6.0 Software Core check"); for(const p of passes)console.log(`PASS  ${p}`); for(const f of failures)console.error(`FAIL  ${f}`); console.log(`\n${passes.length} passed, ${failures.length} failed`); if(failures.length)process.exit(1);

import fs from "node:fs";

const pass=[]; const fail=[];
const check=(label,condition)=>condition?pass.push(label):fail.push(label);
const exists=(path)=>fs.existsSync(path);
const read=(path)=>fs.readFileSync(path,"utf8");

const required=[
  "src/next-f/website-platform/WebsitePlatformPage.tsx",
  "src/next-f/website-platform/websitePlatformStore.ts",
  "src/next-f/website-platform/useWebsitePlatformStore.ts",
  "docs/V0.12.0-WEBSITE-PLATFORM-FOUNDATION.md",
  "docs/NEXT-F-CMS-UPGRADE-MASTER-PLAN.md",
];
required.forEach((path)=>check(`file ${path}`,exists(path)));

const app=read("src/app/App.tsx");
const nav=read("src/app/navigation.ts");
const permissionTypes=read("src/app/auth/types.ts");
const routePermissions=read("src/app/auth/permissions.ts");
const platformStore=read("src/platform/services/platformStore.ts");
const clientPage=read("src/next-f/clients/ClientsPage.tsx");
const store=read("src/next-f/website-platform/websitePlatformStore.ts");
const search=read("src/services/shared/searchIndex.ts");
const pkg=JSON.parse(read("package.json"));

check("website platform route",app.includes('"/next-f/website-platform": <WebsitePlatformPage />'));
check("website platform navigation",nav.includes('path: "/next-f/website-platform"'));
check("website platform permission type",permissionTypes.includes('"digital.website-platform.manage"'));
check("website platform route permission",routePermissions.includes('["/next-f/website-platform", "digital.website-platform.manage"]'));
check("Digital Manager receives website platform permission",platformStore.includes('"digital.website-platform.manage"'));
check("workspace provisioning is separate from access grant",store.includes('status: "requested"') && store.toLowerCase().includes('no customer access was granted'));
check("site connection requires same Digital client",store.includes('workspace.clientId !== site.clientId'));
check("contract version pinned",store.includes('WEBSITE_CONTRACT_VERSION = "1.0.0"'));
check("site manifest filename pinned",store.includes('SITE_MANIFEST_FILENAME = "nextf.site.json"'));
check("manifest defaults fail closed",store.includes('manifestStatus: "unverified"'));
check("demo lifecycle is separate",store.includes('DemoAccessRequestRecord') && store.includes('"submitted"') && store.includes('"revoked"'));
check("legacy direct portal activation removed from Clients UI",!clientPage.includes('Portal access activated') && !clientPage.includes('Invite client'));
check("Clients UI points to Website Platform",clientPage.includes('Customer Workspace') && clientPage.includes('/next-f/website-platform'));
check("workspace searchable",search.includes('type: "Customer Workspace"'));
check("package version keeps V0.12+ foundation",Number(pkg.version.split(".")[1])>=12);
check("website platform QA script",pkg.scripts?.["check:website-platform"]==="node scripts/website-platform-check.mjs");

console.log("NEXT F CMS V0.12.0 Website Platform Foundation check");
for(const item of pass)console.log(`PASS  ${item}`);
for(const item of fail)console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if(fail.length)process.exit(1);

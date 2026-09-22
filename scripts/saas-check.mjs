import fs from "node:fs";
import path from "node:path";
const root=process.cwd(); const pass=[]; const fail=[]; const check=(name,ok)=>ok?pass.push(name):fail.push(name);
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const required=[
  "src/services/shared/commerceCenter.ts","src/services/shared/searchIndex.ts","src/services/shared/operationsCenter.ts","src/services/shared/useOperationsCenter.ts","src/services/shared/useCommerceCenter.ts",
  "src/platform/accounts/AccountsPage.tsx","src/platform/payments/PaymentsPage.tsx","src/platform/data-management/DataManagementPage.tsx",
  "src/app/auth/permissions.ts","src/shared/pages/AccessDeniedPage.tsx","src/shared/components/AppErrorBoundary.tsx","src/shared/components/StatePanel.tsx"
];
for(const file of required)check(`file ${file}`,fs.existsSync(path.join(root,file)));
const app=read("src/app/App.tsx"), nav=read("src/app/navigation.ts"), session=read("src/app/auth/SessionProvider.tsx"), palette=read("src/app/layout/CommandPalette.tsx"), shell=read("src/app/layout/AppShell.tsx"), notifications=read("src/platform/notifications/NotificationsPage.tsx"), data=read("src/platform/data-management/DataManagementPage.tsx"), css=read("src/css/components.css")+read("src/css/responsive.css");
for(const route of ["/platform/accounts","/platform/payments","/platform/data"]) check(`route ${route}`,app.includes(`"${route}"`)&&nav.includes(`"${route}"`));
check("route-level permission enforcement",app.includes("permissionForPath")&&app.includes("AccessDeniedPage"));
check("session derives role permissions",session.includes("platformStore.getRoles")&&session.includes("permissions: (role?.permissions"));
check("local permission preview supported",session.includes("assumeUser"));
check("sidebar permissions hardened",read("src/app/layout/Sidebar.tsx").includes("permissionForPath")&&read("src/app/layout/Sidebar.tsx").includes("canVisit"));
check("global entity search",palette.includes("searchGlobal")&&read("src/services/shared/searchIndex.ts").includes("getLicenses")&&read("src/services/shared/searchIndex.ts").includes("getSites"));
check("shared account normalization",read("src/services/shared/commerceCenter.ts").includes("getSharedAccounts")&&read("src/services/shared/commerceCenter.ts").includes("normalizeEmail"));
check("unified payment shape",read("src/services/shared/commerceCenter.ts").includes("SharedPayment")&&read("src/services/shared/commerceCenter.ts").includes("getSharedPayments"));
check("cross-business operations notifications",notifications.includes("useOperationsCenter")&&read("src/services/shared/operationsCenter.ts").includes("digitalStore.getSites")&&read("src/services/shared/operationsCenter.ts").includes("softwareStore.getLicenses")&&!read("src/services/shared/operationsCenter.ts").includes("gamingStore"));
check("durable export utility",data.includes("exportDurableStorageRecords")&&data.includes("Export data")&&data.includes("nextf-cms-durable-backup"));
check("durable import utility",data.includes("file.text")&&data.includes("importDurableStorageRecords")&&data.includes("Import disabled")&&data.includes("Production application-data import is intentionally unavailable"));
check("global error boundary",read("src/main.tsx").includes("AppErrorBoundary"));
check("consistent empty state",read("src/shared/components/DataTable.tsx").includes("table-empty-state")&&read("src/shared/components/StatePanel.tsx").includes('state: "empty" | "loading" | "error"'));
check("skip navigation",shell.includes('href="#main-content"')&&shell.includes('id="main-content"'));
check("modal accessibility hardening",read("src/shared/components/Modal.tsx").includes('aria-modal="true"')&&read("src/shared/components/Modal.tsx").includes("useOverlayFocus")&&read("src/shared/components/useOverlayFocus.ts").includes('event.key === "Escape"'));
check("reduced motion accessibility",css.includes("prefers-reduced-motion"));
check("responsive table hardening",css.includes("data-table-wrap")&&css.includes("overflow-x:auto"));
check("no cloudflare setup",!fs.existsSync(path.join(root,"wrangler.jsonc"))&&!fs.existsSync(path.join(root,"worker"))&&!required.some((file)=>read(file).includes("D1Database")||read(file).includes("R2Bucket")));
const source=[]; const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.(ts|tsx)$/.test(e.name))source.push(f);}}; walk(path.join(root,"src")); let broken=0; for(const file of source){const text=fs.readFileSync(file,"utf8"); for(const m of text.matchAll(/from\s+["'](\.[^"']+)["']/g)){const base=path.resolve(path.dirname(file),m[1]);if(![base,`${base}.ts`,`${base}.tsx`,path.join(base,"index.ts"),path.join(base,"index.tsx")].some(fs.existsSync))broken++;}}
check(`${source.length} TS/TSX source files discovered`,source.length>=90); check("relative imports resolve",broken===0);
console.log("NEXT F CMS V0.7.0 SaaS Completion check"); for(const item of pass)console.log(`PASS  ${item}`); for(const item of fail)console.error(`FAIL  ${item}`); console.log(`\n${pass.length} passed, ${fail.length} failed`); if(fail.length)process.exit(1);

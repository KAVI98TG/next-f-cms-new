import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), pass=[], fail=[]; const check=(name,ok)=>ok?pass.push(name):fail.push(name); const exists=(f)=>fs.existsSync(path.join(root,f)); const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");
const required=[
  "src/platform/organizations/OrganizationsPage.tsx","src/platform/domains/DomainsPage.tsx","src/platform/security/SecurityPage.tsx","src/platform/logs/LogsPage.tsx","src/platform/backup/BackupPage.tsx","src/platform/cleanup/CleanupPage.tsx","src/platform/services/platformOperationsStore.ts",
  "src/next-f/settings/DigitalSettingsPage.tsx","src/next-f/settings/settingsRepository.ts","src/next-f/clients/portalRepository.ts","src/next-f/operations/digitalAdminStore.ts",
  "src/next-f/data/repositories/salesRepository.ts","src/next-f/data/repositories/clientsRepository.ts","src/next-f/data/repositories/servicesRepository.ts","src/next-f/data/repositories/projectsRepository.ts","src/next-f/data/repositories/billingRepository.ts","src/next-f/data/repositories/sitesRepository.ts","src/next-f/data/repositories/supportRepository.ts",
  "src/gaming-store/data/repositories/catalogRepository.ts","src/gaming-store/data/repositories/ordersRepository.ts","src/gaming-store/data/repositories/suppliersRepository.ts","src/gaming-store/data/repositories/supportRepository.ts",
  "src/software/data/repositories/catalogRepository.ts","src/software/data/repositories/commercialRepository.ts","src/software/data/repositories/licensingRepository.ts","src/software/data/repositories/releasesRepository.ts","src/software/data/repositories/deliveryRepository.ts","src/software/data/repositories/supportRepository.ts",
  "docs/NEXT-F-CMS-FINAL-ARCHITECTURE.md"
];
for(const file of required)check(`file ${file}`,exists(file));
const app=read("src/app/App.tsx"), nav=read("src/app/navigation.ts"), permissions=read("src/app/auth/permissions.ts"), authTypes=read("src/app/auth/types.ts"), platformStore=read("src/platform/services/platformStore.ts"), ops=read("src/platform/services/platformOperationsStore.ts"), digitalAdmin=read("src/next-f/operations/digitalAdminStore.ts"), settings=read("src/next-f/settings/settingsRepository.ts"), sales=read("src/next-f/data/repositories/salesRepository.ts"), projects=read("src/next-f/data/repositories/projectsRepository.ts"), cleanup=read("src/platform/cleanup/CleanupPage.tsx"), acceptance=read("src/services/acceptance/finalAcceptance.ts");
for(const route of ["/platform/organizations","/platform/domains","/platform/security","/platform/logs","/platform/backup","/platform/cleanup","/next-f/settings"]){check(`route ${route}`,app.includes(`\"${route}\"`)&&nav.includes(`path: \"${route}\"`));}
for(const permission of ["platform.organizations.manage","platform.domains.manage","platform.security.manage","platform.logs.read","platform.backup.manage","platform.cleanup.manage","digital.settings.manage"]){check(`permission ${permission}`,authTypes.includes(permission)&&permissions.includes(permission)&&platformStore.includes(permission));}
check("organizations + workspaces operations",ops.includes("addOrganization")&&ops.includes("addWorkspace")&&ops.includes("updateWorkspace"));
check("managed domains operations",ops.includes("addDomain")&&ops.includes("updateDomain"));
check("security operations",ops.includes("updateSecurityPolicy")&&ops.includes("revokeSession"));
check("system logging operations",ops.includes("addLog")&&ops.includes("getLogs"));
check("backup lifecycle",ops.includes("createBackup")&&ops.includes("restoreBackup")&&ops.includes("deleteBackup"));
check("retention lifecycle",ops.includes("saveRetention")&&ops.includes("previewCleanup")&&ops.includes("runCleanup"));
check("retention covers audit",ops.includes("removedAudit")&&ops.includes("saveAudit"));
check("retention covers notifications",ops.includes("removedNotifications")&&ops.includes("saveNotifications"));
check("cleanup UI exposes destructive retention scope",cleanup.includes("removedAudit")&&cleanup.includes("removedLogs")&&cleanup.includes("removedNotifications")&&cleanup.includes("removedBackups")&&cleanup.includes("ConfirmDialog"));
check("digital add-ons",digitalAdmin.includes("addAddon")&&digitalAdmin.includes("updateAddon"));
check("digital project templates",digitalAdmin.includes("addTemplate")&&digitalAdmin.includes("updateTemplate"));
check("digital billing adjustments",digitalAdmin.includes("addAdjustment")&&digitalAdmin.includes("getInvoiceAdjustedTotal"));
check("digital portal management",digitalAdmin.includes("createPortalAccess")&&digitalAdmin.includes("updatePortalAccess"));
check("digital workflow settings repository",settings.includes("proposalValidityDays")&&settings.includes("invoiceDueDays")&&settings.includes("defaultGraceDays")&&settings.includes("requireClientApproval")&&settings.includes("portalEnabledByDefault"));
check("proposal validity consumes settings",sales.includes("proposalValidityDays"));
check("invoice due consumes settings",sales.includes("invoiceDueDays"));
check("subscription grace consumes settings",sales.includes("defaultGraceDays"));
check("portal onboarding consumes settings",sales.includes("portalEnabledByDefault")&&sales.includes("portalRepository.createOrInvite"));
check("project approval behavior consumes settings",projects.includes("requireClientApproval"));
check("platform acceptance validates new governance records",acceptance.includes("Workspace organization references")&&acceptance.includes("Domain workspace references")&&acceptance.includes("Required security policies"));
check("acceptance validates digital admin records",acceptance.includes("Service add-on relationships")&&acceptance.includes("Project template relationships")&&acceptance.includes("Billing adjustment relationships")&&acceptance.includes("Client portal relationships")&&acceptance.includes("Digital workflow settings"));
for(const [label,file,max] of [["Digital compatibility facade","src/next-f/data/digitalStore.ts",60],["Gaming compatibility facade","src/gaming-store/data/gamingStore.ts",60],["Software compatibility facade","src/software/data/softwareStore.ts",60]]){const lines=read(file).split(/\r?\n/).length;check(`${label} <= ${max} lines`,lines<=max);}
check("Digital repository split",fs.readdirSync(path.join(root,"src/next-f/data/repositories")).filter(f=>f.endsWith(".ts")).length>=8);
check("Gaming repository split",fs.readdirSync(path.join(root,"src/gaming-store/data/repositories")).filter(f=>f.endsWith(".ts")).length>=5);
check("Software repository split",fs.readdirSync(path.join(root,"src/software/data/repositories")).filter(f=>f.endsWith(".ts")).length>=7);
const forbidden=["AdminApp.tsx","AdminGamingStorePage.tsx","wrangler.toml","wrangler.jsonc"];for(const name of forbidden){let found=false;const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(["node_modules","dist"].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name===name)found=true;}};walk(root);check(`forbidden ${name} absent`,!found);}
let placeholders=[];const scan=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(["node_modules","dist"].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(e.name===".gitkeep"||(e.name==="README.md"&&f.includes(`${path.sep}src${path.sep}`)))placeholders.push(f);}};scan(path.join(root,"src"));check("no placeholder source architecture",placeholders.length===0);
const packageJson=JSON.parse(read("package.json"));check("architecture completion npm script",packageJson.scripts?.["check:architecture-completion"]==="node scripts/architecture-completion-check.mjs");
console.log("NEXT F CMS V0.10.0 Architecture Completion check");for(const item of pass)console.log(`PASS  ${item}`);for(const item of fail)console.error(`FAIL  ${item}`);console.log(`\n${pass.length} passed, ${fail.length} failed`);if(fail.length)process.exit(1);

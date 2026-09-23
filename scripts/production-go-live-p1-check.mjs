import fs from "node:fs";
import path from "node:path";

const pass = [];
const fail = [];
const check = (label, ok) => (ok ? pass.push(label) : fail.push(label));
const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);

const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const version = read("src/app/version.ts");
const durable = read("src/services/production/durableStorage.ts");
const main = read("src/main.tsx");
const productionBootstrap = read("src/app/auth/ProductionBootstrap.tsx");
const client = read("src/services/production/httpClient.ts");
const contracts = read("src/services/backend/contracts.ts");
const worker = read("infrastructure/cloudflare/src/index.ts");
const staff = read("infrastructure/cloudflare/src/staff.ts");
const repository = read("infrastructure/cloudflare/src/repository.ts");
const idempotency = read("infrastructure/cloudflare/src/idempotency.ts");
const migration = read("infrastructure/cloudflare/migrations/0001_core.sql");
const dataManagement = read("src/platform/data-management/DataManagementPage.tsx");
const acceptance = read("src/services/acceptance/finalAcceptance.ts");

const [major, minor] = pkg.version.split(".").map(Number);
check("P1 baseline retained at V0.24+", (major > 0 || (major === 0 && minor >= 24)) && lock.version === pkg.version && lock.packages?.[""]?.version === pkg.version && read("VERSION").trim() === pkg.version && version.includes(`APP_VERSION = "${pkg.version}"`));
check("post-P1 release label is defined", /APP_RELEASE = "[^"]+"/.test(version));
check("P1 QA wired", pkg.scripts?.["check:go-live-p1"] === "node scripts/production-go-live-p1-check.mjs");
check("durable storage bridge exists", exists("src/services/production/durableStorage.ts") && durable.includes("initializeDurableStorage") && durable.includes("readDurableValue") && durable.includes("writeDurableValue"));
check("production bootstrap awaits durable state", main.includes("ProductionBootstrap") && productionBootstrap.includes("await initializeProductionStaffSession()") && productionBootstrap.includes("await initializeDurableStorage()") && productionBootstrap.includes('if (state === "error") return <LoginPanel') && productionBootstrap.includes("return children;"));
check("production fixtures do not seed collections", durable.includes("if (Array.isArray(seed)) return [] as T"));
check("production writes are idempotent", durable.includes("idempotencyKey: `staff-state-put:") && durable.includes("idempotencyKey: `staff-state-delete:"));
check("production writes use optimistic versions", durable.includes("expectedVersion: versions.get(key)"));
check("staff HTTP query route", client.includes('/v1/staff/${request.kind === "query" ? "queries" : "commands"}/'));
check("staff HTTP includes Access cookies", client.includes('credentials:"include"'));
check("staff HTTP sends request/correlation IDs", client.includes('"x-request-id"') && client.includes('"x-correlation-id"'));
check("backend contracts register state operations", ["staff.state.snapshot.get","staff.state.document.get","staff.state.document.put","staff.state.document.delete"].every((operation)=>contracts.includes(`\"${operation}\"`)));
check("worker routes staff queries and commands", worker.includes("handleStaffQuery") && worker.includes("handleStaffCommand") && worker.includes('^\\/v1\\/staff\\/(queries|commands)\\/'));
check("old blanket staff 501 removed", !worker.includes("production-domain-handler-not-yet-bound") && !worker.includes("status:501"));
check("Cloudflare Access identity resolves through D1", staff.includes("staff_identity_bindings") && staff.includes("resolveStaffPrincipal") && staff.includes('row.status!=="active"'));
check("Access subject is bound exactly", staff.includes('row.access_subject!==identity.subject'));
check("state reads are permission filtered", staff.includes("stateReadAllowed") && staff.includes("rows.filter((row)=>stateReadAllowed"));
check("state writes are permission enforced", staff.includes("stateWriteAllowed") && staff.includes("FORBIDDEN"));
check("read-only platform permission cannot mutate audit state", staff.includes("PLATFORM_MANAGE_PERMISSIONS") && staff.includes("hasAny(principal,PLATFORM_MANAGE_PERMISSIONS)"));
check("Digital durable keys have explicit permission coverage", staff.includes("nextf.v0.4.digital.clients") && staff.includes("nextf.v0.4.digital.services") && staff.includes("nextf.v0.19.digital.") && staff.includes("nextf.v0.10.digital.portal-access"));
check("D1 state query/put/delete handlers", ["staff.state.snapshot.get","staff.state.document.get","staff.state.document.put","staff.state.document.delete"].every((operation)=>staff.includes(operation)));
check("D1 repository supports optimistic put/delete", repository.includes("async put(") && repository.includes("async remove(") && repository.includes("Optimistic concurrency conflict"));
check("durable idempotency uses D1", idempotency.includes("idempotency_records") && idempotency.includes("INSERT OR IGNORE") && idempotency.includes("principalFingerprint") && idempotency.includes("requestHash"));
check("idempotency in-progress and exact replay are handled", staff.includes("IDEMPOTENCY_IN_PROGRESS") && staff.includes("JSON.parse(claim.record.response_reference)"));
check("durable mutations emit audit events", staff.includes("recordAudit") && staff.includes('targetType:"durable-state"'));
check("core D1 tables exist", ["app_documents","idempotency_records","audit_events","staff_identity_bindings"].every((table)=>migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)));
check("data management uses durable export/import", dataManagement.includes("exportDurableStorageRecords") && dataManagement.includes("importDurableStorageRecords") && dataManagement.includes("nextf-cms-durable-backup"));
check("acceptance probes durable boundary", acceptance.includes("getDurableStateStatus") && acceptance.includes("Durable data boundary"));

const allowedDirectLocalStorage = new Set([
  path.normalize("src/app/auth/SessionProvider.tsx"),
  path.normalize("src/app/theme/ThemeProvider.tsx"),
  path.normalize("src/services/production/durableStorage.ts"),
]);
const directLocalStorage = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && read(full).includes("window.localStorage")) directLocalStorage.push(path.normalize(full));
  }
};
walk("src");
check("direct browser storage limited to approved local infrastructure", directLocalStorage.every((file)=>allowedDirectLocalStorage.has(file)) && directLocalStorage.length === allowedDirectLocalStorage.size);

const businessFiles = [];
const collectBusiness = (dir) => {
  if (!exists(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectBusiness(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) businessFiles.push(full);
  }
};
for (const root of ["src/platform","src/next-f","src/gaming","src/software"]) collectBusiness(root);
check("business source has no direct window.localStorage", businessFiles.every((file)=>!read(file).includes("window.localStorage")));
check("P1 release doc exists", exists("docs/releases/V0.24.0-PRODUCTION-GO-LIVE-P1-DURABLE-BACKEND.md"));
check("P1 QA doc exists", exists("docs/qa/QA-V0.24.0.md"));

console.log("NEXT F CMS V0.24+ Production Go-Live P1 Durable Backend retained-baseline check");
for (const item of pass) console.log(`PASS  ${item}`);
for (const item of fail) console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);

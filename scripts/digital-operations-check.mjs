import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/next-f/sites/SitesPage.tsx",
  "src/next-f/support/SupportPage.tsx",
  "src/next-f/automation/AutomationPage.tsx",
  "src/next-f/reports/ReportsPage.tsx",
  "src/next-f/projects/ProjectsPage.tsx",
  "src/next-f/billing/BillingPage.tsx",
  "src/next-f/data/digitalStore.ts",
];
const routes = ["/next-f/sites", "/next-f/support", "/next-f/automation", "/next-f/reports"];
const storeMethods = [
  "getSubscriptions", "createRenewalInvoice", "advanceSubscription",
  "getTasks", "addTask", "updateTask",
  "getDeliverables", "addDeliverable", "updateDeliverable",
  "getApprovals", "requestApproval", "resolveApproval",
  "getSites", "addSite", "updateSite", "runSiteCheck",
  "getTickets", "addTicket", "updateTicket",
  "getWorkflows", "toggleWorkflow", "runWorkflow",
];
const failures = [];
const passes = [];
const check = (name, ok) => ok ? passes.push(name) : failures.push(name);

for (const file of required) check(`file ${file}`, fs.existsSync(path.join(root, file)));
const app = fs.readFileSync(path.join(root, "src/app/App.tsx"), "utf8");
for (const route of routes) check(`route ${route}`, app.includes(`"${route}"`));
const dataRoot = path.join(root, "src/next-f/data");
const store = fs.readdirSync(dataRoot,{recursive:true}).filter((name)=>String(name).endsWith(".ts")).map((name)=>fs.readFileSync(path.join(dataRoot,String(name)),"utf8")).join("\n");
for (const method of storeMethods) check(`operation ${method}`, store.includes(`${method}(`) || store.includes(`${method}:`));
check("recurring proposal handoff", store.includes("recurringFrequency(service)"));
check("recurring invoice linked to subscription", store.includes("subscriptionId: subscription?.id") || store.includes("subscriptionId:subscription?.id"));
check("payment advances renewal", store.includes("this.advanceSubscription(invoice.subscriptionId)"));
check("project acceptance seeds tasks", store.includes("write(KEYS.tasks"));
check("all operations use persisted store keys", ["subscriptions","tasks","deliverables","approvals","sites","tickets","workflows"].every((key) => store.includes(`KEYS.${key}`)));
check("no next-f placeholder READMEs", !["sites","support","automation","reports"].some((dir) => fs.existsSync(path.join(root, `src/next-f/${dir}/README.md`))));

const srcRoot = path.join(root, "src");
const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(srcRoot);
let importErrors = 0;
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const spec = match[1];
    const base = path.resolve(path.dirname(file), spec);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) importErrors++;
  }
}
check(`${sourceFiles.length} TS/TSX files discovered`, sourceFiles.length > 0);
check("relative imports resolve", importErrors === 0);

console.log("NEXT F CMS V0.4.0 Digital Operations check");
for (const pass of passes) console.log(`PASS  ${pass}`);
for (const fail of failures) console.error(`FAIL  ${fail}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);

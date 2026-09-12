import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/next-f/dashboard/DigitalDashboard.tsx",
  "src/next-f/sales/SalesPage.tsx",
  "src/next-f/clients/ClientsPage.tsx",
  "src/next-f/services/ServicesPage.tsx",
  "src/next-f/projects/ProjectsPage.tsx",
  "src/next-f/billing/BillingPage.tsx",
  "src/next-f/data/digitalStore.ts",
  "src/next-f/shared/useDigitalStore.ts",
  "src/next-f/shared/DigitalStatus.tsx",
  "src/next-f/shared/format.ts",
];
const expectedRoutes = ["/next-f/dashboard","/next-f/sales","/next-f/clients","/next-f/services","/next-f/projects","/next-f/billing"];
const requiredStoreMethods = ["addLead","qualifyLead","createProposal","acceptProposal","markInvoicePaid","toggleMilestone","completeProject"];
const failures = [];
const passes = [];
const check = (name, ok) => ok ? passes.push(name) : failures.push(name);

for (const file of required) check(`file ${file}`, fs.existsSync(path.join(root, file)));
const app = fs.readFileSync(path.join(root, "src/app/App.tsx"), "utf8");
for (const route of expectedRoutes) check(`route ${route}`, app.includes(`"${route}"`));
const dataRoot = path.join(root, "src/next-f/data");
const store = fs.readdirSync(dataRoot, { recursive: true }).filter((name) => String(name).endsWith(".ts")).map((name) => fs.readFileSync(path.join(dataRoot, String(name)), "utf8")).join("\n");
for (const method of requiredStoreMethods) check(`handoff ${method}`, store.includes(`${method}(`));
check("accepted proposal creates client", store.includes("write(KEYS.clients"));
check("accepted proposal creates invoice", store.includes("write(KEYS.invoices"));
check("accepted proposal creates project", store.includes("write(KEYS.projects"));
check("invoice payment can activate project", store.includes('status: "active"'));
check("Digital data is browser-persistent", store.includes("window.localStorage"));
check("No Digital .gitkeep placeholders", !fs.readdirSync(path.join(root, "src/next-f"), { recursive: true }).some((name) => String(name).endsWith(".gitkeep")));

console.log("NEXT F CMS V0.4.0 Digital Core regression check");
for (const pass of passes) console.log(`PASS  ${pass}`);
for (const fail of failures) console.error(`FAIL  ${fail}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);

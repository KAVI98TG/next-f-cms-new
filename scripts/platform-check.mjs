import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/platform/dashboard/PlatformDashboard.tsx",
  "src/platform/users/UsersPage.tsx",
  "src/platform/roles/AccessPage.tsx",
  "src/platform/audit/AuditPage.tsx",
  "src/platform/notifications/NotificationsPage.tsx",
  "src/platform/integrations/IntegrationsPage.tsx",
  "src/platform/infrastructure/InfrastructurePage.tsx",
  "src/platform/health/HealthPage.tsx",
  "src/platform/settings/SettingsPage.tsx",
  "src/platform/services/platformStore.ts",
  "src/platform/shared/usePlatformStore.ts",
  "src/shared/components/DataTable.tsx",
  "src/shared/components/Modal.tsx",
  "src/shared/components/FormField.tsx",
  "src/shared/components/PageToolbar.tsx",
];

const failures = [];
const passes = [];
for (const file of required) {
  if (fs.existsSync(path.join(root, file))) passes.push(file);
  else failures.push(file);
}

const app = fs.readFileSync(path.join(root, "src/app/App.tsx"), "utf8");
for (const route of [
  "/platform/users",
  "/platform/access",
  "/platform/audit",
  "/platform/notifications",
  "/platform/integrations",
  "/platform/infrastructure",
  "/platform/health",
  "/platform/settings",
]) {
  if (app.includes(`"${route}"`)) passes.push(`route ${route}`);
  else failures.push(`route ${route}`);
}

const placeholders = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === ".gitkeep") placeholders.push(full);
  }
}
walk(path.join(root, "src/platform"));
if (placeholders.length === 0) passes.push("no platform .gitkeep placeholders");
else failures.push(...placeholders);

console.log("NEXT F CMS V0.4.0 Platform Core regression check");
for (const pass of passes) console.log(`PASS  ${pass}`);
for (const fail of failures) console.error(`FAIL  ${fail}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);

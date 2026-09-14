import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pass = [];
const fail = [];
const check = (label, ok, detail = "") => (ok ? pass : fail).push({ label, detail });
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const walk = (dir, out = []) => {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (["node_modules", "dist", ".wrangler", "artifacts"].includes(entry.name)) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx|mjs|js|css|html)$/.test(entry.name)) out.push(rel);
  }
  return out;
};

const sourceFiles = [...walk("src"), ...walk("scripts")].filter((file) => !file.endsWith("production-purity-check.mjs"));
const textByFile = new Map(sourceFiles.map((file) => [file, read(file)]));
const forbidden = [
  "services/mock/dashboard",
  "Local development",
  "Data mode: Local",
  "Production deferred",
  "Production authentication not connected",
  "Reset local development data",
  "Reset prototype",
  "Open public prototype",
  "sess_local",
  "cms.nextf.local",
  "This prototype simulates payment",
  "Payment handling is local simulation",
  "simulatePayment",
];
for (const pattern of forbidden) {
  const hits = [...textByFile].filter(([, body]) => body.includes(pattern)).map(([file]) => file);
  check(`forbidden production-visible pattern: ${pattern}`, hits.length === 0, hits.join(", "));
}

const runtime = read("src/services/production/runtime.ts");
check("central runtime exposes production flag", runtime.includes("isProduction") && runtime.includes("VITE_NEXTF_ENVIRONMENT"));
check("central runtime exposes backend mode", runtime.includes("backendMode") && runtime.includes("VITE_NEXTF_BACKEND_MODE"));
check("central runtime exposes API URL", runtime.includes("apiBaseUrl") && runtime.includes("VITE_NEXTF_API_BASE_URL"));
check("Cloudflare Access logout path", runtime.includes('/cdn-cgi/access/logout'));

const topbar = read("src/app/layout/Topbar.tsx");
check("account menu exists", topbar.includes("account-menu__panel") && topbar.includes("Sign out"));
check("account menu shows assurance", topbar.includes("Cloudflare Access verified") && topbar.includes("Environment"));
check("no app password auth in account UX", !/password|username/i.test(topbar));

const sidebar = read("src/app/layout/Sidebar.tsx");
check("sidebar uses runtime label", sidebar.includes("runtime.label") && !sidebar.includes("Local development"));

const panels = read("src/shared/components/DashboardPanels.tsx");
check("dashboard panels do not import mock activity", !panels.includes("services/mock") && !panels.includes("recentActivity"));
check("dashboard honest empty state", panels.includes("No recent production activity"));

const platformDashboard = read("src/platform/dashboard/PlatformDashboard.tsx");
check("platform dashboard uses audit activity", platformDashboard.includes("platformStore.getAudit") && platformDashboard.includes("recentActivity"));
check("platform dashboard uses runtime data mode", platformDashboard.includes("D1-backed") && platformDashboard.includes("runtime.mode"));

const settings = read("src/platform/settings/SettingsPage.tsx");
check("production reset hidden", settings.includes("runtime.isLocal") && !settings.includes("Reset local development data"));

const gamingPublic = read("src/gaming-store/vnext/public/PublicGamingStorefront.tsx");
const gamingService = read("src/gaming-store/vnext/runtime/publicGamingService.ts");
const gamingCms = read("src/gaming-store/vnext/cms/CatalogVNextPage.tsx");
check("gaming public simulation gated", gamingPublic.includes("isGamingPublicSimulationEnabled") && gamingService.includes("simulationEnabled"));
check("gaming production checkout disabled without adapter", gamingService.includes("production checkout requires") && gamingPublic.includes("Integration not connected"));
check("gaming reset hidden outside local", gamingCms.includes("runtime.isLocal") && !gamingCms.includes("Reset prototype"));

const storageFiles = [...textByFile].filter(([file, body]) => body.includes("localStorage") && file.startsWith("src"));
const allowedStorage = storageFiles.every(([file]) => ["src/app/auth/", "src/app/theme/", "src/services/production/"].some((prefix) => file.replaceAll(path.sep, "/").startsWith(prefix)));
check("business state avoids direct localStorage", allowedStorage, storageFiles.map(([file]) => file).join(", "));

console.log("NEXT F CMS V1 production purity check");
for (const item of pass) console.log(`PASS  ${item.label}`);
for (const item of fail) console.error(`FAIL  ${item.label}${item.detail ? ` — ${item.detail}` : ""}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
import fs from "node:fs";
import path from "node:path";

const pass = [];
const fail = [];
const check = (label, ok) => (ok ? pass.push(label) : fail.push(label));
const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);

const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const vite = read("vite.config.ts");
const router = read("src/app/router/RouterProvider.tsx");
const brand = read("src/app/layout/Brand.tsx");
const topbar = read("src/app/layout/Topbar.tsx");
const settings = read("src/platform/settings/SettingsPage.tsx");
const theme = read("src/app/theme/ThemeProvider.tsx");
const tokens = read("src/css/tokens.css");
const index = read("index.html");
const main = read("src/main.tsx");
const redirects = read("public/_redirects");
const productionEnv = read(".env.production.example");
const gitignore = read(".gitignore");
const appVersion = read("src/app/version.ts");

const [major, minor] = pkg.version.split(".").map(Number);
check("P0 baseline retained at V0.23+", (major > 0 || (major === 0 && minor >= 23)) && lock.version === pkg.version && lock.packages?.[""]?.version === pkg.version && read("VERSION").trim() === pkg.version && appVersion.includes(`APP_VERSION = "${pkg.version}"`));
check("release metadata remains defined", appVersion.includes("APP_RELEASE = "));
check("P0 QA wired", pkg.scripts?.["check:go-live-p0"] === "node scripts/production-go-live-p0-check.mjs");
check("Vite deploys from root", vite.includes('base: "/"'));
check("router has no admin base", router.includes('const BASE = ""') && !router.includes('const BASE = "/admin"'));
check("router writes root paths", router.includes("const url = normalized"));
check("brand asset uses root path", brand.includes('src="/brand/next-f-mark.svg"'));
check("favicon uses root path", index.includes('href="/brand/favicon.svg"'));
check("app icon uses root path", index.includes('href="/brand/next-f-app-icon.png"'));
check("Cloudflare SPA fallback", redirects.trim() === "/* /index.html 200");
check("theme provider exists", exists("src/app/theme/ThemeProvider.tsx"));
check("theme provider mounted globally", main.includes("<ThemeProvider>"));
check("theme mode includes system", theme.includes('"system" | "light" | "dark"'));
check("theme preference persisted", theme.includes('nextf.cms.theme') && theme.includes("window.localStorage.setItem"));
check("system changes observed", theme.includes('matchMedia(MEDIA_QUERY)') && theme.includes('addEventListener("change", sync)'));
check("theme applied to root", theme.includes("document.documentElement.dataset.theme = theme"));
check("initial theme bootstrap", index.includes('localStorage.getItem("nextf.cms.theme")') && index.includes("document.documentElement.dataset.theme = theme"));
check("light token set", tokens.includes("/* Paper dashboard — light */") && tokens.includes("--bg: #f4f6f8"));
check("dark token set", tokens.includes(':root[data-theme="dark"]') && tokens.includes("--bg: #090a0b"));
check("global overlay tokens", tokens.includes("--overlay:") && tokens.includes("--mobile-overlay:"));
check("topbar theme control", topbar.includes("useTheme") && topbar.includes("toggleTheme"));
check("settings theme selector", settings.includes('<option value="system">System</option>') && settings.includes('<option value="light">Light</option>') && settings.includes('<option value="dark">Dark</option>'));
check("production env template is trackable", gitignore.includes("!.env.production.example"));
check("production frontend env template", productionEnv.includes("VITE_NEXTF_ENVIRONMENT=production") && productionEnv.includes("VITE_NEXTF_BACKEND_MODE=production-api") && /VITE_NEXTF_API_BASE_URL=https:\/\/[A-Za-z0-9.-]+/.test(productionEnv));
check("P0 release doc exists", exists("docs/releases/V0.23.0-PRODUCTION-GO-LIVE-P0.md"));

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else sourceFiles.push(full);
  }
};
for (const root of ["src", "public"]) walk(root);
sourceFiles.push("index.html", "vite.config.ts");
const oldAdminRefs = sourceFiles.filter((file) => /\/admin\//.test(read(file)));
check("no runtime /admin/ asset or route refs", oldAdminRefs.length === 0);

console.log("NEXT F CMS Production Go-Live P0 foundation check");
for (const item of pass) console.log(`PASS  ${item}`);
for (const item of fail) console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);

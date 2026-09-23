import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (p) => fs.existsSync(path.join(root, p));
let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const approved = ["current", "governance", "architecture", "planning", "releases", "qa", "audits", "archive"];
for (const dir of approved) check(`docs/${dir} exists`, exists(`docs/${dir}`));
check("documentation index exists", exists("docs/README.md"));
check(
  "root keeps only repository README as Markdown/text documentation",
  fs.readdirSync(root).filter((name) => /\.(?:md|txt)$/i.test(name)).every((name) => name === "README.md")
);
check("continuity rulebook has one canonical location", exists("docs/governance/NEXT-F-CONTINUITY-RULES.md") && !exists("NEXT-F-CONTINUITY-RULES.md"));
check("project rules live under governance", exists("docs/governance/PROJECT-RULES.md") && !exists("RULESE.txt"));
check("current status docs exist", exists("docs/current/PROJECT-STATUS.md") && exists("docs/current/RELEASE-NOTES.md") && exists("docs/current/DEPLOYMENT.md"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const currentReleasePrefix = `V${pkg.version}-`;
check("current version has a release record", fs.readdirSync(path.join(root, "docs/releases")).some((name) => name.startsWith(currentReleasePrefix)));

const looseDocs = fs.readdirSync(path.join(root, "docs"), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name !== "README.md");
check("docs root has no loose documentation files", looseDocs.length === 0, looseDocs.map((x) => x.name).join(", "));

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:md|mjs|js|ts|tsx|json|jsonc)$/i.test(entry.name)) files.push(full);
  }
};
walk(root);

const staleFlatPatterns = [
  /docs\/QA-[A-Za-z0-9_.-]+\.md/g,
  /docs\/V(?:0|1)\.[A-Za-z0-9_.-]+\.md/g,
  /docs\/GAMING-[A-Za-z0-9_.-]+\.md/g,
  /docs\/(?:CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD|CMS-CONTRACT-INTEGRATION-GUIDE|NEXT-F-CONTINUITY-RULES|NEXT-F-CMS-FINAL-ARCHITECTURE|NEXT-F-CMS-SCOPE-AND-ARCHITECTURE-DIRECTION|NEXT-F-CMS-UPGRADE-MASTER-PLAN)\.md/g,
];
let stale = "";
outer: for (const file of files) {
  if (file.endsWith("docs-organization-check.mjs")) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of staleFlatPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      stale = path.relative(root, file);
      break outer;
    }
  }
}
check("no stale flat docs paths remain", !stale, stale);

console.log(`\nNEXT F CMS documentation organization: ${failed ? "FAILED" : "PASS"}`);
if (failed) process.exit(1);

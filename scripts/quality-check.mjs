import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "src");
const failures = [];
const passes = [];

function check(name, condition, detail = "") {
  if (condition) passes.push(name);
  else failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(root).filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}dist${path.sep}`));
const sourceFiles = walk(src);

for (const domain of ["platform", "next-f", "gaming-store", "software", "shared", "services", "app", "css"]) {
  check(`Domain exists: ${domain}`, fs.existsSync(path.join(src, domain)));
}

check("No .gitkeep placeholders", !files.some((file) => path.basename(file) === ".gitkeep"));
check("No legacy AdminGamingStorePage monolith", !files.some((file) => file.endsWith("AdminGamingStorePage.tsx")));
check("No legacy AdminApp monolith", !files.some((file) => file.endsWith("AdminApp.tsx")));
check("No Admin Wrangler config", !fs.existsSync(path.join(root, "wrangler.jsonc")));
check("No Admin worker runtime", !fs.existsSync(path.join(root, "worker")));
check("Global CSS entry exists", fs.existsSync(path.join(src, "css", "index.css")));
check("Infrastructure-independent repository exists", fs.existsSync(path.join(src, "services", "data", "localRepository.ts")));
check("Command palette exists", fs.existsSync(path.join(src, "app", "layout", "CommandPalette.tsx")));
check("Global page guide removed", !fs.existsSync(path.join(src, "app", "layout", "PageGuide.tsx")) && !sourceFiles.some((file) => /\.(ts|tsx)$/.test(file) && fs.readFileSync(file, "utf8").includes("PageGuide")));
check("No old admin namespace", !sourceFiles.some((file) => file.includes(`${path.sep}src${path.sep}admin${path.sep}`)));

console.log(`NEXT F CMS V0.5.0 architecture regression check`);
for (const pass of passes) console.log(`PASS  ${pass}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);

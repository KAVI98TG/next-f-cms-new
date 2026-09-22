import { spawnSync } from "node:child_process";
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const checks = Object.entries(pkg.scripts ?? {})
  .filter(([name, command]) => name.startsWith("check:") && name !== "check:all-static" && /^node scripts\/[^ ]+\.mjs$/.test(command))
  .sort(([left], [right]) => left.localeCompare(right));

const failed = [];
for (const [name, command] of checks) {
  const result = spawnSync(command, { shell: true, stdio: "inherit" });
  if (result.status !== 0) failed.push(name);
}

console.log(`\nNEXT F static regression suite: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) {
  console.error(`Failed checks: ${failed.join(", ")}`);
  process.exit(1);
}

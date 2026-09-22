import { spawnSync } from "node:child_process";
import fs from "node:fs";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const run = (label, command, args) => {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const pkg = readJson("package.json");
const state = readJson("RELEASE-STATE.json");
if (pkg.version !== "1.0.59" || state.version !== pkg.version || state.baseline !== "1.0.57") {
  throw new Error("Release finalization is pinned to NEXT F CMS v1.0.59 with canonical parent v1.0.57.");
}
if (state.canonical === true && state.releaseStatus === "canonical") {
  console.log("Release is already marked canonical. Re-running verification only.");
} else if (state.canonical !== false || state.releaseStatus !== "candidate") {
  throw new Error("Release manifest is not in the expected candidate state.");
}

run("Full static regression suite", "npm", ["run", "check:all-static"]);
run("Targeted release gate", "npm", ["run", "release:gate"]);
run("Frontend production build", "npm", ["run", "build"]);
run("Worker/API typecheck", "npx", ["--no-install", "tsc", "-p", "infrastructure/cloudflare/tsconfig.json", "--noEmit"]);

state.canonical = true;
state.releaseStatus = "canonical";
state.validation = {
  sourceRegressionChecks: "passed",
  releaseGate: "passed",
  frontendBuild: "passed",
  workerTypecheck: "passed"
};
fs.writeFileSync("RELEASE-STATE.json", `${JSON.stringify(state, null, 2)}\n`);
run("Canonical manifest continuity", "npm", ["run", "check:continuity"]);
console.log("\nNEXT F CMS v1.0.59 is locally validated and marked canonical. Deployment is still a separate operator action.");

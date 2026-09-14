import fs from "node:fs";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const cleanup = args.has("--cleanup");
const scan = args.has("--scan") || !cleanup;
const allowCleanup = process.env.NEXTF_ALLOW_PROD_FIXTURE_CLEANUP === "YES";
const patterns = ["acceptance", "prototype", "seed", "local development", "cms.nextf.local", "sess_local", "cws_acceptance_", "org_acceptance_", "client_acceptance_", "restore-drill"];
const knownIds = [/^cws_acceptance_/i, /^org_acceptance_/i, /^client_acceptance_/i, /^sess_local$/i, /^.*restore-drill.*$/i];
const config = "infrastructure/cloudflare/wrangler.production.jsonc";
const db = "nextf-cms-production";

function runWrangler(sql) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(command, ["wrangler@latest", "d1", "execute", db, "--remote", "--config", config, "--json", "--command", sql], { encoding: "utf8" });
}
function classify(row) {
  const id = String(row.id ?? row.key ?? "");
  const payload = String(row.payload_json ?? row.value ?? row.detail ?? "").toLowerCase();
  const haystack = `${id} ${payload}`.toLowerCase();
  const reason = patterns.find((pattern) => haystack.includes(pattern));
  const exactFixture = knownIds.some((pattern) => pattern.test(id));
  return reason ? { ...row, reason, safe: exactFixture ? "safe-fixture" : "review-only" } : undefined;
}
function printRows(rows) {
  if (!rows.length) { console.log("No recognized production fixture/test residue found by scanner."); return; }
  console.log("table\tnamespace/key/id\treason\tclassification\trecommended action");
  for (const row of rows) console.log(`${row.table}\t${row.namespace ?? row.key ?? row.id}\t${row.reason}\t${row.safe}\t${row.safe === "safe-fixture" ? "eligible for guarded cleanup" : "review manually; skip cleanup"}`);
}

if (!fs.existsSync(config)) {
  console.log(`Production data hygiene scan skipped: ${config} is missing.`);
  process.exit(0);
}
if (cleanup && !allowCleanup) {
  console.error("Cleanup refused. Set NEXTF_ALLOW_PROD_FIXTURE_CLEANUP=YES to delete exact recognized fixture records.");
  process.exit(1);
}

const query = "SELECT 'app_documents' AS table_name, namespace, id, payload_json FROM app_documents WHERE namespace='cms.staff-state' OR id LIKE 'nextf.%' UNION ALL SELECT 'audit_events' AS table_name, 'audit' AS namespace, id, detail AS payload_json FROM audit_events UNION ALL SELECT 'idempotency_records' AS table_name, 'idempotency' AS namespace, key AS id, command_name AS payload_json FROM idempotency_records LIMIT 5000;";
const result = runWrangler(query);
if (result.error || result.status !== 0) {
  console.log("Production data hygiene scan could not query D1 in this environment.");
  if (result.stderr) console.log(result.stderr.trim());
  process.exit(0);
}
let parsed = [];
try { parsed = JSON.parse(result.stdout); } catch { parsed = []; }
const rawRows = Array.isArray(parsed) ? parsed.flatMap((entry) => entry.results ?? entry.result ?? []) : [];
const matches = rawRows.map((row) => classify({ table: row.table_name, namespace: row.namespace, id: row.id, payload_json: row.payload_json })).filter(Boolean);
if (scan) printRows(matches);
if (cleanup) {
  const eligible = matches.filter((row) => row.safe === "safe-fixture" && row.table === "app_documents");
  for (const row of eligible) console.log(`Would delete exact fixture: ${row.table} ${row.id}`);
  for (const row of eligible) runWrangler(`DELETE FROM app_documents WHERE namespace='cms.staff-state' AND id='${String(row.id).replaceAll("'", "''")}';`);
  console.log(`Cleanup complete. Deleted ${eligible.length} exact recognized fixture document(s). Review-only matches were skipped.`);
}
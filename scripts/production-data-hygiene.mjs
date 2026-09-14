import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args=new Set(process.argv.slice(2));
const cleanup=args.has("--cleanup");
const scanOnly=args.has("--scan")||!cleanup;
const API=(process.env.NEXTF_PRODUCTION_API_URL||"https://cms-api.nextf.lk").replace(/\/$/,"");
const allowCleanup=process.env.NEXTF_ALLOW_PROD_FIXTURE_CLEANUP==="YES";

function run(command,commandArgs){const result=spawnSync(command,commandArgs,{encoding:"utf8",stdio:["ignore","pipe","pipe"]});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${command} ${commandArgs.join(" ")} exited ${result.status}\n${result.stderr||""}`);return (result.stdout||"").trim();}
function getToken(){if(process.env.NEXTF_ACCESS_TOKEN?.trim())return process.env.NEXTF_ACCESS_TOKEN.trim();const out=run("cloudflared",["access","token",`-app=${API}`]);const token=(out.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]).at(-1)||out.trim();if(token.split(".").length!==3)throw new Error("Could not obtain production Access token. Run cloudflared access login https://cms-api.nextf.lk and retry.");return token;}
const token=getToken();
async function staff(operation,kind,input={}){const headers={"content-type":"application/json","cf-access-token":token,"x-request-id":crypto.randomUUID(),"x-correlation-id":crypto.randomUUID()};if(kind==="command")headers["idempotency-key"]=`prod-hygiene:${operation}:${crypto.randomUUID()}`;const response=await fetch(`${API}/v1/staff/${kind==="query"?"queries":"commands"}/${encodeURIComponent(operation)}`,{method:"POST",headers,body:JSON.stringify({input})});const body=await response.json().catch(()=>null);if(!response.ok||!body?.ok)throw new Error(`${operation} failed HTTP ${response.status}: ${body?.problem?.code||"UNKNOWN"} ${body?.problem?.detail||""}`);return body.data;}

const exactFixtureIds=new Set(["note_1","note_2","note_3","audit_1","audit_2","audit_3","audit_4","int_local","dom_admin","sess_local","se_1","org_customer_lanka"]);
const exactFixtureTitles=new Set(["Production authentication deferred","Production database not connected","Platform Core initialized","Production identity provider deferred"]);
const markerRules=[
  ["acceptance fixture",/(^|[_-])acceptance([_-]|$)/i],
  ["restore drill",/restore[-_ ]drill/i],
  ["local hostname",/cms\.nextf\.local/i],
  ["local session",/sess_local|local development browser|local session/i],
  ["acceptance tenant",/(cws|org|client)_acceptance_/i],
];
function text(value){try{return JSON.stringify(value)}catch{return String(value)}}
function safeFixtureRow(row){if(!row||typeof row!=="object")return false;const id=String(row.id||"");const title=String(row.title||"");const email=String(row.email||"");const hostname=String(row.hostname||"");if(exactFixtureIds.has(id)||exactFixtureTitles.has(title))return true;if(/^(cws|org|client)_acceptance_/i.test(id)||/restore[-_ ]drill/i.test(id))return true;if(/@(nextf\.local|nextf\.dev)$/i.test(email))return true;if(/^cms\.nextf\.local$/i.test(hostname))return true;return false;}
function reasonsFor(value){const raw=text(value);const reasons=[];for(const [label,re] of markerRules)if(re.test(raw))reasons.push(label);if(/@(nextf\.local|nextf\.dev)\b/i.test(raw))reasons.push("local fixture email");if(/production authentication deferred|production database not connected/i.test(raw))reasons.push("historical production-deferred seed");return [...new Set(reasons)];}

const snapshot=await staff("staff.state.snapshot.get","query",{prefix:"nextf."});
const documents=Array.isArray(snapshot?.documents)?snapshot.documents:[];
const findings=[];
for(const document of documents){
  const value=document.value;
  const reasons=reasonsFor(value);
  if(!reasons.length)continue;
  let safeRows=[]; let unsafe=false;
  if(Array.isArray(value)){
    safeRows=value.filter(safeFixtureRow);
    unsafe=value.some((row)=>reasonsFor(row).length>0&&!safeFixtureRow(row));
  }else unsafe=true;
  findings.push({key:document.key,version:document.version,reasons:reasons.join(", "),safeRows:safeRows.length,classification:unsafe?"REVIEW":"SAFE_FIXTURE_ROWS",value});
}

console.log("NEXT F CMS production data hygiene scan");
if(!findings.length) console.log("PASS  No recognized fixture/test residue found in production app documents.");
else console.table(findings.map(({key,version,reasons,safeRows,classification})=>({key,version,reasons,safeRows,classification})));
console.log("\nProtected by policy: staff_identity_bindings and unknown records are never modified by this tool.");

if(cleanup){
  if(!allowCleanup)throw new Error("Cleanup blocked. Review the scan, then set NEXTF_ALLOW_PROD_FIXTURE_CLEANUP=YES for one explicit run.");
  for(const finding of findings){
    if(finding.classification!=="SAFE_FIXTURE_ROWS"||!Array.isArray(finding.value)||finding.safeRows===0){console.log(`SKIP  ${finding.key} — requires manual review`);continue;}
    const next=finding.value.filter((row)=>!safeFixtureRow(row));
    console.log(`PLAN  ${finding.key} — remove ${finding.value.length-next.length} recognized fixture row(s), preserve ${next.length} row(s)`);
    if(next.length===0){await staff("staff.state.document.delete","command",{key:finding.key,expectedVersion:finding.version});console.log(`DONE  ${finding.key} deleted because it contained only recognized fixture rows`);}
    else {await staff("staff.state.document.put","command",{key:finding.key,value:next,expectedVersion:finding.version});console.log(`DONE  ${finding.key} fixture rows removed`);}
  }
  console.log("Cleanup complete. Rerun npm run production:data-hygiene:scan and review any remaining REVIEW findings.");
}else if(scanOnly&&findings.length){
  console.log("\nNo changes were made. SAFE_FIXTURE_ROWS may be removed only by the explicit guarded cleanup command; REVIEW findings are never auto-deleted.");
}

import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const pass=[]; const fail=[];
const check=(label,ok,detail="")=>ok?pass.push(label):fail.push(`${label}${detail?`: ${detail}`:""}`);
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const pkg=JSON.parse(read("package.json"));
const lock=JSON.parse(read("package-lock.json"));
const version=read("VERSION").trim();
const appVersion=read("src/app/version.ts");
const prod=read("infrastructure/cloudflare/wrangler.production.jsonc");
const worker=read("infrastructure/cloudflare/src/index.ts");
const maintenance=read("infrastructure/cloudflare/src/maintenance.ts");
const bootstrap=read("src/app/auth/ProductionBootstrap.tsx");
const gitignore=read(".gitignore");
const productionEnv=exists(".env.production")?read(".env.production"):"";

check("package version is semantic",/^\d+\.\d+\.\d+$/.test(pkg.version));
check("lockfile version matches package",lock.version===pkg.version&&lock.packages?.[""]?.version===pkg.version);
check("VERSION matches package",version===pkg.version);
check("runtime version matches package",appVersion.includes(`APP_VERSION = "${pkg.version}"`));
for(const script of ["acceptance:production","acceptance:production:final","acceptance:source","check:release-hygiene"]) check(`script ${script}`,Boolean(pkg.scripts?.[script]));
for(const file of ["infrastructure/cloudflare/wrangler.production.jsonc","infrastructure/cloudflare/src/maintenance.ts","src/app/auth/ProductionBootstrap.tsx","scripts/production-acceptance.mjs","docs/releases/V1.0.0-PRODUCTION-RELEASE.md","docs/architecture/GAMING-INTEGRATION-HANDOFF.md"]) check(`file ${file}`,exists(file));

check("production Worker name",prod.includes('"name": "nextf-cms-api"'));
check("production API custom domain",prod.includes('"pattern": "cms-api.nextf.lk"')&&prod.includes('"custom_domain": true'));
check("production CMS origin",prod.includes('"CMS_ORIGIN": "https://cms.nextf.lk"'));
check("production API config has no staging hostname",!prod.includes("cms-staging.nextf.lk")&&!prod.includes("cms-api-staging.nextf.lk")&&!prod.includes("nextf-cms-staging"));
check("production D1 is exact production binding",prod.includes('"database_name": "nextf-cms-production"')&&prod.includes('3156cd12-fece-42d1-b26a-fa8640a6aa53'));
check("production R2 binding",prod.includes('"bucket_name": "nextf-cms-production-files"'));
check("production Queue binding",prod.includes('"queue": "nextf-cms-production-events"')&&prod.includes('"dead_letter_queue": "nextf-cms-production-events-dlq"'));
check("production retention policy configured",prod.includes('"AUDIT_RETENTION_DAYS": "365"')&&prod.includes('"OUTBOX_RETENTION_DAYS": "90"'));
const prodJson=JSON.parse(prod);
const declaredRequiredSecrets=new Set(prodJson.secrets?.required||[]);
check("production config declares secret names without putting them in vars",declaredRequiredSecrets.has("TURNSTILE_SECRET_KEY")&&declaredRequiredSecrets.has("SERVICE_CREDENTIAL_SECRET")&&!Object.prototype.hasOwnProperty.call(prodJson.vars||{},"TURNSTILE_SECRET_KEY")&&!Object.prototype.hasOwnProperty.call(prodJson.vars||{},"SERVICE_CREDENTIAL_SECRET"));
check("secret env files are ignored",gitignore.includes(".env")||gitignore.includes(".env.*"));
check("production frontend env is committed and canonical",productionEnv.includes("VITE_NEXTF_ENVIRONMENT=production")&&productionEnv.includes("VITE_NEXTF_BACKEND_MODE=production-api")&&productionEnv.includes("VITE_NEXTF_API_BASE_URL=https://cms-api.nextf.lk")&&gitignore.includes("!.env.production"));

check("production login UI is fail closed",bootstrap.includes("await initializeProductionStaffSession()")&&bootstrap.includes("await initializeDurableStorage()")&&bootstrap.includes('if (state === "error") return <LoginPanel')&&bootstrap.includes("return children;"));
check("API login completion route exists",worker.includes('url.pathname==="/auth/complete"')&&worker.includes("resolveStaffPrincipal"));
check("public exact replay is resolved before Turnstile",worker.indexOf("idempotency.get(idempotencyKey)")>=0&&worker.indexOf("idempotency.get(idempotencyKey)")<worker.indexOf("if(!(await verifyTurnstile"));
check("public idempotency conflict is fail closed",worker.includes("IDEMPOTENCY_CONFLICT")&&worker.includes("IDEMPOTENCY_IN_PROGRESS"));
check("scheduled maintenance is real runtime code",worker.includes('runMaintenance(env,"scheduled")'));
check("maintenance covers demo expiry",maintenance.includes("runDemoExpirySweep")&&maintenance.includes("expiredEnvironments"));
check("maintenance covers audit retention",maintenance.includes("auditRetentionDays")&&maintenance.includes("DELETE FROM audit_events"));
check("maintenance covers idempotency cleanup",maintenance.includes("DELETE FROM idempotency_records"));

if(exists("dist")){
  const files=[];
  const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p)}};
  walk(path.join(root,"dist"));
  const text=files.filter((p)=>/\.(?:html|js|css|json|txt|map)$/.test(p)).map((p)=>fs.readFileSync(p,"utf8")).join("\n");
  check("built frontend has no staging CMS host",!text.includes("cms-staging.nextf.lk")&&!text.includes("cms-api-staging.nextf.lk"));
  check("built frontend targets production API when production env was used",!text.includes("https://cms-api-staging.nextf.lk"));
}

const forbiddenSecretPatterns=[
  /sk_live_[A-Za-z0-9_-]{12,}/g,
  /sk-proj-[A-Za-z0-9_-]{12,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /(?:TURNSTILE_SECRET_KEY|SERVICE_CREDENTIAL_SECRET)\s*[=:]\s*["'][^"']{12,}["']/g,
];
const scanRoots=["src","infrastructure","scripts"];
const scan=[];
const walkSource=(dir)=>{for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const rel=path.join(dir,e.name);if(e.isDirectory())walkSource(rel);else if(/\.(?:ts|tsx|js|mjs|json|jsonc|md)$/.test(e.name))scan.push(rel)}};
for(const dir of scanRoots) walkSource(dir);
let secretHit="";
outer: for(const file of scan){const text=read(file);for(const re of forbiddenSecretPatterns){re.lastIndex=0;if(re.test(text)){secretHit=file;break outer}}}
check("no embedded production secret material",!secretHit,secretHit);

console.log(`NEXT F CMS V${pkg.version} release hygiene check`);
for(const x of pass) console.log(`PASS  ${x}`);
for(const x of fail) console.error(`FAIL  ${x}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if(fail.length) process.exit(1);

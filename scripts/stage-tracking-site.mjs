// Stage a canonical core.site and exact Site Manifest validation evidence.
// This operator-only command does not provision or enable tracking.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const args=process.argv.slice(2);
function option(name){const index=args.indexOf(name);return index>=0?args[index+1]:undefined;}
const manifestPath=option("--manifest");const organizationId=option("--organization");const target=args.includes("--remote")?"--remote":args.includes("--local")?"--local":undefined;
const contractsRoot=resolve(option("--contracts-root")||"../NEXT-F-CONTRACTS/next-f-contracts");
const wranglerBin=resolve(option("--wrangler-bin")||"node_modules/wrangler/bin/wrangler.js");
if(!manifestPath||!organizationId||!target||!existsSync(wranglerBin))throw new Error("Usage: node scripts/stage-tracking-site.mjs --manifest PATH --organization ID (--local|--remote) [--contracts-root PATH] [--wrangler-bin PATH]");
if(!/^[a-zA-Z0-9_-]{4,128}$/.test(organizationId))throw new Error("Organization ID is invalid");
const manifestText=readFileSync(resolve(manifestPath),"utf8");
const { GENERATED_VALIDATION }=await import(pathToFileURL(resolve(contractsRoot,"js/generated-validation.js")).href);
const { parseAndValidateManifest }=await import(pathToFileURL(resolve(contractsRoot,"js/manifest-validation-core.js")).href);
const validation=parseAndValidateManifest(manifestText,GENERATED_VALIDATION);
if(!validation.valid||validation.summary.warnings||validation.summary.errors)throw new Error(`Site Manifest validation failed: ${JSON.stringify(validation.diagnostics)}`);
const manifest=validation.input;
if(manifest.contracts?.contractVersion!=="1.5.0"||manifest.tracking?.contractVersion!=="1.5.0"||manifest.tracking?.enabled!==true)throw new Error("Site must pin V1.5.0 and enable V1.5.0 tracking");
const siteId=manifest.site?.siteId;const siteName=manifest.site?.name;const primaryUrl=manifest.site?.primaryUrl;
if(typeof siteId!=="string"||typeof siteName!=="string"||typeof primaryUrl!=="string")throw new Error("Validated manifest is missing canonical Site identity");
const hash=createHash("sha256").update(manifestText).digest("hex");const validationId=`manifest_${hash.slice(0,32)}`;const now=new Date().toISOString();
const sql=(value)=>`'${String(value).replaceAll("'","''")}'`;
const statements=[
  `INSERT OR IGNORE INTO core_sites(site_id,organization_id,name,primary_url,status,created_at,updated_at) VALUES(${sql(siteId)},${sql(organizationId)},${sql(siteName)},${sql(primaryUrl)},'active',${sql(now)},${sql(now)})`,
  `UPDATE core_sites SET name=${sql(siteName)},primary_url=${sql(primaryUrl)},updated_at=${sql(now)} WHERE site_id=${sql(siteId)} AND organization_id=${sql(organizationId)}`,
  `INSERT OR IGNORE INTO site_manifest_validations(validation_id,site_id,contract_version,manifest_sha256,manifest_json,validator_version,validated_at) SELECT ${sql(validationId)},site_id,'1.5.0',${sql(hash)},${sql(JSON.stringify(manifest))},${sql(GENERATED_VALIDATION.registryVersion)},${sql(now)} FROM core_sites WHERE site_id=${sql(siteId)} AND organization_id=${sql(organizationId)}`,
  `SELECT validation_id,site_id,contract_version,validator_version FROM site_manifest_validations WHERE validation_id=${sql(validationId)} AND site_id=${sql(siteId)}`,
];
const command=statements.join("; ")+";";
const result=spawnSync(process.execPath,[wranglerBin,"d1","execute","nextf-cms-production",target,"--config","infrastructure/cloudflare/wrangler.production.jsonc","--command",command],{cwd:resolve(import.meta.dirname,".."),encoding:"utf8",stdio:["ignore","pipe","pipe"]});
if(result.status!==0)throw new Error(`D1 staging failed: ${result.stderr||result.stdout}`);
if(!result.stdout.includes(validationId))throw new Error("D1 did not return the staged validation evidence; Site ownership may not match");
console.log(JSON.stringify({siteId,organizationId,contractVersion:"1.5.0",validationId,manifestSha256:hash,target:target.slice(2),staged:true}));

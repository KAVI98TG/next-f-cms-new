import fs from "node:fs";

const pass=[]; const fail=[];
const check=(label,condition)=>condition?pass.push(label):fail.push(label);
const exists=(path)=>fs.existsSync(path);
const read=(path)=>fs.readFileSync(path,"utf8");

[
  "src/next-f/website-platform/contractRegistryStore.ts",
  "src/next-f/website-platform/websitePlatformStore.ts",
  "src/next-f/website-platform/WebsitePlatformPage.tsx",
  "docs/V0.15.0-CONTRACT-REGISTRY-RESOLVER-FOUNDATION.md",
].forEach((path)=>check(`file ${path}`,exists(path)));

const registry=read("src/next-f/website-platform/contractRegistryStore.ts");
const website=read("src/next-f/website-platform/websitePlatformStore.ts");
const page=read("src/next-f/website-platform/WebsitePlatformPage.tsx");
const guide=read("docs/CMS-CONTRACT-INTEGRATION-GUIDE.md");
const pkg=JSON.parse(read("package.json"));
const version=read("VERSION").trim();
const appVersion=read("src/app/version.ts");

check("contract hub reference",registry.includes('CONTRACT_REGISTRY_HUB = "https://contracts.nextf.lk/"'));
check("exact 1.0.0 pin reused",registry.includes("WEBSITE_CONTRACT_VERSION") && website.includes('WEBSITE_CONTRACT_VERSION = "1.0.0"'));
check("site manifest filename reused",registry.includes("SITE_MANIFEST_FILENAME") && website.includes('SITE_MANIFEST_FILENAME = "nextf.site.json"'));
check("registry snapshot model",registry.includes("RegistrySnapshotRecord") && registry.includes('"staged" | "trusted" | "rejected"'));
check("only official trust authorities",registry.includes('"registry_cli" | "immutable_registry_api"'));
check("trusted registry requires immutable reference",registry.includes("Trusted Registry evidence requires an immutable reference and content hash"));
check("trusted registry requires verifier identity",registry.includes("Trusted Registry evidence requires verifier identity"));
check("conflicting trusted registry hash rejected",registry.includes("Immutable Contract Registry drift detected"));
check("wrong registry version rejected",registry.includes("Only exact Contract Version"));
check("manifest raw evidence stored",registry.includes("ManifestEvidenceRecord") && registry.includes("rawJson"));
check("manifest receipts are immutable history",registry.includes('id: uid("manifest_evidence")') && registry.includes('write(KEYS.manifests, [row, ...this.getManifestEvidence()])'));
check("suspended sites may submit replacement manifest for revalidation",registry.includes('connection.status === "revoked"') && !registry.includes('["revoked", "suspended"].includes(connection.status)'));
check("manifest receipt checks JSON syntax",registry.includes("JSON.parse(rawJson)") && registry.includes("must contain valid JSON"));
check("manifest receipt does not claim canonical validation",registry.includes("Canonical schema/version/modules/capabilities remain untrusted"));
check("validation requires trusted snapshot",registry.includes("A trusted immutable Contract Registry") && registry.includes('snapshot.status !== "trusted"'));
check("validation evidence model",registry.includes("ContractValidationEvidenceRecord") && registry.includes("CanonicalResolutionSummary"));
check("validation result bound to active validating state",registry.includes('connection.status !== "validating" || manifest.status !== "validating"'));
check("validation result bound to start snapshot",registry.includes("manifest.registrySnapshotId !== snapshot.id"));
check("schema failures produce explicit evidence issue",registry.includes("Canonical Site Manifest schema validation failed."));
check("canonical modules captured from resolver",registry.includes("moduleIds: string[]"));
check("canonical capabilities captured from resolver",registry.includes("capabilityIds: string[]"));
check("canonical API operations captured from resolver",registry.includes("apiOperationIds: string[]"));
check("canonical permissions captured from resolver",registry.includes("permissionIds: string[]"));
check("events webhooks integrations captured",registry.includes("eventIds: string[]") && registry.includes("webhookIds: string[]") && registry.includes("integrationIds: string[]"));
check("Admin and Customer CMS metadata captured",registry.includes("adminProfileIds: string[]") && registry.includes("customerCmsProfileIds: string[]"));
check("unknown modules fail validation",registry.includes("unknownModuleIds") && registry.includes("unknownModules.length === 0"));
check("unknown capabilities fail validation",registry.includes("unknownCapabilityIds") && registry.includes("unknownCapabilities.length === 0"));
check("manifest exact version required",registry.includes("manifestContractVersion === connection.contractVersion"));
check("compatibility must be compatible",registry.includes('input.compatibilityStatus === "compatible"'));
check("ready only after valid canonical resolution",registry.includes('transitionSiteConnection(connection.id, "ready"') && registry.includes('manifestStatus: "valid"'));
check("connection requires ready valid",registry.includes('connection.status !== "ready" || connection.manifestStatus !== "valid"'));
check("expanded site lifecycle",website.includes('"manifest_received"') && website.includes('"validating"') && website.includes('"incompatible"') && website.includes('"ready"') && website.includes('"suspended"'));
check("legacy pending migration",website.includes('row.status === "pending"') && website.includes('status: "registered" as const'));
check("site lifecycle transition guard",website.includes("Invalid Site Connection lifecycle transition"));
check("generic site patch cannot change status",website.includes('Partial<Pick<SiteConnectionRecord, "registrySnapshotId" | "validationEvidenceId" | "lastValidatedAt">>'));
check("staff contracts view",page.includes('key: "contracts"') && page.includes('label: "Contracts"') && page.includes("Contract Registry evidence") && page.includes("registryReadiness"));
check("no manual trust button",!page.includes("trustRegistrySnapshot("));
check("staff can receive exact manifest evidence",page.includes(`Receive ${"${SITE_MANIFEST_FILENAME}"}`) && page.includes("Receive manifest"));
check("UI warns JSON receipt is not validation",page.includes("JSON receipt is not validation"));
check("UI says canonical IDs not invented",page.includes("does not invent or translate missing identifiers"));
check("integration guide requires no invented IDs",guide.includes("Do not silently invent IDs, fields, relationships, permissions, or API operations."));
const semverAtLeast015=(value)=>{const [a=0,b=0,c=0]=String(value).split(".").map(Number);return a>0||(a===0&&(b>15||(b===15&&c>=0)));};
check("package version remains V0.15+",semverAtLeast015(pkg.version));
check("VERSION remains V0.15+",semverAtLeast015(version));
const appVersionMatch=appVersion.match(/APP_VERSION = "([^"]+)"/);
check("app version remains V0.15+",Boolean(appVersionMatch&&semverAtLeast015(appVersionMatch[1])));
check("V0.15 QA script wired",pkg.scripts?.["check:contract-registry"]==="node scripts/contract-registry-check.mjs");

console.log("NEXT F CMS V0.15.0 Contract Registry Resolver Foundation check");
for(const item of pass)console.log(`PASS  ${item}`);
for(const item of fail)console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if(fail.length)process.exit(1);

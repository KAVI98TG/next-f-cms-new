import fs from "node:fs";
const pass=[]; const fail=[];
const check=(label,condition)=>condition?pass.push(label):fail.push(label);
const exists=(path)=>fs.existsSync(path);
const read=(path)=>fs.readFileSync(path,"utf8");
const files=[
  "src/services/backend/types.ts",
  "src/services/backend/contracts.ts",
  "src/services/backend/authorization.ts",
  "src/services/backend/idempotency.ts",
  "src/services/backend/boundary.ts",
  "src/services/backend/projections.ts",
  "src/services/backend/siteAdapter.ts",
  "src/services/backend/audit.ts",
  "src/services/backend/localPrototype.ts",
  "src/services/backend/index.ts",
  "src/next-f/website-platform/WebsitePlatformPage.tsx",
  "docs/V0.18.0-SHARED-BACKEND-API-BOUNDARY.md",
];
files.forEach((path)=>check(`file ${path}`,exists(path)));
const types=read("src/services/backend/types.ts");
const contracts=read("src/services/backend/contracts.ts");
const auth=read("src/services/backend/authorization.ts");
const idem=read("src/services/backend/idempotency.ts");
const boundary=read("src/services/backend/boundary.ts");
const projections=read("src/services/backend/projections.ts");
const adapter=read("src/services/backend/siteAdapter.ts");
const audit=read("src/services/backend/audit.ts");
const local=read("src/services/backend/localPrototype.ts");
const page=read("src/next-f/website-platform/WebsitePlatformPage.tsx");
const scope=read("docs/NEXT-F-CMS-SCOPE-AND-ARCHITECTURE-DIRECTION.md");
const master=read("docs/NEXT-F-CMS-UPGRADE-MASTER-PLAN.md");
const pkg=JSON.parse(read("package.json"));
const version=read("VERSION").trim();
const appVersion=read("src/app/version.ts");

check("principal trust zones include staff",types.includes('"staff"'));
check("principal trust zones include customer",types.includes('"customer"'));
check("principal trust zones include demo",types.includes('"demo"'));
check("principal trust zones include public ingress",types.includes('"public"'));
check("principal trust zones include service",types.includes('"service"'));
check("customer principal pins account",types.includes("accountId: string"));
check("customer principal pins organization",types.includes("organizationId: string"));
check("customer principal pins workspace",types.includes("workspaceId: string"));
check("customer principal pins membership",types.includes("membershipId: string"));
check("customer principal pins customer role",types.includes("customerRoleId: string"));
check("demo principal pins environment",types.includes("demoEnvironmentId: string"));
check("public principal models abuse protection",types.includes('abuseProtection: "verified" | "unverified"'));
check("service principal uses scopes",types.includes("scopes: string[]"));
check("request context has request id",types.includes("requestId: string"));
check("request context has correlation id",types.includes("correlationId: string"));
check("request context can carry idempotency key",types.includes("idempotencyKey?: string"));
check("typed problem codes include scope mismatch",types.includes('"WORKSPACE_SCOPE_MISMATCH"'));
check("typed problem codes include demo isolation",types.includes('"DEMO_ISOLATION_VIOLATION"'));
check("typed problem codes include idempotency conflict",types.includes('"IDEMPOTENCY_CONFLICT"'));

check("operation registry exists",contracts.includes("BACKEND_API_OPERATIONS"));
check("staff workspace query registered",contracts.includes('"staff.workspace.get"'));
check("customer workspace query registered",contracts.includes('"customer.workspace.get"'));
check("customer change command registered",contracts.includes('"customer.change.submit"'));
check("customer publish command registered",contracts.includes('"customer.publish.submit"'));
check("staff change approval command registered",contracts.includes('"staff.change.approve"'));
check("service revision observation registered",contracts.includes('"service.site.revision.observe"'));
check("service application receipt registered",contracts.includes('"service.site.change.applied"'));
check("service publication receipt registered",contracts.includes('"service.site.publication.completed"'));
check("nextf public lead ingress registered",contracts.includes('"public.lead.submit"'));
check("nextf public demo request ingress registered",contracts.includes('"public.demo-access.request"'));
check("public lead never grants access",contracts.includes("never grants account/workspace access"));
check("public demo request never auto provisions",contracts.includes("never auto-provisions a Demo Environment"));
check("commands declare idempotency",contracts.includes('idempotency: "required"'));
check("staff operations require website platform permission",contracts.includes('staffPermissions: ["digital.website-platform.manage"]'));
check("service operations require explicit scopes",contracts.includes("serviceScopes"));

check("authorization checks allowed principal type",auth.includes("allowedPrincipals.includes"));
check("mutations require idempotency key",auth.includes("IDEMPOTENCY_KEY_REQUIRED"));
check("staff permission enforced",auth.includes("Missing staff permission"));
check("staff workspace organization scope validated",auth.includes("workspace.organizationId !== input.workspaceScope.organizationId"));
check("customer scope must equal principal scope",auth.includes("Cross-workspace access denied"));
check("customer membership exact match enforced",auth.includes("membership.accountId !== context.principal.accountId") && auth.includes("membership.customerRoleId !== context.principal.customerRoleId"));
check("customer membership must be active",auth.includes('membership.status !== "active"'));
check("customer invitation must be accepted",auth.includes('membership.invitationState !== "accepted"'));
check("demo is synthetic only",auth.includes('environment.dataPolicy !== "synthetic_only"'));
check("demo cannot carry production workspace scope",auth.includes("Production workspace scope denied"));
check("public cannot carry workspace scope",auth.includes("Public workspace scope denied"));
check("public source is restricted to nextf.lk route",auth.includes('context.principal.source !== "nextf.lk"'));
check("public mutation requires abuse protection",auth.includes("Public abuse protection required"));
check("service scope enforced",auth.includes("SERVICE_SCOPE_MISSING"));
check("service cannot impersonate workspace",auth.includes("Service workspace impersonation denied"));

check("idempotency record binds command",idem.includes("commandName: BackendCommandName"));
check("idempotency record binds principal",idem.includes("principalFingerprint: string"));
check("idempotency record binds request hash",idem.includes("requestHash: string"));
check("idempotency models claimed/completed/failed",idem.includes('"claimed" | "completed" | "failed"'));
check("development memory repository explicitly non-production",idem.includes("Development-only implementation") && idem.includes("Production must use a durable, atomic backend store"));
check("stable request fingerprint normalizes object keys",idem.includes("Object.entries") && idem.includes("localeCompare"));

check("boundary executes authorized queries",boundary.includes("executeAuthorizedQuery"));
check("boundary executes idempotent commands",boundary.includes("executeIdempotentCommand"));
const commandBoundary=boundary.slice(boundary.indexOf("export async function executeIdempotentCommand"));
check("boundary claims idempotency before handler",commandBoundary.indexOf("idempotencyRepository.claim") < commandBoundary.indexOf("input.handler()"));
check("boundary rejects idempotency conflict",boundary.includes("IDEMPOTENCY_CONFLICT"));
check("boundary returns replay reference",boundary.includes("replayed: true"));
check("boundary records audit denials",boundary.includes('"denied"'));
check("boundary records command completion",boundary.includes('"completed"'));
check("principal fingerprint separates trust zones",boundary.includes('["staff"') && boundary.includes('["customer"') && boundary.includes('["demo"') && boundary.includes('["public"') && boundary.includes('["service"'));

check("staff projection separate",projections.includes("StaffWorkspaceProjection"));
check("customer projection separate",projections.includes("CustomerWorkspaceProjection"));
check("demo projection separate",projections.includes("DemoWorkspaceProjection"));
check("projection rules exclude secrets",projections.includes("credentials, secrets, infrastructure configuration"));
check("projections are not second system of record",projections.includes("not a second system of record"));

check("managed site adapter observe contract",adapter.includes("observeResource"));
check("managed site adapter apply contract",adapter.includes("applyApprovedChange"));
check("managed site adapter publish contract",adapter.includes("publishRevision"));
check("adapter context pins validation evidence",adapter.includes("validationEvidenceId: string"));
check("adapter uses server credential reference",adapter.includes("credentialReference: string"));
check("adapter rules keep secrets server side",adapter.includes("secrets must never be returned to either frontend"));
check("adapter apply pins expected revision",adapter.includes("expectedBaseRevisionId"));
check("adapter publish pins revision hash",adapter.includes("targetContentHash"));
check("adapter requires receipts",adapter.includes("adapterReceiptId"));

check("backend audit identifies principal kind",audit.includes("principalKind"));
check("backend audit includes request/correlation",audit.includes("requestId: string") && audit.includes("correlationId: string"));
check("audit denies client supplied actor label",audit.includes("never a client-supplied actor label"));

check("local harness builds staff principal",local.includes("buildLocalStaffPrincipal"));
check("local harness builds customer principal",local.includes("buildCustomerPrincipal"));
check("local customer principal requires verified account",local.includes('account.verificationState !== "verified"'));
check("local harness builds demo principal",local.includes("buildDemoPrincipal"));
check("local customer projection only exposes connected sites",local.includes('row.status === "connected"'));
check("backend readiness says production transport connected",local.includes("productionTransportConnected: true"));
check("backend readiness says durable idempotency connected",local.includes("durableIdempotencyConnected: true"));
check("local readiness says identity provider false",local.includes("productionIdentityProviderConnected: false"));
check("local readiness says adapter registry false",local.includes("managedSiteAdapterRegistryConnected: false"));
check("local harness calls itself prototype",local.includes('runtimeMode: "local-prototype"'));

check("staff UI exposes backend API boundary",page.includes('key: "backend-api"') && page.includes('label: "Backend / API"') && page.includes("API operation registry"));
check("staff UI exposes governed backend boundary",page.includes("API operation registry") && page.includes("authorized server-side") && page.includes("Fail closed"));
check("staff UI keeps server-authorized scope boundary",page.includes("authorized server-side")&&page.includes("trusted server principals"));
check("staff UI reports backend readiness from runtime truth",page.includes("getBackendBoundaryReadiness")&&page.includes("backendReadiness.productionTransportConnected")&&page.includes("Production adapter readiness"));
check("staff UI marks production adapters pending",page.includes("Pending adapter"));

check("scope says customer workspace separate frontend",scope.includes("Customer Workspace should be a separate frontend"));
check("scope says backend authorization",scope.includes("Every customer operation must be validated through backend authorization"));
check("scope says same authoritative data",scope.includes("should not maintain independent copies of the same business entities"));
check("scope says admin and customer tightly connected through backend",scope.includes("should be tightly connected through the backend"));
check("master says public site not direct database client",master.includes("not a direct database client"));
check("master public writes require spam and rate limiting",master.includes("spam/abuse protection, rate limiting"));

const semverAtLeast=(value,minimum)=>{const a=value.split(".").map(Number),b=minimum.split(".").map(Number);for(let i=0;i<3;i++){if((a[i]??0)>(b[i]??0))return true;if((a[i]??0)<(b[i]??0))return false;}return true;};
check("package version remains at least V0.18.0",semverAtLeast(pkg.version,"0.18.0"));
check("VERSION remains at least V0.18.0",semverAtLeast(version,"0.18.0"));
check("app version remains at least V0.18.0",semverAtLeast((appVersion.match(/APP_VERSION = "([^"]+)"/)||[])[1]||"0.0.0","0.18.0"));
check("V0.18 release history remains documented",read("docs/V0.18.0-SHARED-BACKEND-API-BOUNDARY.md").includes("Shared Backend/API Boundary"));
check("V0.18 QA script wired",pkg.scripts?.["check:backend-api"]==="node scripts/backend-api-boundary-check.mjs");

console.log("NEXT F CMS V0.18.0 Shared Backend/API Boundary check");
for(const item of pass)console.log(`PASS  ${item}`);
for(const item of fail)console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if(fail.length)process.exit(1);

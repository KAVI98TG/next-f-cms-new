import fs from "node:fs";
const pass=[]; const fail=[];
const check=(label,condition)=>condition?pass.push(label):fail.push(label);
const exists=(path)=>fs.existsSync(path);
const read=(path)=>fs.readFileSync(path,"utf8");
const files=[
  "src/next-f/website-platform/publicSiteIntegrationStore.ts",
  "src/services/backend/contracts.ts",
  "src/services/backend/projections.ts",
  "src/services/backend/localPrototype.ts",
  "src/services/backend/publicSiteApi.ts",
  "src/next-f/website-platform/WebsitePlatformPage.tsx",
  "docs/V0.19.0-NEXTF-LK-FIRST-PARTY-INTEGRATION.md",
  "docs/QA-V0.19.0.md",
];
files.forEach((path)=>check(`file ${path}`,exists(path)));
const store=read("src/next-f/website-platform/publicSiteIntegrationStore.ts");
const contracts=read("src/services/backend/contracts.ts");
const projections=read("src/services/backend/projections.ts");
const auth=read("src/services/backend/authorization.ts");
const local=read("src/services/backend/localPrototype.ts");
const publicApi=read("src/services/backend/publicSiteApi.ts");
const page=read("src/next-f/website-platform/WebsitePlatformPage.tsx");
const types=read("src/next-f/data/types.ts");
const sales=read("src/next-f/data/repositories/salesRepository.ts");
const platformOps=read("src/platform/services/platformOperationsStore.ts");
const scope=read("docs/NEXT-F-CMS-SCOPE-AND-ARCHITECTURE-DIRECTION.md");
const master=read("docs/NEXT-F-CMS-UPGRADE-MASTER-PLAN.md");
const pkg=JSON.parse(read("package.json"));
const lock=JSON.parse(read("package-lock.json"));
const version=read("VERSION").trim();
const appVersion=read("src/app/version.ts");

check("nextf host constant",store.includes('NEXTF_PUBLIC_HOST = "nextf.lk"'));
check("main site has dedicated first-party key",store.includes('NEXTF_PUBLIC_SITE_KEY = "nextf-digital-main"'));
check("first-party record owner is NEXT F",store.includes('ownerOrganizationId: "org_nextf"'));
check("first-party tenancy is explicit",store.includes('tenancy: "first_party"'));
check("first-party site is not direct DB client",store.includes("directInternalDatabaseAccess: false"));
check("Platform domain inventory uses live nextf.lk host",platformOps.includes('hostname:"nextf.lk",purpose:"digital"'));
check("old nextf.com.lk local seed migrates to nextf.lk",platformOps.includes('row.hostname==="nextf.com.lk"?{...row,hostname:"nextf.lk"'));
check("public delivery is projection API",store.includes('publicDeliveryMode: "projection_api"'));
check("source inventory models partial evidence",store.includes('"source_required" | "partial" | "verified"'));
check("seed public projections start draft",store.includes('status: "draft", publicFields: ["name", "family"') && !store.includes('publishedBy: "system-seed"'));

check("public projection kinds include service",store.includes('"service" | "case_study" | "help_article" | "help_faq"'));
check("publication has authoritative source id",store.includes("sourceId: string"));
check("publication has separate public id",store.includes("publicId: string"));
check("publication has explicit public field allowlist",store.includes("publicFields: string[]"));
check("publication lifecycle has withdrawn",store.includes('"draft" | "published" | "withdrawn"'));
check("publication withdrawal does not delete source",store.includes("authoritative source was not deleted"));
check("service projection only exposes published",store.includes('row.kind === "service" && row.status === "published"'));
check("service projection requires active source",store.includes("item.id === row.sourceId && item.active"));
check("service price exposed only if allowlisted",store.includes('fields.has("basePrice")'));
check("case studies require completed project",store.includes('row.id === sourceId && row.status === "completed"') && store.includes('item.id === row.sourceId && item.status === "completed"'));
check("case studies require explicit public title/summary",store.includes("!row.publicTitle || !row.publicSummary"));
check("help article source must already be published",store.includes('row.id === sourceId && row.status === "published"'));
check("help projection restricted to all or digital",store.includes('["all", "digital"].includes'));

check("logical route inventory includes lead form",store.includes('"lead_form"'));
check("logical route inventory includes demo access",store.includes('"demo_access"'));
check("logical route inventory includes account registration",store.includes('"account_registration"'));
check("logical route inventory includes workspace sign in",store.includes('"customer_workspace_sign_in"'));
check("logical route inventory includes services",store.includes('"services"'));
check("logical route inventory includes case studies",store.includes('"case_studies"'));
check("logical route inventory includes help resources",store.includes('"help_resources"'));
check("logical route inventory includes conversion events",store.includes('"conversion_events"'));
check("route starts unmapped",store.includes('status: "unmapped"'));
check("route verification requires component evidence",store.includes("Source/component evidence is required"));
check("route verification rejects other domains",store.includes("Route must belong to nextf.lk"));
check("readiness documents source/crawl blocker",store.includes("public-site source or a verifiable live crawl"));

check("public lead input requires privacy acknowledgement",store.includes("privacyAccepted: boolean"));
check("public lead validates privacy",store.includes("Privacy acknowledgement is required before a public enquiry is accepted"));
check("public lead normalizes email",store.includes("normalizedEmail(input.email)"));
check("public lead may be general enquiry without service",types.includes("serviceId?: string"));
check("public lead maps source to nextf.lk",store.includes('source: "nextf.lk"'));
check("public lead audit uses System actor",sales.includes('lead.source==="nextf.lk"?"System":"Admin"'));
check("public lead stores enquiry detail safely",store.includes("input.message?.trim().slice(0, 5000)"));
check("public lead stores privacy evidence",types.includes("privacyConsentAt?: string"));
check("marketing consent remains separate",types.includes("marketingConsentAt?: string"));
check("staff cannot qualify general lead without service",sales.includes("Assign an interested service before qualifying"));
check("public selected service must be published projection",store.includes("Selected service is not currently available through the public projection"));

check("public demo requires privacy acknowledgement",store.includes("Privacy acknowledgement is required before a Demo Access Request is accepted"));
check("public demo reuses governed demo request store",store.includes("websitePlatformStore.submitDemoRequest"));
check("demo request still starts submitted",read("src/next-f/website-platform/websitePlatformStore.ts").includes('status: "submitted"'));

check("conversion registry includes lead submitted",store.includes('"lead_submitted"'));
check("conversion registry includes demo requested",store.includes('"demo_access_requested"'));
check("conversion registry includes account entry",store.includes('"account_entry_clicked"'));
check("conversion registry includes workspace sign in",store.includes('"workspace_sign_in_clicked"'));
check("conversion registry includes service interest",store.includes('"service_interest"'));
check("conversion registry includes case study view",store.includes('"case_study_viewed"'));
check("conversion events have PII denylist",store.includes("forbiddenPiiKeys"));
check("conversion events have payload allowlist",store.includes("allowedPayloadKeys"));
check("conversion receipt rejects PII keys",store.includes("is forbidden in conversion event payloads"));
check("conversion receipt rejects non-allowlisted keys",store.includes("is not allowlisted"));
check("conversion payload scalar only",store.includes("must be scalar"));

check("public bootstrap query registered",contracts.includes('"public.site.bootstrap.get"'));
check("public service query registered",contracts.includes('"public.services.list"'));
check("public case study query registered",contracts.includes('"public.case-studies.list"'));
check("public help query registered",contracts.includes('"public.help.list"'));
check("public lead command preserved",contracts.includes('"public.lead.submit"'));
check("public demo command preserved",contracts.includes('"public.demo-access.request"'));
check("public conversion command registered",contracts.includes('"public.conversion.track"'));
check("public conversion command idempotent",contracts.includes('name: "public.conversion.track", kind: "command"') && contracts.includes('idempotency: "required"'));
check("public commands still require abuse protection",auth.includes("Public abuse protection required"));
check("public workspace scope still denied",auth.includes("Public workspace scope denied"));
check("public source still restricted",auth.includes('context.principal.source !== "nextf.lk"'));

check("public bootstrap projection is separate DTO",projections.includes("PublicSiteBootstrapProjection"));
check("public projection rules say first party not customer tenant",projections.includes("not a Customer Workspace tenant"));
check("public projection rules exclude internal secrets",projections.includes("credentials, secrets or infrastructure configuration"));
check("public writes use backend commands",projections.includes("dedicated backend commands"));
check("public exact routes remain evidence based",projections.includes("real nextf.lk source or a verifiable live crawl"));

check("local harness can mint public principal",local.includes("buildPublicPrincipal"));
check("local public principal source is nextf.lk",local.includes('source: "nextf.lk"'));
check("public bootstrap keeps account route unmapped until verified",store.includes('accountRegistration: { status: account?.status === "verified" ? "verified" as const : "unmapped" as const'));
check("public bootstrap keeps sign-in route unmapped until verified",store.includes('customerWorkspaceSignIn: { status: signIn?.status === "verified" ? "verified" as const : "unmapped" as const'));
check("local bootstrap delegates to first-party builder",local.includes("return publicSiteIntegrationStore.buildPublicBootstrap()"));
check("backend readiness includes public site",local.includes("publicSiteReadiness"));

check("public API handler delegates principal denial to shared boundary",!publicApi.includes("requirePublicContext") && publicApi.includes("executeAuthorizedQuery") && publicApi.includes("executeIdempotentCommand"));
check("public API handler exposes bootstrap query",publicApi.includes("getPublicSiteBootstrap") && publicApi.includes('operationName: "public.site.bootstrap.get"'));
check("public API handler exposes services query",publicApi.includes("listPublicServices") && publicApi.includes('operationName: "public.services.list"'));
check("public API handler exposes case studies query",publicApi.includes("listPublicCaseStudies") && publicApi.includes('operationName: "public.case-studies.list"'));
check("public API handler exposes help query",publicApi.includes("listPublicHelp") && publicApi.includes('operationName: "public.help.list"'));
check("public API handler routes lead through idempotent boundary",publicApi.includes("submitPublicLead") && publicApi.includes('operationName: "public.lead.submit"') && publicApi.includes("executeIdempotentCommand"));
check("public API handler routes demo through idempotent boundary",publicApi.includes("submitPublicDemoAccessRequest") && publicApi.includes('operationName: "public.demo-access.request"'));
check("public API handler routes conversions through idempotent boundary",publicApi.includes("trackPublicConversion") && publicApi.includes('operationName: "public.conversion.track"'));
check("public API responses do not echo lead PII",publicApi.includes("data: { leadId: lead.id, received: true as const }") && !publicApi.includes("lead.email") && !publicApi.includes("lead.phone") && !publicApi.includes("lead.enquiryDetail"));

check("staff UI has nextf.lk integration tab",page.includes('label: "nextf.lk Integration"'));
check("staff UI says first party not customer tenant",page.includes("first-party public surface, not a customer tenant"));
check("staff UI says no direct DB reads",page.includes("No direct DB reads"));
check("staff UI exposes route inventory blocker",page.includes("Exact live-site wiring intentionally blocked"));
check("staff UI exposes public projection rules",page.includes("Public projection rules"));
check("staff UI exposes conversion registry",page.includes("First-party conversion event registry"));
check("staff UI exposes public API operations",page.includes("Public API surfaces registered in V1"));

check("scope identifies nextf.lk as NEXT F Digital public site",scope.includes("main public website, **nextf.lk**, represents NEXT F Digital"));
check("master says nextf.lk is first-party consumer",master.includes("first-party consumer of controlled platform APIs/events"));
check("master forbids direct database client",master.includes("not a direct database client"));
check("master says exact routes must not be guessed",master.includes("Exact page/route/component mapping must be based on the live site source, not guessed"));

const semverAtLeast019=(value)=>{const [a,b,c]=value.split(".").map(Number);return a>0||(a===0&&(b>19||(b===19&&c>=0)));};
check("package version remains V0.19+",semverAtLeast019(pkg.version));
check("VERSION remains V0.19+",semverAtLeast019(version));
check("package-lock remains V0.19+",semverAtLeast019(lock.version) && semverAtLeast019(lock.packages?.[""]?.version||"0.0.0"));
const appVersionMatch=appVersion.match(/APP_VERSION = "([^"]+)"/);
check("app version remains V0.19+",Boolean(appVersionMatch&&semverAtLeast019(appVersionMatch[1])));
check("release label is defined",/APP_RELEASE = "[^"]+"/.test(appVersion));
check("V0.19 QA script wired",pkg.scripts?.["check:public-site"]==="node scripts/public-site-integration-check.mjs");

console.log("NEXT F CMS V0.19.0 nextf.lk First-Party Integration check");
for(const item of pass)console.log(`PASS  ${item}`);
for(const item of fail)console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if(fail.length)process.exit(1);

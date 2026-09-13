import fs from "node:fs";

const pass=[]; const fail=[];
const check=(label,condition)=>condition?pass.push(label):fail.push(label);
const exists=(path)=>fs.existsSync(path);
const read=(path)=>fs.readFileSync(path,"utf8");

[
  "src/next-f/website-platform/workspaceProvisioningStore.ts",
  "src/next-f/website-platform/WebsitePlatformPage.tsx",
  "src/next-f/website-platform/websitePlatformStore.ts",
  "src/platform/customer-access/customerAccessStore.ts",
  "docs/V0.14.0-WORKSPACE-PROVISIONING-DEMO-GOVERNANCE.md",
].forEach((path)=>check(`file ${path}`,exists(path)));

const provisioning=read("src/next-f/website-platform/workspaceProvisioningStore.ts");
const website=read("src/next-f/website-platform/websitePlatformStore.ts");
const membership=read("src/platform/customer-access/customerAccessStore.ts");
const page=read("src/next-f/website-platform/WebsitePlatformPage.tsx");
const pkg=JSON.parse(read("package.json"));

check("real workspace review model",provisioning.includes("WorkspaceProvisioningReview") && provisioning.includes('"in_review"') && provisioning.includes('"approved"') && provisioning.includes('"completed"'));
check("verified identity required",provisioning.includes('account.verificationState !== "verified"') && provisioning.includes("verified, active NEXT F Account"));
check("active digital client required",provisioning.includes('client?.status === "active"'));
check("customer organization required",provisioning.includes('organization.kind === "customer"') && provisioning.includes('organization.status === "active"'));
check("explicit client organization link required",provisioning.includes("organizationLinkReady") && provisioning.includes('row.status === "active"'));
check("eligible project or subscription relationship required",provisioning.includes("getSubscriptions") && provisioning.includes("At least one eligible project or subscription/service relationship is required"));
check("approval moves workspace to provisioning",provisioning.includes('status: "provisioning"') && provisioning.includes("workspace.review_approved"));
check("workspace lifecycle uses validated transition method",website.includes("transitionWorkspace") && website.includes("Invalid Customer Workspace lifecycle transition") && provisioning.includes("websitePlatformStore.transitionWorkspace"));
check("project attachment explicit",provisioning.includes("attachProject") && provisioning.includes("Project is not an eligible project"));
check("service attachment explicit",provisioning.includes("attachService") && provisioning.includes("eligible project or subscription relationship"));
check("site attachment uses site connection",provisioning.includes("attachSite") && provisioning.includes("websitePlatformStore.connectSite"));
check("activation requires project scope",provisioning.includes("Attach at least one eligible Digital project before activation"));
check("activation requires service scope",provisioning.includes("Attach at least one eligible service before activation"));
check("activation does not create membership",!provisioning.includes("inviteMembership") && provisioning.includes("Membership invitations remain explicit"));
check("provisioning activity history",provisioning.includes("ProvisioningActivityRecord") && provisioning.includes("addActivity"));
check("demo environment independent model",provisioning.includes("DemoEnvironmentRecord") && provisioning.includes('dataPolicy: "synthetic_only"'));
check("demo restrictions exclude production",provisioning.includes("no-production-integrations") && provisioning.includes("no-production-publishing") && provisioning.includes("no-real-customer-data") && provisioning.includes("no-secret-access"));
check("demo request approval required",provisioning.includes('request.status !== "approved"'));
check("demo lifecycle provision activate extend reset revoke",provisioning.includes("provisionDemoEnvironment") && provisioning.includes("activateDemoEnvironment") && provisioning.includes("extendDemoEnvironment") && provisioning.includes("resetDemoEnvironment") && provisioning.includes("revokeDemoEnvironment"));
check("demo expiry modeled",provisioning.includes('status: "expired" as const') && provisioning.includes("expiresAt"));
const demoType=provisioning.slice(provisioning.indexOf("export type DemoEnvironmentRecord"), provisioning.indexOf("export type WorkspaceProvisioningAssessment"));
check("demo cannot carry production workspace identifier",!demoType.includes("workspaceId") && !demoType.includes("clientId") && !demoType.includes("siteId") && !demoType.includes("projectId"));
check("demo request review transitions deliberate",website.includes("startDemoReview") && website.includes("approveDemoRequest") && website.includes("rejectDemoRequest"));
check("demo lifecycle has no generic public status patch",!website.includes("updateDemoRequest(id:") && website.includes("activateDemoAccess") && website.includes("extendDemoAccess") && website.includes("expireDemoAccess") && website.includes("revokeDemoAccess"));
check("demo submission grants nothing",website.includes("no environment or Customer Workspace was created"));
check("membership invitation expiry",membership.includes("invitationExpiresAt") && membership.includes("expireInvitation"));
check("membership invitation resend",membership.includes("resendInvitation"));
check("customer-side acceptance method",membership.includes("acceptInvitation") && membership.includes("does not belong to this NEXT F Account"));
check("acceptance requires active workspace",membership.includes('workspace.status !== "active"'));
check("staff UI has separate workspace view",page.includes('"Customer Workspaces"'));
check("staff UI has memberships view",page.includes('"Memberships"'));
check("staff UI has demo requests view",page.includes('"Demo Requests"'));
check("staff UI has demo environments view",page.includes('"Demo Environments"'));
check("staff UI has provisioning activity view",page.includes('"Provisioning Activity"'));
check("staff UI explains registration does not activate workspace",page.includes("Registration never activates a workspace"));
check("contract boundary remains fail closed",page.includes("Contract boundary remains fail-closed") && page.includes("Site Manifest"));
check("package version keeps V0.14+ foundation",Number(pkg.version.split(".")[1])>=14);
check("V0.14 QA script wired",pkg.scripts?.["check:provisioning-demo"]==="node scripts/provisioning-demo-check.mjs");

console.log("NEXT F CMS V0.14.0 Workspace Provisioning & Demo Governance check");
for(const item of pass)console.log(`PASS  ${item}`);
for(const item of fail)console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if(fail.length)process.exit(1);

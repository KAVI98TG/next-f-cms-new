import fs from "node:fs";

const pass=[]; const fail=[];
const check=(label,condition)=>condition?pass.push(label):fail.push(label);
const exists=(path)=>fs.existsSync(path);
const read=(path)=>fs.readFileSync(path,"utf8");

[
  "src/platform/identity/identityStore.ts",
  "src/platform/identity/IdentityPage.tsx",
  "src/platform/customer-access/customerAccessStore.ts",
  "src/next-f/website-platform/websitePlatformStore.ts",
  "docs/V0.13.0-IDENTITY-MEMBERSHIP-FOUNDATION.md",
].forEach((path)=>check(`file ${path}`,exists(path)));

const identity=read("src/platform/identity/identityStore.ts");
const customerAccess=read("src/platform/customer-access/customerAccessStore.ts");
const website=read("src/next-f/website-platform/websitePlatformStore.ts");
const operations=read("src/platform/services/platformOperationsStore.ts");
const sharedAccounts=read("src/platform/accounts/AccountsPage.tsx");
const app=read("src/app/App.tsx");
const nav=read("src/app/navigation.ts");
const search=read("src/services/shared/searchIndex.ts");
const pkg=JSON.parse(read("package.json"));

check("canonical NEXT F Account model",identity.includes("export type NextFAccount") && identity.includes("primaryEmail") && identity.includes("verificationState") && identity.includes("AccountState"));
check("identity does not store staff roles",!identity.includes("roleId:") && !identity.includes("permissions:"));
check("staff identity link is separate",identity.includes("export type StaffIdentityLink") && identity.includes("platformUserId"));
check("organization kind distinguishes customer",operations.includes('OrganizationKind="internal"|"customer"'));
check("customer organization relationship explicit",website.includes("CustomerOrganizationLinkRecord") && website.includes("linkCustomerOrganization"));
check("workspace includes organization owner",website.includes("organizationId: string") && website.includes("Digital client must be explicitly linked"));
check("workspace lifecycle includes read-only and closed",website.includes('"read_only"') && website.includes('"closed"'));
check("membership record explicit",customerAccess.includes("export type CustomerMembershipRecord") && customerAccess.includes("accountId") && customerAccess.includes("workspaceId") && customerAccess.includes("customerRoleId"));
check("invitation state separate",customerAccess.includes("CustomerInvitationState") && customerAccess.includes("invitationState"));
check("membership invitation requires verified account",customerAccess.includes('account.verificationState !== "verified"'));
check("membership invitation requires active workspace",customerAccess.includes('workspace.status !== "active"'));
check("customer roles separate catalog",customerAccess.includes("Owner") && customerAccess.includes("Customer Admin") && customerAccess.includes("Content Editor") && customerAccess.includes("Read Only"));
check("contract website permission bindings fail closed",customerAccess.includes("contractPermissionBindings: []"));
check("legacy migration is assessment only",website.includes("getLegacyPortalMigrationAssessments") && website.includes("Email matching alone is not enough") && !website.includes("migrateLegacyPortalAccess"));
check("legacy active status is not copied",website.includes("legacy portal state is not copied automatically"));
check("Shared Accounts clarified as non-auth identity",sharedAccounts.includes("not the NEXT F Account authentication identity directory"));
check("NEXT F Accounts route",app.includes('"/platform/identity": <IdentityPage />'));
check("NEXT F Accounts navigation",nav.includes('label: "NEXT F Accounts"') && nav.includes('path: "/platform/identity"'));
check("identity searchable",search.includes('type: "NEXT F Account"'));
check("membership searchable",search.includes('type: "Customer Membership"'));
check("package version keeps V0.13+ foundation",Number(pkg.version.split(".")[1])>=13);
check("identity membership QA script",pkg.scripts?.["check:identity-membership"]==="node scripts/identity-membership-check.mjs");

console.log("NEXT F CMS V0.13.0 Identity & Membership Foundation check");
for(const item of pass)console.log(`PASS  ${item}`);
for(const item of fail)console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if(fail.length)process.exit(1);

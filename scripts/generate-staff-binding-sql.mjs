#!/usr/bin/env node

const args = process.argv.slice(2);
const get = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (name) => args.includes(name);
const fail = (message) => { console.error(message); process.exit(1); };

const ALL_PERMISSIONS = [
  "platform.read","platform.users.manage","platform.access.manage","platform.audit.read","platform.settings.manage","platform.organizations.manage","platform.domains.manage","platform.security.manage","platform.logs.read","platform.backup.manage","platform.cleanup.manage","platform.help.manage",
  "digital.read","digital.sales.manage","digital.projects.manage","digital.billing.manage","digital.sites.manage","digital.website-platform.manage","digital.settings.manage",
  "gaming.read","gaming.orders.manage","gaming.products.manage","gaming.suppliers.manage","gaming.finance.manage",
  "software.read","software.products.manage","software.releases.manage","software.licenses.manage","software.billing.manage",
];
const known = new Set(ALL_PERMISSIONS);
const subject = get("--subject");
const email = get("--email")?.trim().toLowerCase();
const accountId = get("--account-id") || "acct_staff_admin";
const staffUserId = get("--staff-user-id") || "usr_admin";
const organizationId = get("--organization-id") || "org_nextf";
const requested = has("--super-admin") ? ALL_PERMISSIONS : (get("--permissions") || "").split(",").map((value) => value.trim()).filter(Boolean);

if (!subject) fail("Missing --subject. Use the exact Cloudflare Access JWT sub claim for the staff member.");
if (!email || !email.includes("@")) fail("Missing or invalid --email.");
if (!requested.length) fail("Provide --super-admin or --permissions permission.one,permission.two.");
const unknown = requested.filter((permission) => !known.has(permission));
if (unknown.length) fail(`Unknown permissions: ${unknown.join(", ")}`);
const escape = (value) => `'${String(value).replaceAll("'", "''")}'`;
const permissionsJson = JSON.stringify([...new Set(requested)]);
const updatedAt = new Date().toISOString();

console.log("-- Review the resolved identity and permissions before executing against D1.");
console.log("INSERT INTO staff_identity_bindings(access_subject,email,account_id,staff_user_id,organization_id,permissions_json,status,updated_at)");
console.log(`VALUES(${escape(subject)},${escape(email)},${escape(accountId)},${escape(staffUserId)},${escape(organizationId)},${escape(permissionsJson)},'active',${escape(updatedAt)})`);
console.log("ON CONFLICT(access_subject) DO UPDATE SET");
console.log("  email=excluded.email,");
console.log("  account_id=excluded.account_id,");
console.log("  staff_user_id=excluded.staff_user_id,");
console.log("  organization_id=excluded.organization_id,");
console.log("  permissions_json=excluded.permissions_json,");
console.log("  status='active',");
console.log("  updated_at=excluded.updated_at;");

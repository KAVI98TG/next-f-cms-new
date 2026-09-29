#!/usr/bin/env node

import { readFileSync } from "node:fs";

const expectedAccountId = "df47917ecc2d22a3612202862f42fb38";
const expectedDatabaseId = "0784f4cf-85c1-4fe5-9f4f-b4c3af11f13e";
const config = JSON.parse(readFileSync(new URL("../infrastructure/cloudflare/wrangler.production.jsonc", import.meta.url), "utf8"));
const errors = [];
if (config.account_id !== expectedAccountId) errors.push("Worker account_id does not match the new production account");
if (config.d1_databases?.find((binding) => binding.binding === "DB")?.database_id !== expectedDatabaseId) errors.push("DB binding does not match the new production D1 database");
if (process.env.CLOUDFLARE_ACCOUNT_ID !== expectedAccountId) errors.push("Set CLOUDFLARE_ACCOUNT_ID to the new production account before any Pages or Worker deployment");
if (process.env.NEXTF_CMS_NEW_ACCOUNT_DEPLOY_APPROVED !== "YES") errors.push("New-account production deployment has not been explicitly enabled for this command");
if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.vars?.ACCESS_TEAM_DOMAIN ?? "") || config.vars.ACCESS_TEAM_DOMAIN === "plain-surf-8d0d.cloudflareaccess.com") errors.push("New-account Access team domain is unresolved");
if (!/^[a-f0-9]{64}$/.test(config.vars?.ACCESS_AUD ?? "") || config.vars.ACCESS_AUD === "dda0e3d9ec0ee3e1dc7528b9f0df9ea143b6d16f29aebdc54b8b2efba0952ff9") errors.push("New-account Access application AUD is unresolved");
if (errors.length) {
  console.error(`New-account production deployment blocked:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("New-account production target and explicit deployment authorization verified. Confirm remote R2, Queues, Analytics Engine, Access policy, secrets, and domains against the migration plan before proceeding.");

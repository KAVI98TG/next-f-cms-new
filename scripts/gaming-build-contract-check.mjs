import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const checks=[];
const check=(label,ok)=>checks.push([label,Boolean(ok)]);

const customers=read("src/gaming-store/customers/CustomersPage.tsx");
const dashboard=read("src/gaming-store/dashboard/GamingDashboard.tsx");
const storefront=read("src/gaming-store/vnext/cms/StorefrontVNextPage.tsx");
const types=read("src/gaming-store/vnext/types.ts");

check("customer loading StatePanel declares loading state", customers.includes('<StatePanel state="loading" title="Loading customers"'));
check("customer error StatePanel declares error state", customers.includes('<StatePanel state="error" title="Customers unavailable"'));
check("dashboard loading StatePanel declares loading state", dashboard.includes('<StatePanel state="loading" title="Loading Gaming Store"'));
check("dashboard error StatePanel declares error state", dashboard.includes('<StatePanel state="error" title="Dashboard unavailable"'));
check("canonical product model declares kind", /export type NextFGamingProduct[\s\S]*?kind: DigitalProductKind;/.test(types));
check("canonical product model does not declare category", !/export type NextFGamingProduct[\s\S]*?category\??:/.test(types.split('/** A retail option')[0]));
check("storefront product search derives explicit productKind", storefront.includes('const productKind=merchandisingKind(product.kind)'));
check("storefront product search never reads retired product.category", !storefront.includes('product.category'));

let failed=0;
for(const [label,ok] of checks){ console.log(`${ok?"PASS":"FAIL"}  ${label}`); if(!ok) failed++; }
console.log(`\n${checks.length-failed}/${checks.length} Gaming build-contract checks passed.`);
if(failed) process.exit(1);

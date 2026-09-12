import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/gaming-store/dashboard/GamingDashboard.tsx",
  "src/gaming-store/orders/OrdersPage.tsx",
  "src/gaming-store/products/ProductsPage.tsx",
  "src/gaming-store/pricing/PricingPage.tsx",
  "src/gaming-store/suppliers/SuppliersPage.tsx",
  "src/gaming-store/customers/CustomersPage.tsx",
  "src/gaming-store/finance/FinancePage.tsx",
  "src/gaming-store/support/SupportPage.tsx",
  "src/gaming-store/settings/SettingsPage.tsx",
  "src/gaming-store/data/gamingStore.ts",
  "src/gaming-store/shared/useGamingStore.ts",
  "src/gaming-store/shared/GamingStatus.tsx",
];
const routes = ["/gaming-store/dashboard","/gaming-store/orders","/gaming-store/products","/gaming-store/pricing","/gaming-store/suppliers","/gaming-store/customers","/gaming-store/finance","/gaming-store/support","/gaming-store/settings"];
const operations = ["addSupplier","testSupplier","syncSupplier","mapSupplierProduct","updateProduct","recalculatePrices","createOrder","markOrderPaid","advanceOrder","failOrder","requestRefund","completeRefund","addSupportCase","updateSupportCase","saveSettings"];
const failures=[]; const passes=[]; const check=(name,ok)=>ok?passes.push(name):failures.push(name);
for(const file of required) check(`file ${file}`,fs.existsSync(path.join(root,file)));
const app=fs.readFileSync(path.join(root,"src/app/App.tsx"),"utf8"); for(const route of routes) check(`route ${route}`,app.includes(`"${route}"`));
const dataRoot=path.join(root,"src/gaming-store/data"); const store=fs.readdirSync(dataRoot,{recursive:true}).filter((name)=>String(name).endsWith(".ts")).map((name)=>fs.readFileSync(path.join(dataRoot,String(name)),"utf8")).join("\n"); for(const op of operations) check(`operation ${op}`,store.includes(`${op}(`));
check("supplier independent provider key",store.includes("providerKey"));
check("supplier product mapping",store.includes("supplierProductId") && store.includes("externalId"));
check("dynamic required customer fields",store.includes("requiredFields"));
check("idempotency key on orders",store.includes("idempotencyKey"));
check("separate payment and supplier charge state",store.includes("customerPaid") && store.includes("supplierCharged"));
check("order reconciliation function",store.includes("orderReconciliation"));
check("pricing applies FX",store.includes("usdToLkr"));
check("pricing applies gateway fee",store.includes("gatewayFeePercent"));
check("minimum profit safeguard",store.includes("minimumProfitLkr"));
check("low supplier balance threshold",store.includes("lowSupplierBalanceUsd"));
check("no gaming placeholder READMEs",!fs.readdirSync(path.join(root,"src/gaming-store"),{recursive:true}).some((name)=>String(name).endsWith("README.md")));
check("no gaming .gitkeep placeholders",!fs.readdirSync(path.join(root,"src/gaming-store"),{recursive:true}).some((name)=>String(name).endsWith(".gitkeep")));

const sourceFiles=[]; function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(ts|tsx)$/.test(entry.name))sourceFiles.push(full);}} walk(path.join(root,"src"));
let importErrors=0; for(const file of sourceFiles){const source=fs.readFileSync(file,"utf8");for(const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)){const base=path.resolve(path.dirname(file),match[1]);const candidates=[base,`${base}.ts`,`${base}.tsx`,path.join(base,"index.ts"),path.join(base,"index.tsx")];if(!candidates.some((candidate)=>fs.existsSync(candidate)))importErrors++;}}
check(`${sourceFiles.length} TS/TSX files discovered`,sourceFiles.length>0); check("relative imports resolve",importErrors===0);
console.log("NEXT F CMS V0.5.0 Gaming Store Core check"); for(const p of passes)console.log(`PASS  ${p}`); for(const f of failures)console.error(`FAIL  ${f}`); console.log(`\n${passes.length} passed, ${failures.length} failed`); if(failures.length)process.exit(1);

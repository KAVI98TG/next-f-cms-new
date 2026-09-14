import fs from "node:fs";
const files=[
 "src/gaming-store/vnext/runtime/store.ts",
 "src/gaming-store/vnext/runtime/pricingEngine.ts",
 "src/gaming-store/vnext/runtime/supplierRouter.ts",
 "src/gaming-store/vnext/runtime/publicGamingService.ts",
 "src/gaming-store/vnext/server/fazercardsServerAdapter.ts",
 "src/gaming-store/vnext/server/webhook.ts",
 "src/gaming-store/vnext/cms/CatalogVNextPage.tsx",
 "src/gaming-store/vnext/public/PublicGamingStorefront.tsx",
 "src/css/gaming-public.css",
 "docs/gaming-store-vnext-implementation.md",
];
const failures=[];const passes=[];const check=(name,ok)=>(ok?passes:failures).push(name);
for(const file of files)check(`file ${file}`,fs.existsSync(file));
const source=files.filter((f)=>/\.(ts|tsx)$/.test(f)).map((f)=>fs.readFileSync(f,"utf8")).join("\n");
for(const concept of ["chooseSupplierMapping","buildGamingQuote","FazerCardsServerAdapter","CatalogVNextPage","PublicGamingStorefront","simulatePayment","SupplierOfferMapping"])check(`concept ${concept}`,source.includes(concept));
check("multi supplier route seed",source.includes("map_pubg_60_fz")&&source.includes("map_pubg_60_b"));
check("topup flow",source.includes("player_id")&&source.includes("supplier_preflight"));
check("gift card flow",source.includes("gift_card")&&source.includes("stock"));
check("steam wallet flow",source.includes("steam_login")&&source.includes("amount_based"));
check("telegram flow",source.includes("telegram_username")&&source.includes("telegram_stars"));
check("digital delivery",source.includes("Digital delivery")&&source.includes("topup_confirmation"));
check("trusted server warning",source.includes("DO NOT import this module from browser UI"));
const app=fs.readFileSync("src/app/App.tsx","utf8");const nav=fs.readFileSync("src/app/navigation.ts","utf8");
check("CMS route wired",app.includes('/gaming-store/catalog-vnext')&&nav.includes('/gaming-store/catalog-vnext'));
check("public route wired",app.includes('pathname === "/gaming"'));
console.log("NEXT F Gaming Store vNext integrated P2/P3/P4 check");for(const p of passes)console.log(`PASS  ${p}`);for(const f of failures)console.error(`FAIL  ${f}`);console.log(`\n${passes.length} passed, ${failures.length} failed`);if(failures.length)process.exit(1);

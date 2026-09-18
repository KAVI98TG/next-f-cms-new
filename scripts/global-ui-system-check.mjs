import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const base=read("src/css/base.css");
const components=read("src/css/components.css");
const tokens=read("src/css/tokens.css");
const badge=read("src/shared/components/Badge.tsx");
const capability=read("src/services/production/capabilities.ts");
const catalog=read("src/gaming-store/vnext/cms/CatalogVNextPage.tsx");
const storefront=read("src/gaming-store/vnext/cms/StorefrontVNextPage.tsx");
const embedded=read("src/gaming-store/vnext/public/PublicGamingStorefront.tsx");
const env=read(".env.production");
const checks=[
  ["scrollbars are styled for Firefox", base.includes("scrollbar-width: thin") && base.includes("scrollbar-color: var(--scrollbar-thumb)")],
  ["scrollbars are styled for WebKit", base.includes("::-webkit-scrollbar-track") && base.includes("::-webkit-scrollbar-thumb:hover")],
  ["scrollbar theme tokens include hover state", tokens.includes("--scrollbar-thumb-hover")],
  ["checkboxes use custom global appearance", base.includes('input[type="checkbox"]') && base.includes("appearance: none") && base.includes('input[type="checkbox"]:checked::before')],
  ["checkbox keyboard focus is preserved", base.includes('input[type="checkbox"]:focus-visible')],
  ["category badges have semantic gaming colors", components.includes(".gaming-kind-badge") && components.includes('data-kind="topup"') && components.includes('data-kind="game_key"') && components.includes('data-kind="gift_card"')],
  ["Badge supports reusable classes and data attributes", badge.includes("HTMLAttributes<HTMLSpanElement>") && badge.includes("...props")],
  ["catalog product kind uses semantic badge", catalog.includes("GamingKindBadge") && catalog.includes("kind={product.kind}")],
  ["family categories use semantic badges", storefront.includes("GamingKindBadge") && storefront.includes("gaming-family-kinds")],
  ["production storefront URL is explicit build config", env.includes("VITE_GAMING_STOREFRONT_URL=https://gaming.nextf.lk")],
  ["storefront capability resolves configured HTTPS destination", capability.includes("VITE_GAMING_STOREFRONT_URL") && capability.includes('detail:"Production storefront connected"') && capability.includes("href:url.toString()")],
  ["catalog storefront action opens configured destination", catalog.includes("storefrontCapability.href") && catalog.includes('"Open storefront"') && !catalog.includes("Public storefront not connected")],
  ["merchandising storefront action opens configured destination", storefront.includes("storefrontCapability.href") && storefront.includes('"Open storefront"')],
  ["embedded CMS storefront stays local-only", embedded.includes("publicStorefrontRuntime.allowsSimulation") && embedded.includes("https://gaming.nextf.lk")],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`); if(!ok) failed++;}
console.log(`\n${checks.length-failed}/${checks.length} global UI system checks passed.`);
if(failed) process.exit(1);

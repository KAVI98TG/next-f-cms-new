import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "src/gaming-store/vnext/types.ts",
  "src/gaming-store/vnext/supplierAdapter.ts",
  "src/gaming-store/vnext/publicContract.ts",
  "src/gaming-store/vnext/providers/fazercards.ts",
  "src/gaming-store/vnext/index.ts",
  "docs/gaming-store-supplier-architecture-vnext.md",
];
const failures = [];
const passes = [];
const check = (name, ok) => (ok ? passes : failures).push(name);
for (const file of files) check(`file ${file}`, fs.existsSync(path.join(root, file)));

const source = files.filter((f) => f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
for (const concept of [
  "NextFGamingProduct",
  "NextFGamingOffer",
  "SupplierOfferMapping",
  "PurchaseFieldSchema",
  "AvailabilitySnapshot",
  "RegionRule",
  "GamingQuote",
  "DigitalDeliverable",
  "SupplierAdapter",
  "GAMING_PUBLIC_OPERATIONS",
  "FAZERCARDS_MANIFEST",
]) check(`concept ${concept}`, source.includes(concept));

check("multiple supplier mappings supported", source.includes("priority: number") && source.includes("supplierId: string"));
check("supplier credentials server-side", source.includes("serverSideOnly: true"));
check("Fazer topup validation modeled", source.includes("/topups/validate-id"));
check("Fazer gift-card stock flow modeled", source.includes("/giftcards/cards"));
check("Fazer game-key region flow modeled", source.includes("/gamekeys/region-restriction"));
check("Fazer Steam wallet modeled", source.includes("/steam-topup/check-login"));
check("Fazer Steam gifts modeled", source.includes("/steam-gifts/order"));
check("Fazer Telegram modeled", source.includes("/telegram/stars/buy") && source.includes("/telegram/premium/buy"));
check("Fazer manual services modeled", source.includes("/manual-services/order"));
check("digital deliverables protected by contract note", source.includes("must never be sent to analytics"));

console.log("NEXT F Gaming Store supplier-agnostic vNext check");
for (const pass of passes) console.log(`PASS  ${pass}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);

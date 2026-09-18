import fs from "node:fs";

const page = fs.readFileSync("src/gaming-store/vnext/cms/CatalogVNextPage.tsx", "utf8");
const modal = fs.readFileSync("src/shared/components/Modal.tsx", "utf8");
const css = fs.readFileSync("src/css/components.css", "utf8");
const checks = [
  ["product editor uses wide modal variant", /className="modal--wide gaming-product-modal"/.test(page)],
  ["modal supports targeted class names without changing defaults", /className\?:string/.test(modal) && /modal\$\{className/.test(modal)],
  ["product editor actions use modal footer", /footer=\{selectedProduct \? <>/.test(page) && /Save product/.test(page)],
  ["product identity and media are separated", /gaming-product-editor__main/.test(page) && /gaming-product-editor__media/.test(page)],
  ["supplier source is compact context", /gaming-product-source-note/.test(page)],
  ["media upload remains NEXT F Media", /Upload to NEXT F Media/.test(page) && /gaming_product_artwork/.test(page)],
  ["artwork preview is compact and responsive", /gaming-artwork-preview--compact/.test(page) && /aspect-ratio:16\/9/.test(css)],
  ["wide modal body scrolls while footer stays anchored", /modal--wide .*modal__body\{min-height:0;overflow:auto\}/.test(css.replace(/\n/g,""))],
  ["editor collapses to one column on narrow screens", /max-width:820px/.test(css) && /gaming-product-editor\{grid-template-columns:1fr\}/.test(css)],
  ["product save still flushes durable writes", /await flushDurableWrites\(\)/.test(page)],
];
let failed = 0;
for (const [name, pass] of checks) { console.log(`${pass ? "PASS" : "FAIL"}  ${name}`); if (!pass) failed += 1; }
console.log(`\n${checks.length - failed}/${checks.length} Gaming product-editor UI checks passed.`);
if (failed) process.exit(1);

import fs from "node:fs";

const files = {
  page: fs.readFileSync("src/gaming-store/vnext/cms/CatalogVNextPage.tsx", "utf8"),
  store: fs.readFileSync("src/gaming-store/vnext/runtime/store.ts", "utf8"),
  table: fs.readFileSync("src/shared/components/DataTable.tsx", "utf8"),
  css: fs.readFileSync("src/css/components.css", "utf8"),
};
const checks = [
  ["catalog has task-based product views", /Needs attention/.test(files.page) && /Featured/.test(files.page) && /Hidden/.test(files.page)],
  ["catalog search covers canonical identifiers", /Search product name, family, slug or ID/.test(files.page) && /product\.id/.test(files.page)],
  ["catalog filters use canonical kind", /kindFilter/.test(files.page) && /product\.kind/.test(files.page) && !/product\.category/.test(files.page)],
  ["product offer-count filters exist", /No offers/.test(files.page) && /1–5 offers/.test(files.page) && /20\+ offers/.test(files.page)],
  ["routing health filters exist", /Missing live route/.test(files.page) && /Multiple suppliers/.test(files.page)],
  ["catalog pagination is bounded", /PAGE_SIZES/.test(files.page) && /Page \{currentPage\} of \{totalPages\}/.test(files.page)],
  ["visible rows support selection", /Select visible rows/.test(files.page) && /catalog-row-check/.test(files.page)],
  ["bulk product visibility and featured actions exist", /Make public/.test(files.page) && /Unfeature/.test(files.page)],
  ["bulk offer visibility actions exist", /patch\.offers/.test(files.page) && /updateOffers/.test(files.store)],
  ["bulk route actions exist", /Enable routes/.test(files.page) && /updateMappings/.test(files.store)],
  ["bulk updates persist one canonical document write", /updateProducts\(ids/.test(files.store) && /write\(KEYS\.products, rows\)/.test(files.store)],
  ["bulk actions flush durable writes", /await flushDurableWrites\(\)/.test(files.page)],
  ["large tables have sticky headers", /catalog-workspace \.data-table th\{position:sticky/.test(files.css)],
  ["table header accepts interactive controls", /header:ReactNode/.test(files.table)],
  ["legacy v0.5 catalog is not referenced", !/nextf\.v0\.5\.gaming/.test(files.page)],
  ["canonical product editor remains available", /Edit NEXT F product/.test(files.page) && /Save product/.test(files.page)],
];
let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} Gaming catalog control-center checks passed.`);
if (failed) process.exit(1);

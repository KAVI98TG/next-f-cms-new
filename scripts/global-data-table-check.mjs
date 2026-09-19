import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
let passed=0, failed=0;
const check=(label,ok)=>{console.log(`${ok?"PASS":"FAIL"}  ${label}`); ok?passed++:failed++;};
const table=read("src/shared/components/DataTable.tsx");
const css=read("src/css/components.css");
const customer=read("src/gaming-store/customers/CustomersPage.tsx");
const responsive=read("src/css/responsive.css");

const tableFiles=[];
const walk=(dir)=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name);const stat=fs.statSync(full);if(stat.isDirectory())walk(full);else if(full.endsWith(".tsx")){const body=fs.readFileSync(full,"utf8");if(body.includes("DataTableColumn")||body.includes("<DataTable"))tableFiles.push([full,body]);}}};
walk(path.join(root,"src"));
const fixed=tableFiles.flatMap(([file,body])=>[...body.matchAll(/width\s*:\s*["']\d+px["']/g)].map((match)=>`${path.relative(root,file)}:${match[0]}`));

check("DataTable exposes semantic grow/content sizing",table.includes('sizing?:"grow"|"content"'));
check("DataTable infers a primary flexible column",table.includes("inferredGrow")&&table.includes("data-table__cell--grow"));
check("utility columns are content-sized",table.includes('new Set(["select","action","actions"])')&&table.includes("data-table__cell--utility"));
check("shared table uses intrinsic max-content sizing",css.includes(".data-table { width:max-content; min-width:100%;")&&css.includes("table-layout:auto"));
check("content columns collapse to their content",css.includes(".data-table__cell--content { width:1%; white-space:nowrap; }"));
check("primary column can consume remaining width",css.includes(".data-table__cell--grow { width:auto; min-width:180px; }"));
check("badges and actions do not wrap in tables",css.includes(".data-table td .badge")&&css.includes("white-space:nowrap"));
check("wide tables retain horizontal scrolling",css.includes(".data-table-wrap { width:100%; overflow:auto;"));
check("responsive CSS does not restore a fixed table width",!responsive.includes(".data-table { min-width:720px;"));
check("no DataTable page keeps fixed pixel column widths",fixed.length===0);
check("Customer 360 explicitly keeps identity as grow column",customer.includes("key:'customer',header:'Customer',sizing:'grow'"));
check("Customer 360 no longer has a fixed table minimum",!css.includes(".customer360-workspace .data-table{min-width:1050px}"));
check("Catalog no longer has a fixed table minimum",!css.includes(".catalog-workspace .data-table{min-width:980px}"));
check("Live Operations no longer has a fixed table minimum",!css.includes(".live-ops-table .data-table{min-width:920px}"));

console.log(`\n${passed}/${passed+failed} NEXT F global data-table checks passed.`);
if(fixed.length)console.log(`Fixed-width leftovers:\n${fixed.join("\n")}`);
if(failed)process.exit(1);

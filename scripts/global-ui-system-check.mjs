import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const base=read("src/css/base.css");
const components=read("src/css/components.css");
const tokens=read("src/css/tokens.css");
const badge=read("src/shared/components/Badge.tsx");
const checks=[
  ["scrollbars are styled for Firefox", base.includes("scrollbar-width: thin") && base.includes("scrollbar-color: var(--scrollbar-thumb)")],
  ["scrollbars are styled for WebKit", base.includes("::-webkit-scrollbar-track") && base.includes("::-webkit-scrollbar-thumb:hover")],
  ["scrollbar theme tokens include hover state", tokens.includes("--scrollbar-thumb-hover")],
  ["checkboxes use custom global appearance", base.includes('input[type="checkbox"]') && base.includes("appearance: none") && base.includes('input[type="checkbox"]:checked::before')],
  ["checkbox keyboard focus is preserved", base.includes('input[type="checkbox"]:focus-visible')],
  ["Badge supports reusable classes and data attributes", badge.includes("HTMLAttributes<HTMLSpanElement>") && badge.includes("...props")],
  ["shared badges retain semantic tone classes", components.includes(".badge--success") && components.includes(".badge--warning") && components.includes(".badge--danger")],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} global UI system checks passed.`);
if(failed)process.exit(1);

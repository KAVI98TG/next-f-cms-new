import fs from "node:fs";
import path from "node:path";

const read=(p)=>fs.readFileSync(p,"utf8");
const components=read("src/css/components.css");
const responsive=read("src/css/responsive.css");
const modal=read("src/shared/components/Modal.tsx");
const confirm=read("src/shared/components/ConfirmDialog.tsx");

const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):entry.isFile()&&entry.name.endsWith(".tsx")?[full]:[];
});
const sources=walk("src").map(read).join("\n");
const modalCount=(sources.match(/<Modal\b/g)||[]).length;
const confirmCount=(sources.match(/<ConfirmDialog\b/g)||[]).length;
const actionCount=(sources.match(/className="modal-actions"/g)||[]).length;

const checks=[];
const check=(name,ok)=>checks.push([name,Boolean(ok)]);
check("shared modal constrains viewport and scrolls body",components.includes("max-height:min(88vh,860px)")&&components.includes(".modal__body { min-height:0; padding:18px; overflow:auto;")&&components.includes("overscroll-behavior:contain"));
check("default editor modal has usable two-column width",components.includes("width:min(640px,calc(100vw - 40px))"));
check("confirmation dialogs remain compact",components.includes(".modal--confirm")&&confirm.includes('className="modal--confirm"'));
check("form grids align fields to content start",components.includes(".form-grid { display:grid; gap:15px; align-items:start; }")&&components.includes("align-content:start; align-self:start;"));
check("legacy in-body modal actions receive shared footer treatment",components.includes(".modal .modal-actions")&&components.includes("position:sticky")&&actionCount>=20);
check("native modal footer remains fixed outside scroll body",components.includes(".modal__footer")&&components.includes("flex:0 0 auto")&&components.includes("background:var(--modal-surface)"));
check("modal locks document scroll while open",modal.includes('document.body.style.overflow="hidden"')&&modal.includes("openModalCount"));
check("modal accessibility ids are unique per instance",modal.includes("useId")&&modal.includes("titleId")&&modal.includes("descriptionId"));
check("long textarea fields can use full modal row",components.includes(':has(> textarea.help-textarea) { grid-column:1/-1; }'));
check("mobile dialogs use viewport-safe dimensions",responsive.includes("max-height:calc(100dvh - 20px)")&&responsive.includes(".modal__footer .button,.modal .modal-actions .button"));
check("shared modal system covers CMS popup inventory",modalCount>=50&&confirmCount>=10);
check("wide specialist modals retain explicit layouts",components.includes(".modal--wide")&&components.includes(".promotion-builder-modal"));

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} global modal UI checks passed. Audited ${modalCount} Modal and ${confirmCount} ConfirmDialog usages (${actionCount} legacy action rows normalized by the shared shell).`);
if(failed)process.exit(1);

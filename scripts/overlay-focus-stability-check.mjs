import fs from "node:fs";

const modal=fs.readFileSync(new URL("../src/shared/components/Modal.tsx",import.meta.url),"utf8");
const drawer=fs.readFileSync(new URL("../src/shared/components/Drawer.tsx",import.meta.url),"utf8");
const hook=fs.readFileSync(new URL("../src/shared/components/useOverlayFocus.ts",import.meta.url),"utf8");
let failed=0;
const check=(name,ok)=>{console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed+=1;};
check("modal uses shared stable overlay focus manager",modal.includes("useOverlayFocus<HTMLElement>(open, onClose)"));
check("drawer uses shared stable overlay focus manager",drawer.includes("useOverlayFocus<HTMLElement>(open, onClose)"));
check("focus lifecycle depends only on open state",hook.includes("}, [open]);")&&!hook.includes("[open, onClose]"));
check("latest close callback is stored without restarting focus lifecycle",hook.includes("onCloseRef.current = onClose")&&hook.includes("onCloseRef.current()"));
check("initial focus skips close control when another control exists",hook.includes('!node.hasAttribute("data-overlay-close")'));
check("explicit autofocus remains supported",hook.includes('data-overlay-autofocus'));
check("modal close is a non-submit button",modal.includes('type="button"')&&modal.includes('data-overlay-close'));
check("drawer close is a non-submit button",drawer.includes('type="button"')&&drawer.includes('data-overlay-close'));
check("tab focus trap remains enabled",hook.includes('event.key !== "Tab"')&&hook.includes("last.focus()")&&hook.includes("first.focus()"));
check("escape closes through latest callback",hook.includes('event.key === "Escape"')&&hook.includes("onCloseRef.current()"));
if(failed){console.error(`\n${failed} overlay focus stability checks failed.`);process.exit(1);}
console.log("\nGlobal overlay focus stability checks passed.");

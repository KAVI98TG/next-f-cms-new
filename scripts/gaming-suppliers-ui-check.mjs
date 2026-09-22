import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/gaming-store/suppliers/SuppliersPage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/css/components.css', import.meta.url), 'utf8');

const checks = [
  ['supplier control page shell exists', page.includes('supplier-control-page')],
  ['supplier health strip exposes four summary cards', (page.match(/<MetricCard/g) || []).length >= 4],
  ['catalog settings panel uses operator wording', page.includes('Catalog settings') && page.includes('Supplier behavior') && !page.includes('Runtime & publishing')],
  ['catalog sync panel exists', page.includes('Catalog synchronization') && page.includes('Choose what FazerCards may import')],
  ['catalog families use selectable tiles', page.includes('supplier-kind-tile') && page.includes('aria-pressed={active}')],
  ['category tiles reuse semantic Gaming kind badges', page.includes('<GamingKindBadge kind={kind}/>')],
  ['save state shows only actionable dirty state', page.includes('Unsaved changes') && !page.includes('Configuration saved') && page.includes('Save changes')],
  ['preview and sync require saved configuration', page.includes("disabled={busy||!!pending||dirty||!selectedKindCount}")],
  ['health action remains available independently of draft state', page.includes("onClick={()=>run('health')}")],
  ['refresh status does not overwrite unsaved supplier configuration', page.includes('await refreshFazerStatus()') && !page.includes("await Promise.all([refreshFazerConfig(),refreshFazerStatus()])")],
  ['technical credential safeguard explainer is removed', !page.includes('supplier-safeguards-grid') && !page.includes('Supplier credentials stay out of the CMS browser')],
  ['supplier responsive control grid styling exists', css.includes('.supplier-control-grid') && css.includes('@media(max-width:1100px)')],
  ['supplier category tile styling exists', css.includes('.supplier-kind-tile.is-active')],
  ['supplier command hierarchy styling exists', css.includes('.supplier-command-grid') && css.includes('.supplier-save-bar')],
  ['pending request state is visible without worker terminology', page.includes('Request queued') && !page.includes('Worker request queued') && css.includes('.supplier-pending-state')],
];

let failures = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) failures += 1;
}
console.log(`\n${checks.length - failures}/${checks.length} Gaming supplier UI checks passed.`);
if (failures) process.exit(1);

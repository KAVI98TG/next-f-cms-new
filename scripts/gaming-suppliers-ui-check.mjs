import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/gaming-store/suppliers/SuppliersPage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/css/components.css', import.meta.url), 'utf8');

const checks = [
  ['supplier control page shell exists', page.includes('supplier-control-page')],
  ['supplier health strip exposes four summary cards', (page.match(/<MetricCard/g) || []).length >= 4],
  ['runtime and publishing panel exists', page.includes('Runtime & publishing') && page.includes('Production behavior')],
  ['catalog sync panel exists', page.includes('Catalog synchronization') && page.includes('Choose what FazerCards may import')],
  ['catalog families use selectable tiles', page.includes('supplier-kind-tile') && page.includes('aria-pressed={active}')],
  ['category tiles reuse semantic Gaming kind badges', page.includes('<GamingKindBadge kind={kind}/>')],
  ['save state distinguishes saved and unsaved configuration', page.includes('Unsaved changes') && page.includes('Configuration saved')],
  ['preview and sync require saved configuration', page.includes("disabled={busy||!!pending||dirty||!selectedKindCount}")],
  ['health action remains available independently of draft state', page.includes("onClick={()=>run('health')}")],
  ['refresh status does not overwrite unsaved supplier configuration', page.includes('await refreshFazerStatus()') && !page.includes("await Promise.all([refreshFazerConfig(),refreshFazerStatus()])")],
  ['supplier safeguards are compact and canonical', page.includes('supplier-safeguards-grid') && page.includes('No placeholder provider registry')],
  ['supplier responsive control grid styling exists', css.includes('.supplier-control-grid') && css.includes('@media(max-width:1100px)')],
  ['supplier category tile styling exists', css.includes('.supplier-kind-tile.is-active')],
  ['supplier command hierarchy styling exists', css.includes('.supplier-command-grid') && css.includes('.supplier-save-bar')],
  ['pending worker state is visible', page.includes('Worker request queued') && css.includes('.supplier-pending-state')],
];

let failures = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) failures += 1;
}
console.log(`\n${checks.length - failures}/${checks.length} Gaming supplier UI checks passed.`);
if (failures) process.exit(1);

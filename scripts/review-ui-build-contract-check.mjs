import fs from 'node:fs';
const page=fs.readFileSync(new URL('../src/gaming-store/reviews/ReviewsPage.tsx',import.meta.url),'utf8');
const toast=fs.readFileSync(new URL('../src/shared/feedback/ToastProvider.tsx',import.meta.url),'utf8');
const header=fs.readFileSync(new URL('../src/shared/components/SectionHeader.tsx',import.meta.url),'utf8');
const reviewCss=fs.readFileSync(new URL('../src/gaming-store/reviews/reviews-page.css',import.meta.url),'utf8');
let failed=0;
const check=(name,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed+=1;};
check('review page uses ToastInput.description',page.includes("description:decision==='approved'")&&page.includes("description:e instanceof Error?e.message"));
check('review page does not use unsupported ToastInput.message',!page.includes('message:decision=')&&!page.includes("message:e instanceof Error"));
check('review page uses SectionHeader action prop',page.includes(' action={<Button variant="secondary"'));
check('review page does not use unsupported SectionHeader actions prop',!page.includes(' actions={<Button'));
check('ToastInput contract exposes description',toast.includes('description?: string'));
check('SectionHeader contract exposes action',header.includes('action?: ReactNode'));
check('review moderation is inline and non-modal',!page.includes('<Modal')&&page.includes('gaming-review-inline-reject'));
check('review status filter is explicit and non-native',!page.includes('SelectInput')&&page.includes('gaming-review-filter'));
check('review workspace inherits the standard page gutters',page.includes('className="page gaming-reviews-page"'));
check('review sections keep deliberate vertical spacing',reviewCss.includes('margin-bottom: var(--review-section-gap)'));
if(failed){console.error(`\n${failed} review UI build-contract checks failed.`);process.exit(1);}
console.log('\nReview UI build-contract checks passed.');

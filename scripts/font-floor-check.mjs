import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const src=path.join(root,'src');
const tokenFile=path.join(src,'css','tokens.css');
const failures=[];
let declarations=0;

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) return walk(full);
    return [full];
  });
}

for(const file of walk(src)){
  if(!file.endsWith('.css')) continue;
  if(path.basename(file)==='gaming-public.css') continue; // Public storefront has a separate visual system.
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/font-size\s*:\s*([^;}{]+)/g)){
    declarations++;
    const expr=match[1].trim();
    for(const px of expr.matchAll(/([0-9]*\.?[0-9]+)px/g)){
      const value=Number(px[1]);
      if(value<12) failures.push(`${path.relative(root,file)}: font-size ${expr}`);
      if(value===13) failures.push(`${path.relative(root,file)}: 13px is outside the CMS type scale; use 12px microcopy or 14px readable copy`);
    }
    for(const rem of expr.matchAll(/([0-9]*\.?[0-9]+)rem/g)){
      if(Number(rem[1])<0.75) failures.push(`${path.relative(root,file)}: font-size ${expr}`);
    }
  }
}

const tokens=fs.readFileSync(tokenFile,'utf8');
if(!tokens.includes('--text-min: 12px;')) failures.push('src/css/tokens.css: missing --text-min: 12px design token');
if(!tokens.includes('--text-xs: 14px;')) failures.push('src/css/tokens.css: missing 14px shared secondary-copy token');

for(const file of walk(src)){
  if(!/\.(tsx?|jsx?)$/.test(file)) continue;
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/fontSize\s*:\s*["'`]([0-9]*\.?[0-9]+)px["'`]/g)){
    if(Number(match[1])<12) failures.push(`${path.relative(root,file)}: inline fontSize ${match[1]}px`);
  }
}

console.log('NEXT F internal CMS typography floor check');
console.log(`Scanned ${declarations} internal CMS CSS font-size declarations.`);
if(failures.length){
  for(const failure of failures) console.error(`FAIL  ${failure}`);
  console.error(`\n${failures.length} typography-floor violation${failures.length===1?'':'s'} found.`);
  process.exit(1);
}
console.log('PASS  minimum internal CMS font size is 12px');
console.log('PASS  normal secondary-copy token is 14px');
console.log('\n2/2 typography-floor checks passed.');

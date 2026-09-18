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
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/font-size\s*:\s*([^;}{]+)/g)){
    declarations++;
    const expr=match[1].trim();
    for(const px of expr.matchAll(/([0-9]*\.?[0-9]+)px/g)){
      if(Number(px[1])<10) failures.push(`${path.relative(root,file)}: font-size ${expr}`);
    }
    for(const rem of expr.matchAll(/([0-9]*\.?[0-9]+)rem/g)){
      if(Number(rem[1])<0.625) failures.push(`${path.relative(root,file)}: font-size ${expr}`);
    }
  }
}

const tokens=fs.readFileSync(tokenFile,'utf8');
if(!tokens.includes('--text-min: 10px;')) failures.push('src/css/tokens.css: missing --text-min: 10px design token');

// Inline font-size declarations are intentionally prohibited below the same floor.
for(const file of walk(src)){
  if(!/\.(tsx?|jsx?)$/.test(file)) continue;
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/fontSize\s*:\s*["'`]([0-9]*\.?[0-9]+)px["'`]/g)){
    if(Number(match[1])<10) failures.push(`${path.relative(root,file)}: inline fontSize ${match[1]}px`);
  }
}

console.log('NEXT F global typography floor check');
console.log(`Scanned ${declarations} CSS font-size declarations.`);
if(failures.length){
  for(const failure of failures) console.error(`FAIL  ${failure}`);
  console.error(`\n${failures.length} typography-floor violation${failures.length===1?'':'s'} found.`);
  process.exit(1);
}
console.log('PASS  minimum UI font size is 10px');
console.log('PASS  --text-min design token is 10px');
console.log('\n2/2 typography-floor checks passed.');

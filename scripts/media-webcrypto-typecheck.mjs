import fs from "node:fs";
const media=fs.readFileSync("infrastructure/cloudflare/src/media.ts","utf8");
const checks=[
  ["HMAC source is copied into ArrayBuffer",media.includes("const material=new ArrayBuffer(source.byteLength)")&&media.includes("new Uint8Array(material).set(source)")],
  ["WebCrypto importKey receives ArrayBuffer",media.includes('crypto.subtle.importKey("raw",material')],
  ["old ArrayBufferLike-prone direct Uint8Array import is gone",!media.includes('importKey("raw",material,{name:"HMAC"')||media.includes("const material=new ArrayBuffer")],
  ["AWS SigV4 flow remains intact",media.includes('AWS4-HMAC-SHA256')&&media.includes('const kDate=await hmac')&&media.includes('X-Amz-Signature')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} Media WebCrypto checks passed.`);if(failed)process.exit(1);

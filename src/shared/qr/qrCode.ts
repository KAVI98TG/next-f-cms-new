/**
 * Minimal QR encoder for payment addresses.
 * Byte mode, QR versions 1-5, error correction level M.
 * This keeps supplier payment QR generation entirely local to the CMS browser.
 */

type RsSpec = { version:number; dataCodewords:number; blocks:number; dataPerBlock:number; eccPerBlock:number; alignment:number[] };

const SPECS:RsSpec[]=[
  {version:1,dataCodewords:16,blocks:1,dataPerBlock:16,eccPerBlock:10,alignment:[]},
  {version:2,dataCodewords:28,blocks:1,dataPerBlock:28,eccPerBlock:16,alignment:[6,18]},
  {version:3,dataCodewords:44,blocks:1,dataPerBlock:44,eccPerBlock:26,alignment:[6,22]},
  {version:4,dataCodewords:64,blocks:2,dataPerBlock:32,eccPerBlock:18,alignment:[6,26]},
  {version:5,dataCodewords:86,blocks:2,dataPerBlock:43,eccPerBlock:24,alignment:[6,30]},
];

const GF_EXP=new Uint8Array(512);const GF_LOG=new Uint8Array(256);
(()=>{let x=1;for(let i=0;i<255;i+=1){GF_EXP[i]=x;GF_LOG[x]=i;x<<=1;if(x&0x100)x^=0x11d;}for(let i=255;i<512;i+=1)GF_EXP[i]=GF_EXP[i-255];})();
const gfMul=(a:number,b:number)=>a===0||b===0?0:GF_EXP[GF_LOG[a]+GF_LOG[b]];

function generator(degree:number){let poly=[1];for(let i=0;i<degree;i+=1){const next=new Array(poly.length+1).fill(0);for(let j=0;j<poly.length;j+=1){next[j]^=poly[j];next[j+1]^=gfMul(poly[j],GF_EXP[i]);}poly=next;}return poly;}
function ecc(data:number[],degree:number){const gen=generator(degree);const work=[...data,...new Array(degree).fill(0)];for(let i=0;i<data.length;i+=1){const factor=work[i];if(!factor)continue;for(let j=0;j<gen.length;j+=1)work[i+j]^=gfMul(gen[j],factor);}return work.slice(-degree);}

function appendBits(bits:number[],value:number,length:number){for(let i=length-1;i>=0;i-=1)bits.push((value>>>i)&1);}
function chooseSpec(byteLength:number){for(const spec of SPECS){const available=spec.dataCodewords*8;const required=4+8+byteLength*8; if(required<=available)return spec;}throw new Error('QR_PAYMENT_ADDRESS_TOO_LONG');}
function dataCodewords(text:string,spec:RsSpec){const bytes=[...new TextEncoder().encode(text)];const bits:number[]=[];appendBits(bits,0b0100,4);appendBits(bits,bytes.length,8);for(const byte of bytes)appendBits(bits,byte,8);const capacity=spec.dataCodewords*8;for(let i=0;i<Math.min(4,capacity-bits.length);i+=1)bits.push(0);while(bits.length%8)bits.push(0);const result:number[]=[];for(let i=0;i<bits.length;i+=8){let value=0;for(let j=0;j<8;j+=1)value=(value<<1)|(bits[i+j]??0);result.push(value);}let pad=0;while(result.length<spec.dataCodewords){result.push(pad%2===0?0xec:0x11);pad+=1;}return result;}
function interleavedCodewords(data:number[],spec:RsSpec){const blocks:number[][]=[];const eccBlocks:number[][]=[];for(let i=0;i<spec.blocks;i+=1){const block=data.slice(i*spec.dataPerBlock,(i+1)*spec.dataPerBlock);blocks.push(block);eccBlocks.push(ecc(block,spec.eccPerBlock));}const out:number[]=[];for(let i=0;i<spec.dataPerBlock;i+=1)for(const block of blocks)out.push(block[i]);for(let i=0;i<spec.eccPerBlock;i+=1)for(const block of eccBlocks)out.push(block[i]);return out;}

function formatBits(mask:number){let data=mask;let d=data<<10;const g=0x537;while((31-Math.clz32(d))>=(31-Math.clz32(g)))d^=g<<((31-Math.clz32(d))-(31-Math.clz32(g)));return (((data<<10)|d)^0x5412)&0x7fff;}
function maskBit(mask:number,row:number,col:number){switch(mask){case 0:return (row+col)%2===0;case 1:return row%2===0;case 2:return col%3===0;case 3:return (row+col)%3===0;case 4:return (Math.floor(row/2)+Math.floor(col/3))%2===0;case 5:return ((row*col)%2)+((row*col)%3)===0;case 6:return ((((row*col)%2)+((row*col)%3))%2)===0;default:return ((((row+col)%2)+((row*col)%3))%2)===0;}}

type Cell=boolean|null;
function baseMatrix(spec:RsSpec){const size=spec.version*4+17;const matrix:Cell[][]=Array.from({length:size},()=>Array<Cell>(size).fill(null));const set=(r:number,c:number,v:boolean)=>{if(r>=0&&r<size&&c>=0&&c<size)matrix[r][c]=v;};
  const finder=(row:number,col:number)=>{for(let r=-1;r<=7;r+=1)for(let c=-1;c<=7;c+=1){if(row+r<0||row+r>=size||col+c<0||col+c>=size)continue;const on=r>=0&&r<=6&&c>=0&&c<=6&&(r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4));set(row+r,col+c,on);}};
  finder(0,0);finder(size-7,0);finder(0,size-7);
  for(const row of spec.alignment)for(const col of spec.alignment){if(matrix[row][col]!==null)continue;for(let r=-2;r<=2;r+=1)for(let c=-2;c<=2;c+=1)set(row+r,col+c,Math.max(Math.abs(r),Math.abs(c))!==1);}
  for(let i=8;i<size-8;i+=1){if(matrix[i][6]===null)set(i,6,i%2===0);if(matrix[6][i]===null)set(6,i,i%2===0);}
  // Reserve both format information copies.
  const reserve=[[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]];
  for(const [r,c] of reserve)set(r,c,false);
  for(let i=0;i<8;i+=1)set(8,size-1-i,false);
  for(let i=0;i<7;i+=1)set(size-1-i,8,false);
  set(size-8,8,true);
  return matrix;
}
function applyFormat(matrix:Cell[][],mask:number){const size=matrix.length;const bits=formatBits(mask);const bit=(i:number)=>((bits>>i)&1)===1;
  for(let i=0;i<15;i+=1){const value=bit(i);if(i<6)matrix[i][8]=value;else if(i<8)matrix[i+1][8]=value;else matrix[size-15+i][8]=value;}
  for(let i=0;i<15;i+=1){const value=bit(i);if(i<8)matrix[8][size-i-1]=value;else if(i<9)matrix[8][15-i]=value;else matrix[8][15-i-1]=value;}
  matrix[size-8][8]=true;
}
function placeData(matrix:Cell[][],codewords:number[],mask:number){const size=matrix.length;let byteIndex=0;let bitIndex=7;let upward=true;for(let col=size-1;col>0;col-=2){if(col===6)col-=1;for(let offset=0;offset<size;offset+=1){const row=upward?size-1-offset:offset;for(let c=0;c<2;c+=1){const x=col-c;if(matrix[row][x]!==null)continue;let dark=false;if(byteIndex<codewords.length)dark=((codewords[byteIndex]>>>bitIndex)&1)===1;if(maskBit(mask,row,x))dark=!dark;matrix[row][x]=dark;bitIndex-=1;if(bitIndex<0){byteIndex+=1;bitIndex=7;}}}upward=!upward;}}

function penalty(matrix:boolean[][]){const size=matrix.length;let score=0;for(let r=0;r<size;r+=1){let run=1;for(let c=1;c<size;c+=1){if(matrix[r][c]===matrix[r][c-1])run+=1;else{if(run>=5)score+=3+(run-5);run=1;}}if(run>=5)score+=3+(run-5);}for(let c=0;c<size;c+=1){let run=1;for(let r=1;r<size;r+=1){if(matrix[r][c]===matrix[r-1][c])run+=1;else{if(run>=5)score+=3+(run-5);run=1;}}if(run>=5)score+=3+(run-5);}for(let r=0;r<size-1;r+=1)for(let c=0;c<size-1;c+=1){const v=matrix[r][c];if(matrix[r+1][c]===v&&matrix[r][c+1]===v&&matrix[r+1][c+1]===v)score+=3;}const pattern=[true,false,true,true,true,false,true,false,false,false,false];const reverse=[false,false,false,false,true,false,true,true,true,false,true];for(let r=0;r<size;r+=1)for(let c=0;c<=size-11;c+=1){const row=matrix[r].slice(c,c+11);if(pattern.every((v,i)=>row[i]===v)||reverse.every((v,i)=>row[i]===v))score+=40;}for(let c=0;c<size;c+=1)for(let r=0;r<=size-11;r+=1){const col=Array.from({length:11},(_,i)=>matrix[r+i][c]);if(pattern.every((v,i)=>col[i]===v)||reverse.every((v,i)=>col[i]===v))score+=40;}let dark=0;for(const row of matrix)for(const v of row)if(v)dark+=1;score+=Math.floor(Math.abs((dark*100)/(size*size)-50)/5)*10;return score;}

export function createPaymentQrMatrix(text:string){const value=text.trim();if(!value)throw new Error('QR_PAYMENT_ADDRESS_REQUIRED');const bytes=new TextEncoder().encode(value);const spec=chooseSpec(bytes.length);const codewords=interleavedCodewords(dataCodewords(value,spec),spec);let best:boolean[][]|undefined;let bestScore=Infinity;for(let mask=0;mask<8;mask+=1){const matrix=baseMatrix(spec);placeData(matrix,codewords,mask);applyFormat(matrix,mask);const complete=matrix.map((row)=>row.map(Boolean));const score=penalty(complete);if(score<bestScore){bestScore=score;best=complete;}}if(!best)throw new Error('QR_GENERATION_FAILED');return best;}

export function paymentQrPath(matrix:boolean[][],cellSize=1,margin=4){const parts:string[]=[];for(let r=0;r<matrix.length;r+=1)for(let c=0;c<matrix.length;c+=1)if(matrix[r][c])parts.push(`M${(c+margin)*cellSize} ${(r+margin)*cellSize}h${cellSize}v${cellSize}h-${cellSize}z`);return parts.join('');}

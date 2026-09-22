import type { D1DatabaseLike, R2BucketLike, WorkerEnv } from "./env";

export const MEDIA_ASSET_NS = "nextf.media.asset";
const SUPPORT_CASE_NS = "gaming.support.case";

export type MediaPurpose = "gaming_product_artwork" | "gaming_family_artwork" | "gaming_family_hero" | "gaming_storefront_hero" | "gaming_storefront_video" | "support_evidence";
export type MediaVisibility = "public" | "private";
export type MediaAsset = {
  assetId: string;
  purpose: MediaPurpose;
  visibility: MediaVisibility;
  status: "upload_pending" | "ready" | "failed";
  objectKey: string;
  uploadObjectKey: string;
  fileName: string;
  contentType: string;
  declaredSizeBytes: number;
  sizeBytes?: number;
  etag?: string;
  publicUrl?: string;
  owner: { type: "gaming_product" | "gaming_family" | "gaming_storefront" | "support_case"; id: string; orderId?: string };
  createdAt: string;
  createdBy: string;
  uploadExpiresAt: string;
  finalizedAt?: string;
  failedAt?: string;
  failureCode?: string;
};

type Principal = { accountId:string; permissions:string[] };
type MediaDoc = { value:MediaAsset; version:number };
const enc = new TextEncoder();
const allowedImageTypes = new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const allowedEvidenceTypes = new Set([...allowedImageTypes,"application/pdf"]);
const allowedVideoTypes = new Set(["video/mp4","video/webm"]);

function has(principal:Principal, permission:string){ return principal.permissions.includes(permission); }
function clean(value:unknown, max=180){ return String(value ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0,max); }
function safeFileName(value:unknown){
  const raw=clean(value,160).replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"");
  return raw || "upload.bin";
}
function mediaOrigin(env:WorkerEnv){ return (env.MEDIA_ORIGIN || "https://media.nextf.lk").replace(/\/$/,""); }
function purposePolicy(purpose:MediaPurpose){
  if(purpose==="support_evidence") return { visibility:"private" as const, maxBytes:15*1024*1024, types:allowedEvidenceTypes, permission:"gaming.orders.manage", prefix:"private/support" };
  if(purpose==="gaming_storefront_video") return { visibility:"public" as const, maxBytes:50*1024*1024, types:allowedVideoTypes, permission:"gaming.products.manage", prefix:"public/gaming/video" };
  return { visibility:"public" as const, maxBytes:10*1024*1024, types:allowedImageTypes, permission:"gaming.products.manage", prefix:"public/gaming" };
}
function validPurpose(value:unknown):MediaPurpose|undefined{
  const v=clean(value,40);
  return ["gaming_product_artwork","gaming_family_artwork","gaming_family_hero","gaming_storefront_hero","gaming_storefront_video","support_evidence"].includes(v)?v as MediaPurpose:undefined;
}
function ownerFor(purpose:MediaPurpose,input:Record<string,unknown>){
  const ownerId=clean(input.ownerId,180); if(!ownerId) throw new Error("MEDIA_OWNER_REQUIRED");
  if(purpose==="gaming_product_artwork") return {type:"gaming_product" as const,id:ownerId};
  if(purpose==="gaming_family_artwork"||purpose==="gaming_family_hero") return {type:"gaming_family" as const,id:ownerId};
  if(purpose==="gaming_storefront_hero"||purpose==="gaming_storefront_video") return {type:"gaming_storefront" as const,id:ownerId};
  return {type:"support_case" as const,id:ownerId,orderId:clean(input.orderId,180)||undefined};
}
async function getAsset(db:D1DatabaseLike, assetId:string):Promise<MediaDoc|null>{
  const row=await db.prepare("SELECT payload_json,version FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1").bind(MEDIA_ASSET_NS,assetId).first<{payload_json:string;version:number}>();
  if(!row)return null;
  try{return{value:JSON.parse(row.payload_json) as MediaAsset,version:Number(row.version||0)}}catch{return null;}
}
async function createAsset(db:D1DatabaseLike, asset:MediaAsset){
  const now=asset.createdAt;
  await db.prepare("INSERT INTO app_documents(namespace,id,version,payload_json,created_at,updated_at) VALUES(?,?,1,?,?,?)").bind(MEDIA_ASSET_NS,asset.assetId,JSON.stringify(asset),now,now).run();
}
async function updateAsset(db:D1DatabaseLike, doc:MediaDoc, next:MediaAsset){
  const result=await db.prepare("UPDATE app_documents SET payload_json=?,version=version+1,updated_at=? WHERE namespace=? AND id=? AND version=? AND deleted_at IS NULL").bind(JSON.stringify(next),new Date().toISOString(),MEDIA_ASSET_NS,next.assetId,doc.version).run();
  const changes=Number((result.meta as any)?.changes ?? 0); if(changes!==1) throw new Error("MEDIA_VERSION_CONFLICT");
}
async function assertSupportOwner(db:D1DatabaseLike, caseId:string, orderId?:string){
  const row=await db.prepare("SELECT payload_json FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1").bind(SUPPORT_CASE_NS,caseId).first<{payload_json:string}>();
  if(!row) throw new Error("MEDIA_SUPPORT_CASE_NOT_FOUND");
  let support:any; try{support=JSON.parse(row.payload_json);}catch{throw new Error("MEDIA_SUPPORT_CASE_INVALID");}
  if(orderId && String(support?.orderId||"")!==orderId) throw new Error("MEDIA_SUPPORT_ORDER_MISMATCH");
  return String(support?.orderId||"");
}
function hex(bytes:ArrayBuffer|Uint8Array){ const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes); return [...a].map((b)=>b.toString(16).padStart(2,"0")).join(""); }
async function sha256(value:string){ return hex(await crypto.subtle.digest("SHA-256",enc.encode(value))); }
async function hmac(key:ArrayBuffer|Uint8Array,value:string){ const source=key instanceof Uint8Array?key:new Uint8Array(key); const material=new ArrayBuffer(source.byteLength); new Uint8Array(material).set(source); const k=await crypto.subtle.importKey("raw",material,{name:"HMAC",hash:"SHA-256"},false,["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC",k,enc.encode(value))); }
function awsEncode(value:string){ return encodeURIComponent(value).replace(/[!'()*]/g,(c)=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`); }
function canonicalPath(bucket:string,key:string){ return `/${awsEncode(bucket)}/${key.split("/").map(awsEncode).join("/")}`; }
async function presignedPut(env:WorkerEnv,key:string,contentType:string,expiresSeconds=300){
  const accountId=clean(env.NEXTF_MEDIA_R2_ACCOUNT_ID,100); const accessKeyId=clean(env.NEXTF_MEDIA_R2_ACCESS_KEY_ID,200); const secret=String(env.NEXTF_MEDIA_R2_SECRET_ACCESS_KEY||""); const bucket=clean(env.NEXTF_MEDIA_R2_BUCKET_NAME||"nextf-media-production",120);
  if(!accountId||!accessKeyId||!secret||!bucket) throw new Error("MEDIA_SIGNING_NOT_CONFIGURED");
  const now=new Date(); const amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,""); const date=amzDate.slice(0,8); const scope=`${date}/auto/s3/aws4_request`; const host=`${accountId}.r2.cloudflarestorage.com`; const path=canonicalPath(bucket,key);
  const params:Record<string,string>={"X-Amz-Algorithm":"AWS4-HMAC-SHA256","X-Amz-Content-Sha256":"UNSIGNED-PAYLOAD","X-Amz-Credential":`${accessKeyId}/${scope}`,"X-Amz-Date":amzDate,"X-Amz-Expires":String(expiresSeconds),"X-Amz-SignedHeaders":"content-type;host"};
  const canonicalQuery=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${awsEncode(k)}=${awsEncode(v)}`).join("&");
  const canonicalHeaders=`content-type:${contentType}\nhost:${host}\n`; const canonicalRequest=`PUT\n${path}\n${canonicalQuery}\n${canonicalHeaders}\ncontent-type;host\nUNSIGNED-PAYLOAD`; const stringToSign=`AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256(canonicalRequest)}`;
  const kDate=await hmac(enc.encode(`AWS4${secret}`),date); const kRegion=await hmac(kDate,"auto"); const kService=await hmac(kRegion,"s3"); const kSigning=await hmac(kService,"aws4_request"); const signature=hex(await hmac(kSigning,stringToSign));
  return {url:`https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`,expiresAt:new Date(now.getTime()+expiresSeconds*1000).toISOString()};
}
function authorizeAsset(principal:Principal,asset:MediaAsset){ const policy=purposePolicy(asset.purpose); if(!has(principal,policy.permission)) throw new Error("MEDIA_FORBIDDEN"); return policy; }

export async function createMediaUpload(env:WorkerEnv, principal:Principal, input:Record<string,unknown>){
  const purpose=validPurpose(input.purpose); if(!purpose) throw new Error("MEDIA_PURPOSE_INVALID");
  const policy=purposePolicy(purpose); if(!has(principal,policy.permission)) throw new Error("MEDIA_FORBIDDEN");
  const contentType=clean(input.contentType,100).toLowerCase(); if(!policy.types.has(contentType)) throw new Error("MEDIA_CONTENT_TYPE_INVALID");
  const sizeBytes=Math.floor(Number(input.sizeBytes)); if(!Number.isFinite(sizeBytes)||sizeBytes<1||sizeBytes>policy.maxBytes) throw new Error("MEDIA_SIZE_INVALID");
  const fileName=safeFileName(input.fileName); const owner=ownerFor(purpose,input); if(purpose==="support_evidence") owner.orderId=await assertSupportOwner(env.DB,owner.id,owner.orderId);
  const assetId=`nfm_${crypto.randomUUID()}`; const now=new Date(); const date=now.toISOString().slice(0,10).replaceAll("-",""); const objectKey=`${policy.prefix}/${purpose}/${date}/${assetId}/${fileName}`; const uploadObjectKey=`staging/${date}/${assetId}/${fileName}`;
  const signed=await presignedPut(env,uploadObjectKey,contentType,300); const asset:MediaAsset={assetId,purpose,visibility:policy.visibility,status:"upload_pending",objectKey,uploadObjectKey,fileName,contentType,declaredSizeBytes:sizeBytes,owner,createdAt:now.toISOString(),createdBy:principal.accountId,uploadExpiresAt:signed.expiresAt,...(policy.visibility==="public"?{publicUrl:`${mediaOrigin(env)}/a/${assetId}`}:{})};
  await createAsset(env.DB,asset);
  return {assetId,uploadUrl:signed.url,expiresAt:signed.expiresAt,contentType,publicUrl:asset.publicUrl,maxBytes:policy.maxBytes};
}

export async function finalizeMediaUpload(env:WorkerEnv, principal:Principal, input:Record<string,unknown>){
  const assetId=clean(input.assetId,180); if(!assetId) throw new Error("MEDIA_ASSET_REQUIRED"); const doc=await getAsset(env.DB,assetId); if(!doc) throw new Error("MEDIA_ASSET_NOT_FOUND"); const policy=authorizeAsset(principal,doc.value);
  if(doc.value.status==="ready") return doc.value;
  const uploaded=await env.MEDIA.get(doc.value.uploadObjectKey); if(!uploaded) throw new Error("MEDIA_OBJECT_NOT_FOUND");
  const actualSize=Number(uploaded.size||0); const actualType=clean(uploaded.httpMetadata?.contentType,100).toLowerCase();
  if(actualSize<1||actualSize>policy.maxBytes||actualSize!==doc.value.declaredSizeBytes||actualType!==doc.value.contentType){
    await env.MEDIA.delete(doc.value.uploadObjectKey);
    const failed:MediaAsset={...doc.value,status:"failed",failedAt:new Date().toISOString(),failureCode:"MEDIA_OBJECT_MISMATCH"}; await updateAsset(env.DB,doc,failed); throw new Error("MEDIA_OBJECT_MISMATCH");
  }
  await env.MEDIA.put(doc.value.objectKey,uploaded.body,{httpMetadata:{contentType:doc.value.contentType}});
  const promoted=await env.MEDIA.head(doc.value.objectKey); if(!promoted||Number(promoted.size||0)!==actualSize){ await env.MEDIA.delete(doc.value.objectKey); throw new Error("MEDIA_PROMOTION_FAILED"); }
  await env.MEDIA.delete(doc.value.uploadObjectKey);
  const ready:MediaAsset={...doc.value,status:"ready",sizeBytes:actualSize,etag:clean(promoted.httpEtag||uploaded.httpEtag,200)||undefined,finalizedAt:new Date().toISOString()}; await updateAsset(env.DB,doc,ready); return ready;
}

export async function getReadyMediaAsset(db:D1DatabaseLike,assetId:string){ const doc=await getAsset(db,assetId); return doc?.value.status==="ready"?doc.value:null; }

export async function servePublicMedia(request:Request,env:WorkerEnv,assetId:string){
  const asset=await getReadyMediaAsset(env.DB,assetId); if(!asset||asset.visibility!=="public") return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  const head=await env.MEDIA.head(asset.objectKey); if(!head) return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  const total=Number(head.size||asset.sizeBytes||0); const rangeHeader=request.headers.get("range"); let status=200; let object; let contentLength=total; let contentRange:string|undefined;
  if(rangeHeader&&/^bytes=\d*-\d*$/.test(rangeHeader)&&total>0){
    const raw=rangeHeader.slice(6); const [a,b]=raw.split("-"); let start=a?Number(a):NaN; let end=b?Number(b):NaN;
    if(Number.isNaN(start)&&!Number.isNaN(end)){const suffix=Math.min(total,end);start=Math.max(0,total-suffix);end=total-1;} else {if(Number.isNaN(start))start=0;if(Number.isNaN(end)||end>=total)end=total-1;}
    if(start<0||end<start||start>=total)return new Response(null,{status:416,headers:{"content-range":`bytes */${total}`,"accept-ranges":"bytes"}});
    const length=end-start+1; object=await env.MEDIA.get(asset.objectKey,{range:{offset:start,length}}); status=206; contentLength=length; contentRange=`bytes ${start}-${end}/${total}`;
  } else object=await env.MEDIA.get(asset.objectKey);
  if(!object)return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  const headers=new Headers(); headers.set("content-type",asset.contentType); headers.set("cache-control","public, max-age=31536000, immutable"); headers.set("x-content-type-options","nosniff"); headers.set("cross-origin-resource-policy","cross-origin"); headers.set("access-control-allow-origin","*"); headers.set("accept-ranges","bytes"); if(contentLength>0)headers.set("content-length",String(contentLength)); if(contentRange)headers.set("content-range",contentRange); if(object.httpEtag||head.httpEtag)headers.set("etag",object.httpEtag||head.httpEtag||"");
  return new Response(request.method==="HEAD"?null:object.body,{status,headers});
}

export async function servePrivateMedia(env:WorkerEnv,principal:Principal,assetId:string){
  const asset=await getReadyMediaAsset(env.DB,assetId); if(!asset||asset.visibility!=="private"||asset.purpose!=="support_evidence") return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  authorizeAsset(principal,asset); const object=await env.MEDIA.get(asset.objectKey); if(!object)return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  const headers=new Headers(); headers.set("content-type",asset.contentType); headers.set("content-length",String(asset.sizeBytes||0)); headers.set("cache-control","private, no-store"); headers.set("content-disposition",`${asset.contentType.startsWith("image/")||asset.contentType==="application/pdf"?"inline":"attachment"}; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`); headers.set("x-content-type-options","nosniff"); if(object.httpEtag)headers.set("etag",object.httpEtag);
  return new Response(object.body,{status:200,headers});
}

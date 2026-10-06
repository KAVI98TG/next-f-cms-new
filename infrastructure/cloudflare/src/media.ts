import type { D1DatabaseLike, WorkerEnv } from "./env";

export const MEDIA_ASSET_NS = "nextf.media.asset";

type LegacyPublicMediaAsset = {
  assetId:string;
  visibility:"public"|"private";
  status:"upload_pending"|"ready"|"failed";
  objectKey:string;
  fileName:string;
  contentType:string;
  sizeBytes?:number;
  etag?:string;
};

async function getReadyPublicMediaAsset(db:D1DatabaseLike,assetId:string):Promise<LegacyPublicMediaAsset|null>{
  const row=await db.prepare("SELECT payload_json FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1").bind(MEDIA_ASSET_NS,assetId).first<{payload_json:string}>();
  if(!row)return null;
  try{
    const asset=JSON.parse(row.payload_json) as LegacyPublicMediaAsset;
    return asset.status==="ready"&&asset.visibility==="public"?asset:null;
  }catch{return null;}
}

/**
 * Read-only compatibility delivery for already-published CMS media URLs.
 * New Gaming media uploads and all private support evidence are owned by Gaming Admin.
 */
export async function servePublicMedia(request:Request,env:WorkerEnv,assetId:string){
  const asset=await getReadyPublicMediaAsset(env.DB,assetId);
  if(!asset)return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  const head=await env.MEDIA.head(asset.objectKey);
  if(!head)return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  const total=Number(head.size||asset.sizeBytes||0);
  const rangeHeader=request.headers.get("range");
  let status=200;
  let object;
  let contentLength=total;
  let contentRange:string|undefined;
  if(rangeHeader&&/^bytes=\d*-\d*$/.test(rangeHeader)&&total>0){
    const raw=rangeHeader.slice(6);
    const [a,b]=raw.split("-");
    let start=a?Number(a):NaN;
    let end=b?Number(b):NaN;
    if(Number.isNaN(start)&&!Number.isNaN(end)){
      const suffix=Math.min(total,end);
      start=Math.max(0,total-suffix);
      end=total-1;
    }else{
      if(Number.isNaN(start))start=0;
      if(Number.isNaN(end)||end>=total)end=total-1;
    }
    if(start<0||end<start||start>=total)return new Response(null,{status:416,headers:{"content-range":`bytes */${total}`,"accept-ranges":"bytes"}});
    const length=end-start+1;
    object=await env.MEDIA.get(asset.objectKey,{range:{offset:start,length}});
    status=206;
    contentLength=length;
    contentRange=`bytes ${start}-${end}/${total}`;
  }else object=await env.MEDIA.get(asset.objectKey);
  if(!object)return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
  const headers=new Headers();
  headers.set("content-type",asset.contentType);
  headers.set("cache-control","public, max-age=31536000, immutable");
  headers.set("x-content-type-options","nosniff");
  headers.set("cross-origin-resource-policy","cross-origin");
  headers.set("access-control-allow-origin","*");
  headers.set("accept-ranges","bytes");
  if(contentLength>0)headers.set("content-length",String(contentLength));
  if(contentRange)headers.set("content-range",contentRange);
  if(object.httpEtag||head.httpEtag)headers.set("etag",object.httpEtag||head.httpEtag||"");
  return new Response(request.method==="HEAD"?null:object.body,{status,headers});
}

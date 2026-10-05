import type { WorkerEnv } from "./env";

const SUMMARY_NAMESPACE="cms.integration";
const SUMMARY_ID="gaming.summary";
const MAX_SUMMARY_BYTES=64*1024;

export type GamingSummary={
  generatedAt:string;
  store:"gaming";
  orders?:Record<string,number>;
  finance?:Record<string,number>;
  support?:Record<string,number>;
  suppliers?:Record<string,unknown>;
  promotions?:Record<string,number>;
  analytics?:Record<string,number>;
};

async function sha256(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,"0")).join("");
}

async function authorized(request:Request,env:WorkerEnv){
  const header=request.headers.get("authorization")||"";
  if(!header.startsWith("Bearer ")||!env.GAMING_SUMMARY_INGEST_TOKEN)return false;
  const token=header.slice(7).trim();
  return Boolean(token)&&(await sha256(token))===(await sha256(env.GAMING_SUMMARY_INGEST_TOKEN));
}

function validSummary(value:unknown):value is GamingSummary{
  if(!value||typeof value!=="object")return false;
  const row=value as Record<string,unknown>;
  return row.store==="gaming"&&typeof row.generatedAt==="string"&&Number.isFinite(Date.parse(row.generatedAt));
}

export async function ingestGamingSummary(request:Request,env:WorkerEnv,requestId:string){
  if(request.method!=="POST")return new Response(JSON.stringify({ok:false,problem:{code:"METHOD_NOT_ALLOWED",detail:"Gaming summary ingestion requires POST."}}),{status:405,headers:{"content-type":"application/json","cache-control":"no-store"}});
  if(!(await authorized(request,env)))return new Response(JSON.stringify({ok:false,problem:{code:"GAMING_SUMMARY_UNAUTHORIZED",detail:"Gaming summary credential is invalid."}}),{status:401,headers:{"content-type":"application/json","cache-control":"no-store"}});
  let summary:GamingSummary;
  try{
    const value=await request.json();
    if(!validSummary(value))throw new Error("invalid");
    summary=value;
  }catch{
    return new Response(JSON.stringify({ok:false,problem:{code:"GAMING_SUMMARY_INVALID",detail:"Gaming summary payload is invalid."}}),{status:400,headers:{"content-type":"application/json","cache-control":"no-store"}});
  }
  const payload=JSON.stringify(summary);
  if(new TextEncoder().encode(payload).byteLength>MAX_SUMMARY_BYTES)return new Response(JSON.stringify({ok:false,problem:{code:"GAMING_SUMMARY_TOO_LARGE",detail:"Gaming summary exceeds the accepted size."}}),{status:413,headers:{"content-type":"application/json","cache-control":"no-store"}});
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_documents(namespace,id,version,payload_json,created_at,updated_at,deleted_at)
      VALUES(?,?,1,?,?,?,NULL)
      ON CONFLICT(namespace,id) DO UPDATE SET payload_json=excluded.payload_json,version=app_documents.version+1,updated_at=excluded.updated_at,deleted_at=NULL`)
      .bind(SUMMARY_NAMESPACE,SUMMARY_ID,payload,now,now),
    env.DB.prepare("INSERT INTO audit_events(id,action,principal_kind,principal_id,target_type,target_id,outcome,request_id,correlation_id,detail,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),"gaming.summary.ingest","service","nextf-gaming-admin","gaming.summary",SUMMARY_ID,"success",requestId,requestId,JSON.stringify({generatedAt:summary.generatedAt}),now),
  ]);
  return new Response(JSON.stringify({ok:true,data:{accepted:true,generatedAt:summary.generatedAt}}),{status:202,headers:{"content-type":"application/json","cache-control":"no-store"}});
}

export async function readGamingSummary(env:WorkerEnv):Promise<GamingSummary|null>{
  const row=await env.DB.prepare("SELECT payload_json FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1").bind(SUMMARY_NAMESPACE,SUMMARY_ID).first<{payload_json:string}>();
  if(!row)return null;
  try{return JSON.parse(row.payload_json) as GamingSummary;}catch{return null;}
}

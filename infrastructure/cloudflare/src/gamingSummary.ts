import type { WorkerEnv } from './env';
import { json, problem } from './http';

type GamingSummaryEnvelope = {
  schemaVersion: 1;
  generatedAt: string;
  source: 'nextf-gaming-admin';
  commerce?: {
    orders?: number;
    completed?: number;
    netSalesLkr?: number;
    estimatedMarginLkr?: number;
  };
  operations?: {
    needsAttention?: number;
    paymentReview?: number;
    fulfillmentAttention?: number;
    riskHeld?: number;
    supportOpen?: number;
  };
  supplier?: {
    providerKey?: string;
    connected?: boolean;
    balanceAmount?: string;
    balanceCurrency?: string;
    lastHealthAt?: string;
    lastSyncAt?: string;
  };
  alerts?: Array<{ code:string; severity:'info'|'warning'|'critical'; message:string }>;
};

async function sha256(value:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,'0')).join('');
}

async function authorized(request:Request,env:WorkerEnv){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer ')||!env.GAMING_SUMMARY_INGEST_TOKEN)return false;
  const supplied=header.slice(7).trim();
  return supplied.length>0&&(await sha256(supplied))===(await sha256(env.GAMING_SUMMARY_INGEST_TOKEN));
}

function finite(value:unknown){return value===undefined||value===null||Number.isFinite(Number(value));}
function valid(input:unknown):input is GamingSummaryEnvelope{
  if(!input||typeof input!=='object')return false;
  const row=input as Record<string,any>;
  if(row.schemaVersion!==1||row.source!=='nextf-gaming-admin'||typeof row.generatedAt!=='string'||Number.isNaN(Date.parse(row.generatedAt)))return false;
  if(row.alerts!==undefined&&(!Array.isArray(row.alerts)||row.alerts.length>25))return false;
  const commerce=row.commerce||{};
  if(!['orders','completed','netSalesLkr','estimatedMarginLkr'].every((key)=>finite(commerce[key])))return false;
  return true;
}

export async function handleGamingSummary(request:Request,env:WorkerEnv,requestId:string){
  if(request.method!=='POST')return problem(405,'METHOD_NOT_ALLOWED','Gaming summary ingest requires POST',requestId);
  if(!(await authorized(request,env)))return problem(401,'GAMING_SUMMARY_UNAUTHORIZED','Gaming summary credential is invalid',requestId);
  const raw=await request.text();
  if(raw.length>65536)return problem(413,'GAMING_SUMMARY_TOO_LARGE','Gaming summary payload is too large',requestId);
  let payload:unknown;
  try{payload=JSON.parse(raw);}catch{return problem(400,'VALIDATION_FAILED','Gaming summary must be valid JSON',requestId);}
  if(!valid(payload))return problem(400,'VALIDATION_FAILED','Gaming summary payload does not match the supported contract',requestId);
  const now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO gaming_summary_snapshots(source_key,schema_version,generated_at,received_at,payload_json,updated_at)
    VALUES('gaming',1,?,?,?,?,?)
    ON CONFLICT(source_key) DO UPDATE SET
      schema_version=excluded.schema_version,
      generated_at=excluded.generated_at,
      received_at=excluded.received_at,
      payload_json=excluded.payload_json,
      updated_at=excluded.updated_at`)
    .bind(payload.generatedAt,now,JSON.stringify(payload),now).run();
  return json({ok:true,requestId,data:{accepted:true,source:'gaming',generatedAt:payload.generatedAt,receivedAt:now}},202);
}

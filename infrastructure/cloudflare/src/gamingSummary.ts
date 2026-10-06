import type { WorkerEnv } from "./env";

const SUMMARY_NAMESPACE="cms.integration";
const SUMMARY_ID="gaming.summary";
const MAX_SUMMARY_BYTES=16*1024;
const MAX_COUNT=10_000_000;
const MAX_MONEY=1_000_000_000_000;

export type GamingSummary={
  generatedAt:string;
  store:"gaming";
  orders:{total:number;completed:number;paymentReview:number;fulfillmentAttention:number};
  finance:{netSalesLkr:number;grossCollectedLkr:number;completedRefundsLkr:number;estimatedMarginLkr:number};
  support:{open:number;inProgress:number;urgent:number;slaBreached:number};
  suppliers:{fazercards:{connected:boolean;lastHealthAt:string|null}};
  promotions:{active:number;total:number};
  analytics:{orders:number;verifiedOrders:number;fulfilledOrders:number};
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

function object(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
function count(value:unknown){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(MAX_COUNT,Math.floor(n))):0;
}
function money(value:unknown){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(-MAX_MONEY,Math.min(MAX_MONEY,Math.round(n*100)/100)):0;
}
function isoOrNull(value:unknown){
  if(typeof value!=="string"||!Number.isFinite(Date.parse(value)))return null;
  return new Date(value).toISOString();
}
function normalizeSummary(value:unknown):GamingSummary|undefined{
  const root=object(value);
  if(root.store!=="gaming"||typeof root.generatedAt!=="string"||!Number.isFinite(Date.parse(root.generatedAt)))return undefined;
  const orders=object(root.orders);
  const finance=object(root.finance);
  const support=object(root.support);
  const suppliers=object(root.suppliers);
  const fazercards=object(suppliers.fazercards);
  const promotions=object(root.promotions);
  const analytics=object(root.analytics);
  return{
    generatedAt:new Date(root.generatedAt).toISOString(),
    store:"gaming",
    orders:{
      total:count(orders.total),
      completed:count(orders.completed),
      paymentReview:count(orders.paymentReview),
      fulfillmentAttention:count(orders.fulfillmentAttention),
    },
    finance:{
      netSalesLkr:money(finance.netSalesLkr),
      grossCollectedLkr:money(finance.grossCollectedLkr),
      completedRefundsLkr:money(finance.completedRefundsLkr),
      estimatedMarginLkr:money(finance.estimatedMarginLkr),
    },
    support:{
      open:count(support.open),
      inProgress:count(support.inProgress),
      urgent:count(support.urgent),
      slaBreached:count(support.slaBreached),
    },
    suppliers:{fazercards:{connected:fazercards.connected===true,lastHealthAt:isoOrNull(fazercards.lastHealthAt)}},
    promotions:{active:count(promotions.active),total:count(promotions.total)},
    analytics:{
      orders:count(analytics.orders),
      verifiedOrders:count(analytics.verifiedOrders),
      fulfilledOrders:count(analytics.fulfilledOrders),
    },
  };
}

export async function ingestGamingSummary(request:Request,env:WorkerEnv,requestId:string){
  const headers={"content-type":"application/json","cache-control":"no-store"};
  if(request.method!=="POST")return new Response(JSON.stringify({ok:false,problem:{code:"METHOD_NOT_ALLOWED",detail:"Gaming summary ingestion requires POST."}}),{status:405,headers});
  if(!(await authorized(request,env)))return new Response(JSON.stringify({ok:false,problem:{code:"GAMING_SUMMARY_UNAUTHORIZED",detail:"Gaming summary credential is invalid."}}),{status:401,headers});
  const declared=Number(request.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>MAX_SUMMARY_BYTES)return new Response(JSON.stringify({ok:false,problem:{code:"GAMING_SUMMARY_TOO_LARGE",detail:"Gaming summary exceeds the accepted size."}}),{status:413,headers});
  let summary:GamingSummary;
  try{
    const raw=await request.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_SUMMARY_BYTES)return new Response(JSON.stringify({ok:false,problem:{code:"GAMING_SUMMARY_TOO_LARGE",detail:"Gaming summary exceeds the accepted size."}}),{status:413,headers});
    const normalized=normalizeSummary(JSON.parse(raw));
    if(!normalized)throw new Error("invalid");
    summary=normalized;
  }catch{
    return new Response(JSON.stringify({ok:false,problem:{code:"GAMING_SUMMARY_INVALID",detail:"Gaming summary payload is invalid."}}),{status:400,headers});
  }
  const payload=JSON.stringify(summary);
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_documents(namespace,id,version,payload_json,created_at,updated_at,deleted_at)
      VALUES(?,?,1,?,?,?,NULL)
      ON CONFLICT(namespace,id) DO UPDATE SET payload_json=excluded.payload_json,version=app_documents.version+1,updated_at=excluded.updated_at,deleted_at=NULL`)
      .bind(SUMMARY_NAMESPACE,SUMMARY_ID,payload,now,now),
    env.DB.prepare("INSERT INTO audit_events(id,action,principal_kind,principal_id,target_type,target_id,outcome,request_id,correlation_id,detail,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),"gaming.summary.ingest","service","nextf-gaming-admin","gaming.summary",SUMMARY_ID,"success",requestId,requestId,JSON.stringify({generatedAt:summary.generatedAt}),now),
  ]);
  return new Response(JSON.stringify({ok:true,data:{accepted:true,generatedAt:summary.generatedAt}}),{status:202,headers});
}

export async function readGamingSummary(env:WorkerEnv):Promise<GamingSummary|null>{
  const row=await env.DB.prepare("SELECT payload_json FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1").bind(SUMMARY_NAMESPACE,SUMMARY_ID).first<{payload_json:string}>();
  if(!row)return null;
  try{return normalizeSummary(JSON.parse(row.payload_json))||null;}catch{return null;}
}

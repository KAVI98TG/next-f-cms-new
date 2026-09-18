import type { D1DatabaseLike } from './env';

const CASE_NS='gaming.support.case';
const MESSAGE_NS='gaming.support.message';
const EVIDENCE_NS='gaming.support.evidence';
const ORDER_NS='gaming.public.order';
const FULFILLMENT_NS='gaming.fulfillment.job';
const REFUND_NS='gaming.refund';
const RISK_NS='gaming.risk.assessment';

type Principal={permissions:string[]};
function has(p:Principal,x:string){return p.permissions.includes(x);}
function parse<T>(v:string):T|undefined{try{return JSON.parse(v) as T;}catch{return undefined;}}
function text(v:unknown){return typeof v==='string'?v:'';}
function num(v:unknown){const n=Number(v);return Number.isFinite(n)?n:0;}
async function docs(db:D1DatabaseLike,ns:string,limit=500){const rows=await db.prepare('SELECT id,payload_json,version,created_at,updated_at FROM app_documents WHERE namespace=? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?').bind(ns,Math.max(1,Math.min(limit,500))).all<any>();return rows.results.map((row:any)=>({id:text(row.id),value:parse<any>(row.payload_json)||{},version:Number(row.version||0),createdAt:text(row.created_at),updatedAt:text(row.updated_at)}));}
function sla(caseRow:any){const now=Date.now();const first=Date.parse(text(caseRow?.sla?.firstResponseDueAt));const resolution=Date.parse(text(caseRow?.sla?.resolutionDueAt));const firstResponded=Boolean(caseRow?.sla?.firstRespondedAt);const terminal=['resolved','closed'].includes(text(caseRow?.status));return{policyVersion:Number(caseRow?.sla?.policyVersion||1),firstResponseDueAt:text(caseRow?.sla?.firstResponseDueAt),resolutionDueAt:text(caseRow?.sla?.resolutionDueAt),firstRespondedAt:text(caseRow?.sla?.firstRespondedAt)||undefined,resolvedAt:text(caseRow?.sla?.resolvedAt)||undefined,firstResponseBreached:!firstResponded&&Number.isFinite(first)&&first<now,resolutionBreached:!terminal&&Number.isFinite(resolution)&&resolution<now};}

export async function gamingSupportSnapshot(db:D1DatabaseLike,principal:Principal,supportConfigured:boolean){
  const [casesRaw,messagesRaw,evidenceRaw,ordersRaw,fulfillmentRaw,refundRaw,riskRaw]=await Promise.all([docs(db,CASE_NS),docs(db,MESSAGE_NS),docs(db,EVIDENCE_NS),docs(db,ORDER_NS),docs(db,FULFILLMENT_NS),docs(db,REFUND_NS),docs(db,RISK_NS)]);
  const orders=new Map(ordersRaw.map((row:any)=>[text(row.value.orderId||row.id),row.value]));
  const fulfillment=new Map(fulfillmentRaw.map((row:any)=>[text(row.value.orderId),row.value]));
  const refundsByOrder=new Map<string,any[]>();for(const row of refundRaw){const id=text(row.value.orderId);const arr=refundsByOrder.get(id)||[];arr.push(row.value);refundsByOrder.set(id,arr);}
  const riskByOrder=new Map(riskRaw.map((row:any)=>[text(row.value.orderId),row.value]));
  const cases=casesRaw.map((row:any)=>{const c=row.value||{};const order=orders.get(text(c.orderId))||{};const job=fulfillment.get(text(c.orderId));const refunds=refundsByOrder.get(text(c.orderId))||[];const risk=riskByOrder.get(text(c.orderId));return{
    caseId:text(c.caseId||row.id),caseNumber:text(c.caseNumber),orderId:text(c.orderId),orderNumber:text(c.orderNumber),category:text(c.category),subject:text(c.subject),priority:text(c.priority),status:text(c.status),assignee:c.assignee?.accountId?{accountId:text(c.assignee.accountId)}:undefined,sla:sla(c),createdAt:text(c.createdAt),createdBy:text(c.createdBy),updatedAt:text(c.updatedAt),updatedBy:text(c.updatedBy),
    orderContext:{productId:text(order.productId)||undefined,productName:text(order.productName),offerId:text(order.offerId)||undefined,offerName:text(order.offerName),customerEmail:text(order.customer?.email)||undefined,amountLkr:num(order.amountLkr),orderStatus:text(order.status),paymentState:text(order.payment?.state),fulfillmentState:text(job?.state)||undefined,refundStates:refunds.map((r:any)=>text(r.status)).filter(Boolean),risk:risk?{level:text(risk.level),state:text(risk.state),score:Number(risk.score||0)}:undefined,orderCreatedAt:text(order.createdAt)||undefined}
  };});
  const caseIds=new Set(cases.map((c:any)=>c.caseId));
  const messages=messagesRaw.map((row:any)=>row.value).filter((m:any)=>caseIds.has(text(m.caseId))).map((m:any)=>{const kind=['staff','customer','service'].includes(text(m.author?.kind))?text(m.author?.kind):'service';return{messageId:text(m.messageId),caseId:text(m.caseId),orderId:text(m.orderId),visibility:text(m.visibility),body:text(m.body),author:{kind,...(text(m.author?.accountId)?{accountId:text(m.author.accountId)}:{})},createdAt:text(m.createdAt)};});
  const evidence=evidenceRaw.map((row:any)=>row.value).filter((e:any)=>caseIds.has(text(e.caseId))).map((e:any)=>({evidenceId:text(e.evidenceId),caseId:text(e.caseId),orderId:text(e.orderId),kind:text(e.kind),label:text(e.label),reference:text(e.reference),sensitivity:text(e.sensitivity)==='support_private'?'support_private':'general',...(text(e.audience)?{audience:text(e.audience)}:{}),addedAt:text(e.addedAt),addedBy:text(e.addedBy)}));
  const active=cases.filter((c:any)=>!['resolved','closed'].includes(c.status));
  const ordersForSupport=ordersRaw.map((row:any)=>row.value||{}).map((order:any)=>({orderId:text(order.orderId),orderNumber:text(order.orderNumber),productName:text(order.productName),offerName:text(order.offerName),status:text(order.status),paymentState:text(order.payment?.state),amountLkr:num(order.amountLkr),createdAt:text(order.createdAt)})).filter((order:any)=>order.orderId).slice(0,500);
  return{source:'shared-d1' as const,generatedAt:new Date().toISOString(),capabilities:{manage:has(principal,'gaming.orders.manage')&&supportConfigured},summary:{total:cases.length,open:cases.filter((c:any)=>c.status==='open').length,inProgress:cases.filter((c:any)=>c.status==='in_progress').length,waitingCustomer:cases.filter((c:any)=>c.status==='waiting_customer').length,waitingInternal:cases.filter((c:any)=>c.status==='waiting_internal').length,urgent:active.filter((c:any)=>c.priority==='urgent').length,slaBreached:active.filter((c:any)=>c.sla.firstResponseBreached||c.sla.resolutionBreached).length},cases,messages,evidence,orders:ordersForSupport};
}

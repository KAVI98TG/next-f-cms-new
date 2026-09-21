import type { D1DatabaseLike } from "./env";

const ORDER_NS = "gaming.public.order";
const PAYMENT_PROOF_NS = "gaming.payment.proof";
const FULFILLMENT_NS = "gaming.fulfillment.job";
const REFUND_NS = "gaming.refund";
const RISK_NS = "gaming.risk.assessment";
const NOTIFICATION_NS = "gaming.notification.outbox";
const STAFF_NS = "cms.staff-state";
const PAYMENT_METHODS_KEY = "nextf.vnext.gaming.payment-methods";

type JsonRow = { payload_json:string; version:number; created_at:string; updated_at:string };

type GamingPrincipal = { permissions:string[] };
type GamingControlCapabilities = { paymentReview:boolean; fulfillmentRetry:boolean; refundManage:boolean; riskReview:boolean; notificationRetry:boolean };

function has(principal:GamingPrincipal, permission:string){ return principal.permissions.includes(permission); }
function parse<T>(value:string):T|undefined{ try{return JSON.parse(value) as T;}catch{return undefined;} }
function money(value:unknown){ const n=Number(value); return Number.isFinite(n)?n:0; }
function text(value:unknown){ return typeof value==="string"?value:""; }

function providerKey(method:any){
  if(method?.providerKey) return String(method.providerKey);
  if(method?.type==="ezycash") return "ezycash";
  if(method?.type==="bank_transfer") return "manual_bank";
  return "unknown";
}

function safeOrder(row:any){
  const payment=row?.payment||{};
  const method=payment?.method||{};
  return {
    orderId:text(row?.orderId), orderNumber:text(row?.orderNumber), productId:text(row?.productId), productName:text(row?.productName),
    offerId:text(row?.offerId), offerName:text(row?.offerName), status:text(row?.status), amountLkr:money(row?.amountLkr), quantity:Number(row?.quantity||1),
    ...(row?.requestedAmount===undefined?{}:{requestedAmount:Number(row.requestedAmount)}),
    customer:{ email:text(row?.customer?.email) },
    payment:{ state:text(payment?.state), providerKey:providerKey(payment), methodId:text(method?.id), methodLabel:text(method?.label), methodType:text(method?.type), latestProofId:text(payment?.latestProofId)||undefined },
    fulfillment:row?.fulfillment&&typeof row.fulfillment==="object"?{
      jobId:text(row.fulfillment.jobId)||undefined, mappingId:text(row.fulfillment.mappingId)||undefined, supplierId:text(row.fulfillment.supplierId)||undefined,
      providerKey:text(row.fulfillment.providerKey)||undefined, supplierOrderId:text(row.fulfillment.supplierOrderId)||undefined,
    }:undefined,
    routing:row?.routing&&typeof row.routing==="object"?row.routing:undefined,
    economics:row?.economics&&typeof row.economics==="object"?row.economics:undefined,
    promotion:row?.promotion&&typeof row.promotion==="object"?row.promotion:undefined,
    createdAt:text(row?.createdAt), updatedAt:text(row?.updatedAt),
  };
}

function safeProof(row:any, includeFinance:boolean){
  return {
    proofId:text(row?.proofId), orderId:text(row?.orderId), orderNumber:text(row?.orderNumber), amountLkr:money(row?.amountLkr),
    paymentMethodId:text(row?.paymentMethodId), paymentMethodLabel:text(row?.paymentMethodLabel), providerKey:row?.providerKey?text(row.providerKey):undefined,
    reference:text(row?.reference), status:text(row?.status), submittedAt:text(row?.submittedAt), reviewedAt:text(row?.reviewedAt)||undefined, reviewNote:text(row?.reviewNote)||undefined,
    ...(includeFinance&&row?.reconciliation?{reconciliation:{
      statementReference:text(row.reconciliation.statementReference), receivedAmountLkr:money(row.reconciliation.receivedAmountLkr), receivedAt:text(row.reconciliation.receivedAt), destinationConfirmed:Boolean(row.reconciliation.destinationConfirmed)
    }}:{}),
  };
}

function safeRefund(row:any){
  return {
    refundId:text(row?.refundId), orderId:text(row?.orderId), orderNumber:text(row?.orderNumber), amountLkr:money(row?.amountLkr), currency:text(row?.currency)||"LKR",
    status:text(row?.status), reasonCode:text(row?.reasonCode), reasonNote:text(row?.reasonNote)||undefined, paymentProviderKey:text(row?.paymentProviderKey),
    paymentMethodId:text(row?.paymentMethodId), paymentMethodLabel:text(row?.paymentMethodLabel), executionMode:text(row?.executionMode), orderStatusBeforeRefund:text(row?.orderStatusBeforeRefund),
    requestedAt:text(row?.requestedAt), requestedBy:text(row?.requestedBy), approvedAt:text(row?.approvedAt)||undefined, approvedBy:text(row?.approvedBy)||undefined,
    rejectedAt:text(row?.rejectedAt)||undefined, rejectedBy:text(row?.rejectedBy)||undefined, rejectionNote:text(row?.rejectionNote)||undefined,
    payout:row?.payout?{ providerReference:text(row.payout.providerReference), sentAt:text(row.payout.sentAt), sentBy:text(row.payout.sentBy), destinationConfirmed:Boolean(row.payout.destinationConfirmed) }:undefined,
    finance:row?.finance?{ supplierRecoveryLkr:money(row.finance.supplierRecoveryLkr), gatewayFeeRecoveredLkr:money(row.finance.gatewayFeeRecoveredLkr) }:undefined,
    completedAt:text(row?.completedAt)||undefined, completedBy:text(row?.completedBy)||undefined, updatedAt:text(row?.updatedAt),
  };
}


function safeNotification(row:any){
  return {
    notificationId:text(row?.notificationId), sourceEventId:text(row?.sourceEventId), sourceAction:text(row?.sourceAction), sourceOutcome:text(row?.sourceOutcome),
    orderId:text(row?.orderId), orderNumber:text(row?.orderNumber), channel:text(row?.channel)||"email", templateKey:text(row?.templateKey),
    recipient:{email:text(row?.recipient?.email)}, providerKey:text(row?.providerKey)||"disabled", state:text(row?.state), attempts:Number(row?.attempts||0),
    nextAttemptAt:text(row?.nextAttemptAt), providerMessageId:text(row?.providerMessageId)||undefined, sentAt:text(row?.sentAt)||undefined, deliveredAt:text(row?.deliveredAt)||undefined,
    delivery:row?.delivery&&typeof row.delivery==='object'?{state:text(row.delivery.state),providerEventId:text(row.delivery.providerEventId)||undefined,lastEventAt:text(row.delivery.lastEventAt),reason:text(row.delivery.reason)||undefined}:undefined,
    lastError:text(row?.lastError)||undefined, createdAt:text(row?.createdAt), updatedAt:text(row?.updatedAt),
  };
}

function safeRisk(row:any){
  const signals=Array.isArray(row?.signals)?row.signals:[];
  return {
    assessmentId:text(row?.assessmentId), orderId:text(row?.orderId), orderNumber:text(row?.orderNumber), score:Number(row?.score||0), level:text(row?.level), state:text(row?.state),
    requiresReview:Boolean(row?.requiresReview), holdRequired:Boolean(row?.holdRequired),
    signals:signals.map((signal:any)=>({code:text(signal?.code),weight:Number(signal?.weight||0),observedAt:text(signal?.observedAt),detail:signal?.detail&&typeof signal.detail==="object"?signal.detail:{}})),
    account:{authenticated:Boolean(row?.account?.authenticated),ageHours:row?.account?.ageHours===undefined?undefined:Number(row.account.ageHours),previousOrderCount:Number(row?.account?.previousOrderCount||0)},
    review:row?.review?{decision:text(row.review.decision),note:text(row.review.note)||undefined,reviewedAt:text(row.review.reviewedAt),reviewedBy:text(row.review.reviewedBy)}:undefined,
    createdAt:text(row?.createdAt), updatedAt:text(row?.updatedAt),
  };
}

function eventType(action:string,outcome:string){
  if(action==="gaming.checkout.create") return "ORDER_CREATED";
  if(action==="gaming.manual-payment.proof.submit") return "PAYMENT_SUBMITTED";
  if(action==="gaming.manual-payment.review") return outcome==="verified"?"PAYMENT_VERIFIED":"PAYMENT_REJECTED";
  if(action==="gaming.fulfillment.retry") return "FULFILLMENT_RETRY_QUEUED";
  if(action==="gaming.notification.sent") return "NOTIFICATION_SENT";
  if(action==="gaming.notification.error") return outcome==="retry"?"NOTIFICATION_RETRY_SCHEDULED":"NOTIFICATION_FAILED";
  if(action==="gaming.notification.retry") return "NOTIFICATION_RETRY_QUEUED";
  if(action==="gaming.refund.request") return "REFUND_REQUESTED";
  if(action==="gaming.refund.decision") return outcome==="approved"?"REFUND_APPROVED":"REFUND_REJECTED";
  if(action==="gaming.refund.sent") return "REFUND_SENT";
  if(action==="gaming.refund.complete") return "REFUND_COMPLETED";
  if(action==="gaming.risk.assessed") return "RISK_ASSESSED";
  if(action==="gaming.risk.review") return outcome==="released"?"RISK_RELEASED":"RISK_HELD";
  if(action==="gaming.risk.fulfillment-held") return "RISK_FULFILLMENT_HELD";
  if(action==="gaming.fulfillment.error") return "FULFILLMENT_ERROR";
  if(action==="gaming.fulfillment.update") {
    if(outcome==="completed") return "DELIVERED";
    if(outcome==="processing") return "SUPPLIER_PROCESSING";
    if(outcome==="failed") return "FULFILLMENT_FAILED";
    return "SUPPLIER_SENT";
  }
  if(action.startsWith("gaming.supplier.")) return "SUPPLIER_EVENT";
  if(action.startsWith("gaming.payment-methods.")) return "PAYMENT_CONFIGURATION_UPDATED";
  return action.replace(/^gaming\./,"").replace(/[^a-z0-9]+/gi,"_").toUpperCase();
}

function scopeFor(action:string){
  if(action.includes("refund")) return "refund";
  if(action.includes("risk")) return "risk";
  if(action.includes("payment")) return "payment";
  if(action.includes("fulfillment")) return "fulfillment";
  if(action.includes("supplier")) return "supplier";
  if(action.includes("notification")) return "notification";
  if(action.includes("promotion")) return "promotion";
  if(action.includes("support")) return "support";
  if(action.includes("checkout")||action.includes("order")) return "order";
  return "operations";
}

function safeEventDetail(detail:Record<string,unknown>, includeFinance:boolean){
  if(includeFinance) return detail;
  const { statementReference, statementReferenceNormalized, receivedAmountLkr, receivedAt, reconciliation, providerReference, supplierRecoveryLkr, gatewayFeeRecoveredLkr, rejectionNote, refundableRemainingBeforeLkr, subjectFingerprint, networkFingerprint, correlation, ...safe } = detail;
  void statementReference; void statementReferenceNormalized; void receivedAmountLkr; void receivedAt; void reconciliation; void providerReference; void supplierRecoveryLkr; void gatewayFeeRecoveredLkr; void rejectionNote; void refundableRemainingBeforeLkr; void subjectFingerprint; void networkFingerprint; void correlation;
  return safe;
}

async function docs<T>(db:D1DatabaseLike, namespace:string, limit=250){
  const rows=await db.prepare("SELECT payload_json,version,created_at,updated_at FROM app_documents WHERE namespace=? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?").bind(namespace,limit).all<JsonRow>();
  return rows.results.flatMap((row)=>{const value=parse<T>(row.payload_json);return value===undefined?[]:[{value,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}];});
}

async function paymentMethods(db:D1DatabaseLike){
  const row=await db.prepare("SELECT payload_json FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1").bind(STAFF_NS,PAYMENT_METHODS_KEY).first<{payload_json:string}>();
  const payload=row?parse<any>(row.payload_json):undefined;
  const methods=Array.isArray(payload)?payload:Array.isArray(payload?.methods)?payload.methods:[];
  return methods.map((method:any)=>({
    id:text(method?.id), type:text(method?.type), providerKey:providerKey(method), label:text(method?.label), enabled:method?.enabled!==false, sortOrder:Number(method?.sortOrder||0),
  })).sort((a:any,b:any)=>a.sortOrder-b.sortOrder);
}

export async function gamingOperationsSnapshot(db:D1DatabaseLike, principal:GamingPrincipal, control:GamingControlCapabilities={paymentReview:false,fulfillmentRetry:false,refundManage:false,riskReview:false,notificationRetry:false}){
  const includeFinance=has(principal,"gaming.finance.manage");
  const includeFulfillment=has(principal,"gaming.orders.manage")||has(principal,"gaming.suppliers.manage");
  const includeRisk=has(principal,"gaming.orders.manage");
  const [ordersRows,proofRows,jobRows,refundRows,riskRows,notificationRows,methodRows,auditRows]=await Promise.all([
    docs<any>(db,ORDER_NS,300),
    includeFinance?docs<any>(db,PAYMENT_PROOF_NS,300):Promise.resolve([]),
    includeFulfillment?docs<any>(db,FULFILLMENT_NS,300):Promise.resolve([]),
    includeFinance?docs<any>(db,REFUND_NS,300):Promise.resolve([]),
    includeRisk?docs<any>(db,RISK_NS,300):Promise.resolve([]),
    docs<any>(db,NOTIFICATION_NS,500),
    paymentMethods(db),
    db.prepare("SELECT id,action,principal_kind,principal_id,target_type,target_id,outcome,request_id,detail,created_at FROM audit_events WHERE action LIKE 'gaming.%' ORDER BY created_at DESC LIMIT 500").all<any>(),
  ]);
  const orders=ordersRows.map((item)=>safeOrder(item.value));
  const paymentProofs=proofRows.map((item)=>safeProof(item.value,includeFinance));
  const refunds=refundRows.map((item)=>safeRefund(item.value));
  const riskAssessments=riskRows.map((item)=>safeRisk(item.value));
  const notifications=notificationRows.map((item)=>safeNotification(item.value));
  const fulfillmentJobs=jobRows.map((item)=>({
    jobId:text(item.value?.jobId),orderId:text(item.value?.orderId),state:text(item.value?.state),attempts:Number(item.value?.attempts||0),nextAttemptAt:text(item.value?.nextAttemptAt),
    mappingId:text(item.value?.mappingId)||undefined,supplierId:text(item.value?.supplierId)||undefined,providerKey:text(item.value?.providerKey)||undefined,supplierOrderId:text(item.value?.supplierOrderId)||undefined,
    lastError:text(item.value?.lastError)||undefined,createdAt:text(item.value?.createdAt),updatedAt:text(item.value?.updatedAt),
  }));
  const events=auditRows.results.map((row:any)=>{
    const detail=parse<Record<string,unknown>>(row.detail)||{};
    const orderId=text(detail.orderId)||(row.target_type==="gaming.order"?text(row.target_id):"");
    return { id:text(row.id), eventType:eventType(text(row.action),text(row.outcome)), action:text(row.action), scope:scopeFor(text(row.action)), orderId:orderId||undefined, targetType:text(row.target_type), targetId:text(row.target_id), outcome:text(row.outcome), principalKind:text(row.principal_kind), principalId:text(row.principal_id), detail:safeEventDetail(detail,includeFinance), createdAt:text(row.created_at) };
  });
  const completed=orders.filter((order:any)=>order.status==="completed");
  const paymentReview=orders.filter((order:any)=>order.status==="payment_review"||order.payment?.state==="review_pending");
  const fulfillmentAttention=fulfillmentJobs.filter((job:any)=>["retry","blocked","failed"].includes(job.state));
  const summary={
    totalOrders:orders.length,
    paymentReview:paymentReview.length,
    paymentPending:orders.filter((order:any)=>order.status==="payment_pending").length,
    inFulfillment:orders.filter((order:any)=>["paid","validating","submitted","processing"].includes(order.status)).length,
    completed:completed.length,
    failed:orders.filter((order:any)=>order.status==="failed").length,
    refundPending:orders.filter((order:any)=>order.status==="refund_pending").length,
    pendingPaymentProofs:paymentProofs.filter((proof:any)=>proof.status==="pending_review").length,
    fulfillmentAttention:fulfillmentAttention.length,
    notificationAttention:notifications.filter((notification:any)=>["retry","blocked","failed"].includes(notification.state)).length,
    notificationPending:notifications.filter((notification:any)=>["pending","sending","retry"].includes(notification.state)).length,
    notificationSent:notifications.filter((notification:any)=>notification.state==="sent").length,
    ...(includeRisk?{riskReview:riskAssessments.filter((risk:any)=>["review","held"].includes(risk.state)).length,riskHeld:riskAssessments.filter((risk:any)=>risk.state==="held").length,riskHigh:riskAssessments.filter((risk:any)=>["high","critical"].includes(risk.level)).length}:{}),
    ...(includeFinance?(()=>{
      const verifiedOrders=orders.filter((order:any)=>order.payment?.state==="verified");
      const completedRefunds=refunds.filter((refund:any)=>refund.status==="completed");
      const activeRefunds=refunds.filter((refund:any)=>["requested","approved","sent"].includes(refund.status));
      const grossCollectedLkr=verifiedOrders.reduce((sum:number,order:any)=>sum+money(order.amountLkr),0);
      const completedRefundsLkr=completedRefunds.reduce((sum:number,refund:any)=>sum+money(refund.amountLkr),0);
      const pendingRefundsLkr=activeRefunds.reduce((sum:number,refund:any)=>sum+money(refund.amountLkr),0);
      const supplierCostLkr=verifiedOrders.filter((order:any)=>order.fulfillment?.supplierOrderId).reduce((sum:number,order:any)=>sum+money(order.economics?.supplierCostLkr),0);
      const gatewayFeesLkr=verifiedOrders.reduce((sum:number,order:any)=>sum+money(order.economics?.gatewayFeeLkr),0);
      const supplierRecoveriesLkr=completedRefunds.reduce((sum:number,refund:any)=>sum+money(refund.finance?.supplierRecoveryLkr),0);
      const gatewayFeeRecoveriesLkr=completedRefunds.reduce((sum:number,refund:any)=>sum+money(refund.finance?.gatewayFeeRecoveredLkr),0);
      return {
        grossSalesLkr:grossCollectedLkr-completedRefundsLkr,
        completedValueLkr:completed.reduce((sum:number,order:any)=>sum+money(order.amountLkr),0),
        grossCollectedLkr, completedRefundsLkr, pendingRefundsLkr, netSalesLkr:grossCollectedLkr-completedRefundsLkr,
        supplierCostLkr, gatewayFeesLkr, supplierRecoveriesLkr, gatewayFeeRecoveriesLkr,
        estimatedMarginLkr:grossCollectedLkr-completedRefundsLkr-supplierCostLkr+supplierRecoveriesLkr-gatewayFeesLkr+gatewayFeeRecoveriesLkr,
      };
    })():{}),
  };
  return { source:"shared-d1" as const, generatedAt:new Date().toISOString(), capabilities:{ finance:includeFinance, fulfillment:includeFulfillment, risk:includeRisk, paymentReview:includeFinance&&control.paymentReview, fulfillmentRetry:includeFulfillment&&control.fulfillmentRetry, refundManage:includeFinance&&control.refundManage, riskReview:includeRisk&&control.riskReview, notificationRetry:has(principal,"gaming.orders.manage")&&control.notificationRetry }, summary, orders, paymentProofs, fulfillmentJobs, refunds, riskAssessments, notifications, paymentMethods:methodRows, events };
}

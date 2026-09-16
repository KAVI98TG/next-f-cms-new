import { ProductionBackendClient } from "../../services/production/httpClient";
import { readProductionRuntimeConfig } from "../../services/production/runtime";
import { gamingStore } from "../data/gamingStore";

export type LiveGamingOrder = {
  orderId:string; orderNumber:string; productId:string; productName:string; offerId:string; offerName:string; status:string; amountLkr:number; quantity:number;
  requestedAmount?:number; customer:{email:string};
  payment:{state:string;providerKey:string;methodId:string;methodLabel:string;methodType:string;latestProofId?:string};
  fulfillment?:{jobId?:string;mappingId?:string;supplierId?:string;providerKey?:string;supplierOrderId?:string};
  routing?:Record<string,unknown>; economics?:Record<string,unknown>; createdAt:string; updatedAt:string;
};
export type LivePaymentProof={proofId:string;orderId:string;orderNumber:string;amountLkr:number;paymentMethodId:string;paymentMethodLabel:string;providerKey?:string;reference:string;status:string;submittedAt:string;reviewedAt?:string;reviewNote?:string;reconciliation?:{statementReference:string;receivedAmountLkr:number;receivedAt:string;destinationConfirmed:boolean}};
export type LiveFulfillmentJob={jobId:string;orderId:string;state:string;attempts:number;nextAttemptAt:string;mappingId?:string;supplierId?:string;providerKey?:string;supplierOrderId?:string;lastError?:string;createdAt:string;updatedAt:string};
export type LiveRefundRecord={refundId:string;orderId:string;orderNumber:string;amountLkr:number;currency:string;status:string;reasonCode:string;reasonNote?:string;paymentProviderKey:string;paymentMethodId:string;paymentMethodLabel:string;executionMode:string;orderStatusBeforeRefund:string;requestedAt:string;requestedBy:string;approvedAt?:string;approvedBy?:string;rejectedAt?:string;rejectedBy?:string;rejectionNote?:string;payout?:{providerReference:string;sentAt:string;sentBy:string;destinationConfirmed:boolean};finance?:{supplierRecoveryLkr?:number;gatewayFeeRecoveredLkr?:number};completedAt?:string;completedBy?:string;updatedAt:string};
export type LiveRiskSignal={code:string;weight:number;observedAt:string;detail:Record<string,unknown>};
export type LiveRiskAssessment={assessmentId:string;orderId:string;orderNumber:string;score:number;level:string;state:string;requiresReview:boolean;holdRequired:boolean;signals:LiveRiskSignal[];account:{authenticated:boolean;ageHours?:number;previousOrderCount:number};review?:{decision:string;note?:string;reviewedAt:string;reviewedBy:string};createdAt:string;updatedAt:string};
export type LiveGamingEvent={id:string;eventType:string;action:string;scope:string;orderId?:string;targetType:string;targetId:string;outcome:string;principalKind:string;principalId:string;detail:Record<string,unknown>;createdAt:string};
export type LiveNotificationRecord={notificationId:string;sourceEventId:string;sourceAction:string;sourceOutcome:string;orderId:string;orderNumber:string;channel:string;templateKey:string;recipient:{email:string};providerKey:string;state:string;attempts:number;nextAttemptAt:string;providerMessageId?:string;sentAt?:string;lastError?:string;createdAt:string;updatedAt:string};
export type LivePaymentMethod={id:string;type:string;providerKey:string;label:string;enabled:boolean;sortOrder:number};
export type LiveGamingOperationsSnapshot={
  source:"shared-d1"|"local-prototype"; generatedAt:string; capabilities:{finance:boolean;fulfillment:boolean;risk:boolean;paymentReview:boolean;fulfillmentRetry:boolean;refundManage:boolean;riskReview:boolean;notificationRetry:boolean};
  summary:{totalOrders:number;paymentReview:number;paymentPending:number;inFulfillment:number;completed:number;failed:number;refundPending:number;pendingPaymentProofs:number;fulfillmentAttention:number;notificationAttention:number;notificationPending:number;notificationSent:number;riskReview?:number;riskHeld?:number;riskHigh?:number;grossSalesLkr?:number;completedValueLkr?:number;grossCollectedLkr?:number;completedRefundsLkr?:number;pendingRefundsLkr?:number;netSalesLkr?:number;supplierCostLkr?:number;gatewayFeesLkr?:number;supplierRecoveriesLkr?:number;gatewayFeeRecoveriesLkr?:number;estimatedMarginLkr?:number};
  orders:LiveGamingOrder[]; paymentProofs:LivePaymentProof[]; fulfillmentJobs:LiveFulfillmentJob[]; refunds:LiveRefundRecord[]; riskAssessments:LiveRiskAssessment[]; notifications:LiveNotificationRecord[]; paymentMethods:LivePaymentMethod[]; events:LiveGamingEvent[];
};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==="production-api"?new ProductionBackendClient(runtime.apiBaseUrl):undefined;

function localSnapshot():LiveGamingOperationsSnapshot{
  const orders=gamingStore.getOrders();
  const products=gamingStore.getProducts();
  const suppliers=gamingStore.getSuppliers();
  const mapped:LiveGamingOrder[]=orders.map((order)=>{
    const product=products.find((row)=>row.id===order.productId);
    const supplier=suppliers.find((row)=>row.id===order.supplierId);
    const providerKey=supplier?.providerKey??"local";
    return {
      orderId:order.id,orderNumber:order.number,productId:order.productId,productName:product?.name??order.productId,offerId:order.supplierProductId,offerName:product?.storefrontLabel??product?.name??order.supplierProductId,status:order.status,amountLkr:order.sellingPrice,quantity:1,
      customer:{email:gamingStore.getCustomers().find((row)=>row.id===order.customerId)?.email??""},
      payment:{state:order.customerPaid?"verified":"awaiting_payment",providerKey:"manual_bank",methodId:"local-manual",methodLabel:"Local manual payment",methodType:"bank_transfer"},
      fulfillment:order.supplierOrderId?{jobId:`local-${order.id}`,supplierId:order.supplierId,providerKey,supplierOrderId:order.supplierOrderId}:undefined,
      routing:{supplierId:order.supplierId,providerKey},economics:{customerPriceLkr:order.sellingPrice,supplierCost:order.supplierCost,supplierCostLkr:order.supplierCostLkr,gatewayFeeLkr:order.gatewayFee,marginLkr:order.profit,capturedAt:order.createdAt},createdAt:order.createdAt,updatedAt:order.updatedAt,
    };
  });
  const fulfillmentJobs:LiveFulfillmentJob[]=mapped.filter((order)=>order.fulfillment?.jobId).map((order)=>({jobId:order.fulfillment!.jobId!,orderId:order.orderId,state:order.status==="completed"?"completed":order.status==="failed"?"failed":"processing",attempts:order.status==="failed"?2:1,nextAttemptAt:order.updatedAt,providerKey:order.fulfillment?.providerKey,supplierOrderId:order.fulfillment?.supplierOrderId,createdAt:order.createdAt,updatedAt:order.updatedAt}));
  const events:LiveGamingEvent[]=mapped.flatMap((order)=>[
    {id:`evt-${order.orderId}-created`,eventType:"ORDER_CREATED",action:"gaming.checkout.create",scope:"order",orderId:order.orderId,targetType:"gaming.order",targetId:order.orderId,outcome:"success",principalKind:"public",principalId:"local-customer",detail:{amountLkr:order.amountLkr},createdAt:order.createdAt},
    ...(order.payment.state==="verified"?[{id:`evt-${order.orderId}-paid`,eventType:"PAYMENT_VERIFIED",action:"gaming.manual-payment.review",scope:"payment",orderId:order.orderId,targetType:"gaming.order",targetId:order.orderId,outcome:"verified",principalKind:"service",principalId:"local-payment-admin",detail:{},createdAt:order.updatedAt} as LiveGamingEvent]:[]),
    ...(order.status==="completed"?[{id:`evt-${order.orderId}-done`,eventType:"DELIVERED",action:"gaming.fulfillment.update",scope:"fulfillment",orderId:order.orderId,targetType:"gaming.order",targetId:order.orderId,outcome:"completed",principalKind:"service",principalId:"local-fulfillment",detail:{},createdAt:order.updatedAt} as LiveGamingEvent]:[]),
  ]).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const refunds:LiveRefundRecord[]=mapped.filter((order)=>order.status==="refund_pending"||order.status==="refunded").map((order)=>({refundId:`local-refund-${order.orderId}`,orderId:order.orderId,orderNumber:order.orderNumber,amountLkr:order.amountLkr,currency:"LKR",status:order.status==="refunded"?"completed":"requested",reasonCode:"other",paymentProviderKey:order.payment.providerKey,paymentMethodId:order.payment.methodId,paymentMethodLabel:order.payment.methodLabel,executionMode:"manual_record",orderStatusBeforeRefund:"completed",requestedAt:order.updatedAt,requestedBy:"local-finance",completedAt:order.status==="refunded"?order.updatedAt:undefined,completedBy:order.status==="refunded"?"local-finance":undefined,updatedAt:order.updatedAt}));
  const grossCollectedLkr=mapped.filter((o)=>o.payment.state==="verified").reduce((sum,o)=>sum+o.amountLkr,0); const completedRefundsLkr=refunds.filter((r)=>r.status==="completed").reduce((sum,r)=>sum+r.amountLkr,0);
  return {source:"local-prototype",generatedAt:new Date().toISOString(),capabilities:{finance:true,fulfillment:true,risk:true,paymentReview:false,fulfillmentRetry:false,refundManage:false,riskReview:false,notificationRetry:false},summary:{totalOrders:mapped.length,paymentReview:0,paymentPending:mapped.filter((o)=>o.status==="payment_pending").length,inFulfillment:mapped.filter((o)=>["paid","validating","submitted","processing"].includes(o.status)).length,completed:mapped.filter((o)=>o.status==="completed").length,failed:mapped.filter((o)=>o.status==="failed").length,refundPending:mapped.filter((o)=>o.status==="refund_pending").length,pendingPaymentProofs:0,fulfillmentAttention:fulfillmentJobs.filter((job)=>["retry","blocked","failed"].includes(job.state)).length,notificationAttention:0,notificationPending:0,notificationSent:0,grossSalesLkr:grossCollectedLkr-completedRefundsLkr,completedValueLkr:mapped.filter((o)=>o.status==="completed").reduce((sum,o)=>sum+o.amountLkr,0),grossCollectedLkr,completedRefundsLkr,pendingRefundsLkr:refunds.filter((r)=>["requested","approved","sent"].includes(r.status)).reduce((sum,r)=>sum+r.amountLkr,0),netSalesLkr:grossCollectedLkr-completedRefundsLkr,supplierCostLkr:mapped.filter((o)=>o.fulfillment?.supplierOrderId).reduce((sum,o)=>sum+Number(o.economics?.supplierCostLkr??0),0),gatewayFeesLkr:mapped.filter((o)=>o.payment.state==="verified").reduce((sum,o)=>sum+Number(o.economics?.gatewayFeeLkr??0),0),estimatedMarginLkr:mapped.filter((o)=>o.payment.state==="verified").reduce((sum,o)=>sum+Number(o.economics?.marginLkr??0),0)-completedRefundsLkr,riskReview:0,riskHeld:0,riskHigh:0},orders:mapped,paymentProofs:[],fulfillmentJobs,refunds,riskAssessments:[],notifications:[],paymentMethods:[{id:"local-manual",type:"bank_transfer",providerKey:"manual_bank",label:"Local manual payment",enabled:true,sortOrder:10}],events};
}

export async function loadGamingOperationsSnapshot():Promise<LiveGamingOperationsSnapshot>{
  if(!client)return localSnapshot();
  const result=await client.execute<LiveGamingOperationsSnapshot>({operation:"staff.gaming.operations.snapshot.get",kind:"query",input:{}});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}


export type GamingPaymentReviewCommand={proofId:string;decision:"verified"|"rejected";note?:string;statementReference?:string;receivedAmountLkr?:number;receivedAt?:string;destinationConfirmed?:boolean};

export async function reviewGamingPayment(input:GamingPaymentReviewCommand){
  if(!client)throw new Error("Live payment review is available only through the production CMS API.");
  const result=await client.execute<{proofId:string;decision:string;order:Record<string,unknown>;replayed?:boolean}>({operation:"staff.gaming.payment.review",kind:"command",input,idempotencyKey:`gaming-payment-review:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

export async function retryGamingFulfillment(jobId:string){
  if(!client)throw new Error("Live fulfillment retry is available only through the production CMS API.");
  const result=await client.execute<{jobId:string;job:Record<string,unknown>;replayed?:boolean}>({operation:"staff.gaming.fulfillment.retry",kind:"command",input:{jobId},idempotencyKey:`gaming-fulfillment-retry:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}


export type GamingRefundCreateCommand={orderId:string;amountLkr:number;reasonCode:"fulfillment_failed"|"duplicate_payment"|"customer_request"|"operator_correction"|"other";reasonNote?:string};

export async function createGamingRefund(input:GamingRefundCreateCommand){
  if(!client)throw new Error("Live refund management is available only through the production CMS API.");
  const result=await client.execute<LiveRefundRecord>({operation:"staff.gaming.refund.create",kind:"command",input,idempotencyKey:`gaming-refund-create:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

export async function decideGamingRefund(refundId:string,decision:"approved"|"rejected",note?:string){
  if(!client)throw new Error("Live refund management is available only through the production CMS API.");
  const result=await client.execute<LiveRefundRecord>({operation:"staff.gaming.refund.decision",kind:"command",input:{refundId,decision,...(note?{note}:{})},idempotencyKey:`gaming-refund-decision:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

export async function markGamingRefundSent(input:{refundId:string;providerReference:string;sentAt:string;destinationConfirmed:true;supplierRecoveryLkr:number;gatewayFeeRecoveredLkr:number}){
  if(!client)throw new Error("Live refund management is available only through the production CMS API.");
  const result=await client.execute<LiveRefundRecord>({operation:"staff.gaming.refund.sent",kind:"command",input,idempotencyKey:`gaming-refund-sent:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

export async function completeGamingRefund(refundId:string){
  if(!client)throw new Error("Live refund management is available only through the production CMS API.");
  const result=await client.execute<{refund:LiveRefundRecord;order:Record<string,unknown>;totalRefundedLkr:number}>({operation:"staff.gaming.refund.complete",kind:"command",input:{refundId},idempotencyKey:`gaming-refund-complete:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}


export async function retryGamingNotification(notificationId:string){
  if(!client)throw new Error("Live notification retry is available only through the production CMS API.");
  const result=await client.execute<{notificationId:string;notification:LiveNotificationRecord;replayed?:boolean}>({operation:"staff.gaming.notification.retry",kind:"command",input:{notificationId},idempotencyKey:`gaming-notification-retry:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

export async function decideGamingRisk(assessmentId:string,decision:"release"|"keep_hold",note?:string){
  if(!client)throw new Error("Live risk review is available only through the production CMS API.");
  const result=await client.execute<{assessment:LiveRiskAssessment;order:Record<string,unknown>;fulfillmentQueued:boolean;replayed?:boolean}>({operation:"staff.gaming.risk.review",kind:"command",input:{assessmentId,decision,...(note?{note}:{})},idempotencyKey:`gaming-risk-review:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

import type { WorkerEnv } from "./env";

export class GamingControlError extends Error {
  constructor(public status:number, public code:string, message:string){ super(message); }
}

type UpstreamEnvelope<T> = { ok:true; data:T } | { ok:false; problem?:{ code?:string; detail?:string } };

function cleanText(value:unknown, max:number){ return typeof value==="string"?value.trim().slice(0,max):""; }
function requiredText(value:unknown, field:string, max=200){ const out=cleanText(value,max); if(!out) throw new GamingControlError(400,"VALIDATION_FAILED",`${field} is required`); return out; }
async function scopedGamingIdempotencyKey(scope:"funding-create"|"funding-verify"|"review-decision",sourceKey:string){
  if(!sourceKey.trim()) throw new GamingControlError(400,"IDEMPOTENCY_KEY_REQUIRED","Funding command requires an idempotency key");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(sourceKey));
  const fingerprint=[...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,"0")).join("");
  return `cms-gaming:${scope}:${fingerprint}`;
}
function apiBase(env:WorkerEnv){
  const base=(env.GAMING_API_ORIGIN||"").trim().replace(/\/$/,"");
  if(!base) throw new GamingControlError(503,"GAMING_CONTROL_NOT_CONFIGURED","Gaming control API origin is not configured");
  return base;
}

async function callGaming<T>(env:WorkerEnv, input:{path:string;token:string|undefined;body?:Record<string,unknown>;method?:"GET"|"POST";idempotencyKey?:string;requestId:string;correlationId:string;staffAccountId:string;staffUserId:string}){
  if(!input.token) throw new GamingControlError(503,"GAMING_CONTROL_NOT_CONFIGURED","Gaming control credential is not configured");
  const method=input.method??"POST";
  let response:Response;
  try{
    response=await fetch(`${apiBase(env)}${input.path}`,{
      method,
      headers:{
        "authorization":`Bearer ${input.token}`,
        "content-type":"application/json",
        "x-request-id":input.requestId,
        "x-correlation-id":input.correlationId,
        "x-nextf-staff-account-id":input.staffAccountId,
        "x-nextf-staff-user-id":input.staffUserId,
        ...(input.idempotencyKey?{"idempotency-key":input.idempotencyKey}:{}),
      },
      ...(method==="POST"?{body:JSON.stringify(input.body??{})}:{}),
    });
  }catch{
    throw new GamingControlError(502,"GAMING_CONTROL_UNAVAILABLE","Gaming control API could not be reached");
  }
  let payload:UpstreamEnvelope<T>|undefined;
  try{ payload=await response.json() as UpstreamEnvelope<T>; }catch{ payload=undefined; }
  if(!response.ok||!payload||payload.ok!==true){
    const problem=payload&&payload.ok===false?payload.problem:undefined;
    const status=response.status>=400&&response.status<600?response.status:502;
    throw new GamingControlError(status,cleanText(problem?.code,120)||"GAMING_CONTROL_FAILED",cleanText(problem?.detail,500)||`Gaming control API returned HTTP ${response.status}`);
  }
  return payload.data;
}

export type GamingPaymentReviewInput = {
  proofId:string;
  decision:"verified"|"rejected";
  note?:string;
  statementReference?:string;
  receivedAmountLkr?:number;
  receivedAt?:string;
  destinationConfirmed?:boolean;
};

export function validateGamingPaymentReview(value:Record<string,unknown>|undefined):GamingPaymentReviewInput{
  const proofId=requiredText(value?.proofId,"proofId",160);
  const decision=value?.decision;
  if(decision!=="verified"&&decision!=="rejected") throw new GamingControlError(400,"PAYMENT_DECISION_INVALID","Payment decision must be verified or rejected");
  const note=cleanText(value?.note,500);
  if(decision==="rejected") return {proofId,decision,...(note?{note}:{})};
  const statementReference=requiredText(value?.statementReference,"statementReference",120);
  const receivedAmountLkr=Number(value?.receivedAmountLkr);
  if(!Number.isFinite(receivedAmountLkr)||receivedAmountLkr<=0) throw new GamingControlError(400,"RECEIVED_AMOUNT_INVALID","receivedAmountLkr must be a positive number");
  const receivedAt=requiredText(value?.receivedAt,"receivedAt",80);
  if(Number.isNaN(Date.parse(receivedAt))) throw new GamingControlError(400,"RECEIVED_AT_INVALID","receivedAt must be a valid date/time");
  if(value?.destinationConfirmed!==true) throw new GamingControlError(400,"DESTINATION_CONFIRMATION_REQUIRED","Confirm the payment was credited to the selected NEXT F payment destination");
  return {proofId,decision,note:note||undefined,statementReference,receivedAmountLkr,receivedAt,destinationConfirmed:true};
}

export async function reviewGamingPayment(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingPaymentReview(value);
  const {proofId,...body}=input;
  const data=await callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/payment-proofs/${encodeURIComponent(proofId)}/decision`,token:env.GAMING_CMS_OPERATIONS_TOKEN,body,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
  return {proofId,decision:input.decision,order:data};
}

export function validateGamingFulfillmentRetry(value:Record<string,unknown>|undefined){
  return {jobId:requiredText(value?.jobId,"jobId",160)};
}

export async function retryGamingFulfillment(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingFulfillmentRetry(value);
  const data=await callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/fulfillment-jobs/${encodeURIComponent(input.jobId)}/retry`,token:env.GAMING_CMS_OPERATIONS_TOKEN,body:{},requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
  return {jobId:input.jobId,job:data};
}

export type GamingRefundCreateInput = {
  orderId:string;
  amountLkr:number;
  reasonCode:"fulfillment_failed"|"duplicate_payment"|"customer_request"|"operator_correction"|"other";
  reasonNote?:string;
};

const refundReasons=new Set(["fulfillment_failed","duplicate_payment","customer_request","operator_correction","other"]);

export function validateGamingRefundCreate(value:Record<string,unknown>|undefined):GamingRefundCreateInput{
  const orderId=requiredText(value?.orderId,"orderId",160);
  const amountLkr=Number(value?.amountLkr);
  if(!Number.isFinite(amountLkr)||amountLkr<=0) throw new GamingControlError(400,"REFUND_AMOUNT_INVALID","amountLkr must be a positive number");
  const reasonCode=cleanText(value?.reasonCode,80);
  if(!refundReasons.has(reasonCode)) throw new GamingControlError(400,"REFUND_REASON_INVALID","Select a valid refund reason");
  const reasonNote=cleanText(value?.reasonNote,500);
  return {orderId,amountLkr:Math.round(amountLkr*100)/100,reasonCode:reasonCode as GamingRefundCreateInput["reasonCode"],...(reasonNote?{reasonNote}:{})};
}

export async function createGamingRefund(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingRefundCreate(value);
  return callGaming<Record<string,unknown>>(env,{path:"/v1/gaming/admin/refunds",token:env.GAMING_CMS_OPERATIONS_TOKEN,body:input,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export function validateGamingRefundDecision(value:Record<string,unknown>|undefined){
  const refundId=requiredText(value?.refundId,"refundId",160);
  const decision=value?.decision;
  if(decision!=="approved"&&decision!=="rejected") throw new GamingControlError(400,"REFUND_DECISION_INVALID","Refund decision must be approved or rejected");
  const note=cleanText(value?.note,500);
  if(decision==="rejected"&&!note) throw new GamingControlError(400,"REFUND_REJECTION_NOTE_REQUIRED","A rejection note is required");
  return {refundId,decision,note:note||undefined};
}

export async function decideGamingRefund(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingRefundDecision(value);
  const {refundId,...body}=input;
  return callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/refunds/${encodeURIComponent(refundId)}/decision`,token:env.GAMING_CMS_OPERATIONS_TOKEN,body,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export function validateGamingRefundSent(value:Record<string,unknown>|undefined){
  const refundId=requiredText(value?.refundId,"refundId",160);
  const providerReference=requiredText(value?.providerReference,"providerReference",160);
  const sentAt=requiredText(value?.sentAt,"sentAt",80);
  if(Number.isNaN(Date.parse(sentAt))) throw new GamingControlError(400,"REFUND_SENT_AT_INVALID","sentAt must be a valid date/time");
  if(value?.destinationConfirmed!==true) throw new GamingControlError(400,"REFUND_DESTINATION_CONFIRMATION_REQUIRED","Confirm the refund was sent to the intended customer destination");
  const supplierRecoveryLkr=Number(value?.supplierRecoveryLkr??0);
  const gatewayFeeRecoveredLkr=Number(value?.gatewayFeeRecoveredLkr??0);
  if(!Number.isFinite(supplierRecoveryLkr)||supplierRecoveryLkr<0||!Number.isFinite(gatewayFeeRecoveredLkr)||gatewayFeeRecoveredLkr<0) throw new GamingControlError(400,"REFUND_RECOVERY_INVALID","Recovery amounts must be zero or positive numbers");
  return {refundId,providerReference,sentAt,destinationConfirmed:true,supplierRecoveryLkr:Math.round(supplierRecoveryLkr*100)/100,gatewayFeeRecoveredLkr:Math.round(gatewayFeeRecoveredLkr*100)/100};
}

export async function markGamingRefundSent(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingRefundSent(value);
  const {refundId,...body}=input;
  return callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/refunds/${encodeURIComponent(refundId)}/sent`,token:env.GAMING_CMS_OPERATIONS_TOKEN,body,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export function validateGamingRefundComplete(value:Record<string,unknown>|undefined){ return {refundId:requiredText(value?.refundId,"refundId",160)}; }

export async function completeGamingRefund(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingRefundComplete(value);
  return callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/refunds/${encodeURIComponent(input.refundId)}/complete`,token:env.GAMING_CMS_OPERATIONS_TOKEN,body:{},requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export type GamingRiskDecisionInput = { assessmentId:string; decision:"release"|"keep_hold"; note?:string };

export function validateGamingRiskDecision(value:Record<string,unknown>|undefined):GamingRiskDecisionInput{
  const assessmentId=requiredText(value?.assessmentId,"assessmentId",160);
  const decision=value?.decision;
  if(decision!=="release"&&decision!=="keep_hold") throw new GamingControlError(400,"RISK_DECISION_INVALID","Risk decision must be release or keep_hold");
  const note=cleanText(value?.note,500);
  return {assessmentId,decision,...(note?{note}:{})};
}

export async function decideGamingRisk(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingRiskDecision(value);
  const {assessmentId,...body}=input;
  return callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/risk-assessments/${encodeURIComponent(assessmentId)}/decision`,token:env.GAMING_CMS_OPERATIONS_TOKEN,body,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export async function getGamingNotificationHealth(env:WorkerEnv,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  return callGaming<Record<string,unknown>>(env,{path:'/v1/gaming/admin/notifications/health',token:env.GAMING_CMS_OPERATIONS_TOKEN,method:'GET',requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export function validateGamingNotificationRetry(value:Record<string,unknown>|undefined){ return {notificationId:requiredText(value?.notificationId,"notificationId",200)}; }

export async function retryGamingNotification(env:WorkerEnv, value:Record<string,unknown>|undefined, requestId:string, correlationId:string, staff:{accountId:string;staffUserId:string}){
  const input=validateGamingNotificationRetry(value);
  const data=await callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/notifications/${encodeURIComponent(input.notificationId)}/retry`,token:env.GAMING_CMS_OPERATIONS_TOKEN,body:{},requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
  return {notificationId:input.notificationId,notification:data};
}

export type GamingPromotionInput={
  campaignId?:string;name:string;status:'draft'|'active'|'paused'|'archived';applicationMode:'coupon'|'automatic';code?:string;discountType:'percent'|'fixed_lkr';discountValue:number;minSpendLkr:number;startAt?:string|null;endAt?:string|null;productIds:string[];offerIds:string[];maxRedemptions?:number|null;perCustomerLimit?:number|null;marginFloorLkr:number;
};
function cleanIds(value:unknown){return Array.isArray(value)?[...new Set(value.map((item)=>cleanText(item,160)).filter(Boolean))].slice(0,250):[];}
export function validateGamingPromotion(value:Record<string,unknown>|undefined,requireId=false):GamingPromotionInput{
  const campaignId=requireId?requiredText(value?.campaignId,'campaignId',160):cleanText(value?.campaignId,160)||undefined;
  const name=requiredText(value?.name,'name',120);
  const status=cleanText(value?.status,40);
  if(!['draft','active','paused','archived'].includes(status))throw new GamingControlError(400,'PROMOTION_STATUS_INVALID','Choose a valid campaign status');
  const applicationMode=cleanText(value?.applicationMode,40);
  if(!['coupon','automatic'].includes(applicationMode))throw new GamingControlError(400,'PROMOTION_MODE_INVALID','Choose coupon or automatic application');
  const code=applicationMode==='coupon'?requiredText(value?.code,'code',64).toUpperCase().replace(/\s+/g,''):undefined;
  const discountType=cleanText(value?.discountType,40);
  if(!['percent','fixed_lkr'].includes(discountType))throw new GamingControlError(400,'PROMOTION_DISCOUNT_TYPE_INVALID','Choose percent or fixed LKR discount');
  const discountValue=Number(value?.discountValue);
  if(!Number.isFinite(discountValue)||discountValue<=0||(discountType==='percent'&&discountValue>100))throw new GamingControlError(400,'PROMOTION_DISCOUNT_VALUE_INVALID','Enter a valid promotion discount');
  const minSpendLkr=Math.max(0,Number(value?.minSpendLkr||0)); const marginFloorLkr=Math.max(0,Number(value?.marginFloorLkr||0));
  if(!Number.isFinite(minSpendLkr)||!Number.isFinite(marginFloorLkr))throw new GamingControlError(400,'PROMOTION_MONEY_INVALID','Promotion money fields are invalid');
  const startAt=value?.startAt?cleanText(value.startAt,80):undefined; const endAt=value?.endAt?cleanText(value.endAt,80):undefined;
  if(startAt&&Number.isNaN(Date.parse(startAt)))throw new GamingControlError(400,'PROMOTION_START_INVALID','Campaign start time is invalid');
  if(endAt&&Number.isNaN(Date.parse(endAt)))throw new GamingControlError(400,'PROMOTION_END_INVALID','Campaign end time is invalid');
  const maxRedemptions=value?.maxRedemptions===null||value?.maxRedemptions===''?null:value?.maxRedemptions===undefined?undefined:Number(value.maxRedemptions);
  const perCustomerLimit=value?.perCustomerLimit===null||value?.perCustomerLimit===''?null:value?.perCustomerLimit===undefined?undefined:Number(value.perCustomerLimit);
  if(maxRedemptions!==undefined&&maxRedemptions!==null&&(!Number.isInteger(maxRedemptions)||maxRedemptions<=0))throw new GamingControlError(400,'PROMOTION_MAX_REDEMPTIONS_INVALID','Maximum redemptions must be a positive whole number');
  if(perCustomerLimit!==undefined&&perCustomerLimit!==null&&(!Number.isInteger(perCustomerLimit)||perCustomerLimit<=0))throw new GamingControlError(400,'PROMOTION_CUSTOMER_LIMIT_INVALID','Per-customer limit must be a positive whole number');
  return {...(campaignId?{campaignId}:{}),name,status:status as GamingPromotionInput['status'],applicationMode:applicationMode as GamingPromotionInput['applicationMode'],...(code?{code}:{}),discountType:discountType as GamingPromotionInput['discountType'],discountValue,minSpendLkr,startAt:startAt||null,endAt:endAt||null,productIds:cleanIds(value?.productIds),offerIds:cleanIds(value?.offerIds),maxRedemptions:maxRedemptions??null,perCustomerLimit:perCustomerLimit??null,marginFloorLkr};
}
export async function createGamingPromotion(env:WorkerEnv,value:Record<string,unknown>|undefined,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const input=validateGamingPromotion(value,false);
  return callGaming<Record<string,unknown>>(env,{path:'/v1/gaming/admin/promotions',token:env.GAMING_CMS_COMMERCE_TOKEN,body:input,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}
export async function updateGamingPromotion(env:WorkerEnv,value:Record<string,unknown>|undefined,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const input=validateGamingPromotion(value,true); const {campaignId,...body}=input;
  return callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/promotions/${encodeURIComponent(campaignId!)}`,token:env.GAMING_CMS_COMMERCE_TOKEN,body,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export type GamingSupportCreateInput={orderId:string;category:'payment'|'fulfillment'|'refund'|'account_details'|'delivery'|'promotion'|'duplicate_order'|'other';subject:string;priority:'normal'|'high'|'urgent';initialNote?:string};
const supportCategories=new Set(['payment','fulfillment','refund','account_details','delivery','promotion','duplicate_order','other']);
const supportPriorities=new Set(['normal','high','urgent']);
const supportStatuses=new Set(['open','in_progress','waiting_customer','waiting_internal','resolved','closed']);
export function validateGamingSupportCreate(value:Record<string,unknown>|undefined):GamingSupportCreateInput{
  const orderId=requiredText(value?.orderId,'orderId',180);const category=cleanText(value?.category,40);const subject=requiredText(value?.subject,'subject',160);const priority=cleanText(value?.priority,20)||'normal';const initialNote=cleanText(value?.initialNote,3000);
  if(!supportCategories.has(category))throw new GamingControlError(400,'SUPPORT_CATEGORY_INVALID','Choose a valid support category');
  if(subject.length<4)throw new GamingControlError(400,'SUPPORT_SUBJECT_REQUIRED','Support subject is too short');
  if(!supportPriorities.has(priority))throw new GamingControlError(400,'SUPPORT_PRIORITY_INVALID','Choose a valid support priority');
  return{orderId,category:category as GamingSupportCreateInput['category'],subject,priority:priority as GamingSupportCreateInput['priority'],...(initialNote?{initialNote}:{})};
}
export async function createGamingSupportCase(env:WorkerEnv,value:Record<string,unknown>|undefined,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const input=validateGamingSupportCreate(value);return callGaming<Record<string,unknown>>(env,{path:'/v1/gaming/admin/support-cases',token:env.GAMING_CMS_SUPPORT_TOKEN,body:input,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}
export function validateGamingSupportCommand(value:Record<string,unknown>|undefined){
  const caseId=requiredText(value?.caseId,'caseId',180);const action=cleanText(value?.action,40);
  if(!['assign_self','unassign','set_status','set_priority','add_internal_note','send_customer_message','add_evidence'].includes(action))throw new GamingControlError(400,'SUPPORT_ACTION_INVALID','Choose a valid support action');
  const body:Record<string,unknown>={action};
  if(action==='set_status'){const status=cleanText(value?.status,30);if(!supportStatuses.has(status))throw new GamingControlError(400,'SUPPORT_STATUS_INVALID','Choose a valid support status');body.status=status;}
  if(action==='set_priority'){const priority=cleanText(value?.priority,20);if(!supportPriorities.has(priority))throw new GamingControlError(400,'SUPPORT_PRIORITY_INVALID','Choose a valid support priority');body.priority=priority;}
  if(action==='add_internal_note'||action==='send_customer_message')body.body=requiredText(value?.body,'body',3000);
  if(action==='add_evidence'){const kind=cleanText(value?.kind,40);if(!['external_reference','customer_reference'].includes(kind))throw new GamingControlError(400,'SUPPORT_EVIDENCE_KIND_INVALID','Choose a valid support evidence type');body.kind=kind;body.label=requiredText(value?.label,'label',120);body.reference=requiredText(value?.reference,'reference',400);}
  return{caseId,body};
}
export async function commandGamingSupportCase(env:WorkerEnv,value:Record<string,unknown>|undefined,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const input=validateGamingSupportCommand(value);return callGaming<Record<string,unknown>>(env,{path:`/v1/gaming/admin/support-cases/${encodeURIComponent(input.caseId)}/command`,token:env.GAMING_CMS_SUPPORT_TOKEN,body:input.body,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

export type GamingFundingMethod={code:string;label:string;minAmountUsd:number;maxAmountUsd:number};
export type GamingFundingPayment={id:string;method?:string;network?:string;amount:string;uniqueAmount?:string|null;address?:string;memo?:string|null;binanceId?:string|null;displayName?:string|null;status:string;verifyAttempts:number;expiresAt?:string|null;completedAt?:string|null;cancelledAt?:string|null;createdAt?:string|null};
export type GamingFundingRecord={intentId:string;providerKey:"fazercards";method:string;amountUsd:number;state:"creating"|"pending"|"completed"|"cancelled"|"failed"|"uncertain";externalPaymentId?:string;payment?:GamingFundingPayment;requestedBy:string;lastError?:string;createdAt:string;updatedAt:string};
export type GamingFundingSnapshot={providerKey:"fazercards";balance?:{amount:string;currency:string};account?:{id:string|null;plan?:string|null};methods:GamingFundingMethod[];payments:GamingFundingRecord[];generatedAt:string};

function fundingStaff(staff:{accountId:string;staffUserId:string}){return{staffAccountId:staff.accountId,staffUserId:staff.staffUserId};}
export async function getGamingSupplierFundingSnapshot(env:WorkerEnv,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  return callGaming<GamingFundingSnapshot>(env,{path:"/v1/gaming/admin/supplier/fazercards/funding",token:env.GAMING_CMS_SUPPLIER_FUNDING_TOKEN,method:"GET",requestId,correlationId,...fundingStaff(staff)});
}
export async function getGamingSupplierFundingPayment(env:WorkerEnv,paymentId:string,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  return callGaming<GamingFundingRecord>(env,{path:`/v1/gaming/admin/supplier/fazercards/funding/payments/${encodeURIComponent(requiredText(paymentId,"paymentId",160))}`,token:env.GAMING_CMS_SUPPLIER_FUNDING_TOKEN,method:"GET",requestId,correlationId,...fundingStaff(staff)});
}
export async function createGamingSupplierFundingPayment(env:WorkerEnv,value:Record<string,unknown>|undefined,idempotencyKey:string,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const method=requiredText(value?.method,"method",40).toLowerCase();const amountUsd=Number(value?.amountUsd);
  if(!Number.isFinite(amountUsd)||amountUsd<=0||amountUsd>100000)throw new GamingControlError(400,"FUNDING_AMOUNT_INVALID","Enter a valid USD funding amount");
  const downstreamIdempotencyKey=await scopedGamingIdempotencyKey("funding-create",idempotencyKey);
  return callGaming<GamingFundingRecord>(env,{path:"/v1/gaming/admin/supplier/fazercards/funding/payments",token:env.GAMING_CMS_SUPPLIER_FUNDING_TOKEN,body:{method,amountUsd},idempotencyKey:downstreamIdempotencyKey,requestId,correlationId,...fundingStaff(staff)});
}
export async function verifyGamingSupplierFundingPayment(env:WorkerEnv,value:Record<string,unknown>|undefined,idempotencyKey:string,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const paymentId=requiredText(value?.paymentId,"paymentId",160);const binanceOrderId=requiredText(value?.binanceOrderId,"binanceOrderId",200);
  const downstreamIdempotencyKey=await scopedGamingIdempotencyKey("funding-verify",idempotencyKey);
  return callGaming<GamingFundingRecord>(env,{path:`/v1/gaming/admin/supplier/fazercards/funding/payments/${encodeURIComponent(paymentId)}/verify`,token:env.GAMING_CMS_SUPPLIER_FUNDING_TOKEN,body:{binanceOrderId},idempotencyKey:downstreamIdempotencyKey,requestId,correlationId,...fundingStaff(staff)});
}

export type GamingCustomerReview = {
  reviewId:string;accountId:string;orderId:string;orderNumber:string;productId?:string;productName?:string;rating:number;title:string;text:string;publicName:string;badge:"Verified purchase";status:"pending"|"approved"|"rejected";submittedAt:string;moderatedAt?:string;moderatedBy?:string;moderationNote?:string;publishedAt?:string;
};
export async function listGamingReviews(env:WorkerEnv,status:string,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const normalized=["all","pending","approved","rejected"].includes(status)?status:"all";
  return callGaming<{reviews:GamingCustomerReview[]}>(env,{path:`/v1/gaming/admin/reviews?status=${encodeURIComponent(normalized)}`,token:env.GAMING_CMS_COMMERCE_TOKEN,method:"GET",requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}
export async function decideGamingReview(env:WorkerEnv,value:Record<string,unknown>|undefined,idempotencyKey:string,requestId:string,correlationId:string,staff:{accountId:string;staffUserId:string}){
  const reviewId=requiredText(value?.reviewId,"reviewId",160);
  const decision=value?.decision;
  if(decision!=="approved"&&decision!=="rejected") throw new GamingControlError(400,"REVIEW_DECISION_INVALID","Review decision must be approved or rejected");
  const note=cleanText(value?.note,500);
  const downstreamIdempotencyKey=await scopedGamingIdempotencyKey("review-decision",idempotencyKey);
  return callGaming<GamingCustomerReview>(env,{path:`/v1/gaming/admin/reviews/${encodeURIComponent(reviewId)}/decision`,token:env.GAMING_CMS_COMMERCE_TOKEN,body:{decision,...(note?{note}:{})},idempotencyKey:downstreamIdempotencyKey,requestId,correlationId,staffAccountId:staff.accountId,staffUserId:staff.staffUserId});
}

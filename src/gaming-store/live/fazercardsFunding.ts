import { ProductionBackendClient } from '../../services/production/httpClient';
import type { ApiResult } from '../../services/backend/types';
import { readProductionRuntimeConfig } from '../../services/production/runtime';

export type FundingMethod={code:string;label:string;minAmountUsd:number;maxAmountUsd:number};
export type FundingPayment={id:string;method?:string;network?:string;amount:string;uniqueAmount?:string|null;address?:string;memo?:string|null;binanceId?:string|null;displayName?:string|null;status:string;verifyAttempts:number;expiresAt?:string|null;completedAt?:string|null;cancelledAt?:string|null;createdAt?:string|null};
export type FundingReconciliation={state:'pending'|'observed'|'review';expectedCreditUsd:number;observedBalanceDeltaUsd?:number;checkedAt?:string;note?:string};
export type FundingRecord={intentId:string;providerKey:'fazercards';method:string;amountUsd:number;state:'creating'|'pending'|'completed'|'cancelled'|'failed'|'uncertain';externalPaymentId?:string;payment?:FundingPayment;requestedBy:string;balanceBeforeUsd?:number;balanceAfterUsd?:number;reconciliation?:FundingReconciliation;lastError?:string;createdAt:string;updatedAt:string;replayed?:boolean};
export type FundingSnapshot={providerKey:'fazercards';balance?:{amount:string;currency:string};account?:{id:string|null;plan?:string|null};methods:FundingMethod[];payments:FundingRecord[];generatedAt:string};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==='production-api'?new ProductionBackendClient(runtime.apiBaseUrl):undefined;

function requireClient(){if(!client)throw new Error('Supplier funding is available only through the production CMS API');return client;}
function unwrap<T>(result:ApiResult<T>){if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);return result.data;}

export async function loadFazerFundingSnapshot(){
  const result=await requireClient().execute<FundingSnapshot>({operation:'staff.gaming.supplier.funding.snapshot.get',kind:'query',input:{}});
  return unwrap<FundingSnapshot>(result);
}
export async function refreshFazerFundingPayment(paymentId:string){
  const result=await requireClient().execute<FundingRecord>({operation:'staff.gaming.supplier.funding.payment.get',kind:'query',input:{paymentId}});
  return unwrap<FundingRecord>(result);
}
export async function createFazerFundingPayment(method:string,amountUsd:number){
  const result=await requireClient().execute<FundingRecord>({operation:'staff.gaming.supplier.funding.create',kind:'command',input:{method,amountUsd},idempotencyKey:`gaming-supplier-funding-create:${crypto.randomUUID()}`});
  return unwrap<FundingRecord>(result);
}
export async function verifyFazerBinancePayment(paymentId:string,binanceOrderId:string){
  const result=await requireClient().execute<FundingRecord>({operation:'staff.gaming.supplier.funding.verify',kind:'command',input:{paymentId,binanceOrderId},idempotencyKey:`gaming-supplier-funding-verify:${crypto.randomUUID()}`});
  return unwrap<FundingRecord>(result);
}

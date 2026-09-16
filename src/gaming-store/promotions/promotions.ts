import { ProductionBackendClient } from '../../services/production/httpClient';
import { readProductionRuntimeConfig } from '../../services/production/runtime';

export type GamingPromotionCampaign={
  campaignId:string;name:string;status:'draft'|'active'|'paused'|'archived';applicationMode:'coupon'|'automatic';code?:string;discountType:'percent'|'fixed_lkr';discountValue:number;minSpendLkr:number;startAt?:string;endAt?:string;productIds:string[];offerIds:string[];maxRedemptions?:number;perCustomerLimit?:number;marginFloorLkr:number;createdAt:string;updatedAt:string;createdBy:string;updatedBy:string;version:number;redemptionCount:number;discountGrantedLkr:number;discountedSalesLkr:number;
};
export type GamingPromotionsSnapshot={source:'shared-d1'|'local-prototype';generatedAt:string;capabilities:{manage:boolean};summary:{total:number;active:number;coupons:number;automatic:number;redemptions:number;discountGrantedLkr:number};campaigns:GamingPromotionCampaign[]};
export type GamingPromotionDraft={campaignId?:string;name:string;status:GamingPromotionCampaign['status'];applicationMode:GamingPromotionCampaign['applicationMode'];code?:string;discountType:GamingPromotionCampaign['discountType'];discountValue:number;minSpendLkr:number;startAt?:string|null;endAt?:string|null;productIds:string[];offerIds:string[];maxRedemptions?:number|null;perCustomerLimit?:number|null;marginFloorLkr:number};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==='production-api'?new ProductionBackendClient(runtime.apiBaseUrl):undefined;
export async function loadGamingPromotionsSnapshot():Promise<GamingPromotionsSnapshot>{
  if(!client)return {source:'local-prototype',generatedAt:new Date().toISOString(),capabilities:{manage:false},summary:{total:0,active:0,coupons:0,automatic:0,redemptions:0,discountGrantedLkr:0},campaigns:[]};
  const result=await client.execute<GamingPromotionsSnapshot>({operation:'staff.gaming.promotions.snapshot.get',kind:'query',input:{}});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}
async function command(operation:'staff.gaming.promotion.create'|'staff.gaming.promotion.update',input:GamingPromotionDraft){
  if(!client)throw new Error('Promotion management is available only through the production CMS API.');
  const result=await client.execute<GamingPromotionCampaign>({operation,kind:'command',input,idempotencyKey:`gaming-promotion:${crypto.randomUUID()}`});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}
export function createGamingPromotion(input:GamingPromotionDraft){return command('staff.gaming.promotion.create',input);}
export function updateGamingPromotion(input:GamingPromotionDraft&{campaignId:string}){return command('staff.gaming.promotion.update',input);}

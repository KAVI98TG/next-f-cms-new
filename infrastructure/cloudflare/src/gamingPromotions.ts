import type { D1DatabaseLike } from './env';

const PROMOTION_NS='gaming.promotion.campaign';
type Principal={permissions:string[]};
function has(principal:Principal,permission:string){return principal.permissions.includes(permission);}
function parse<T>(value:string):T|undefined{try{return JSON.parse(value) as T;}catch{return undefined;}}
function text(value:unknown){return typeof value==='string'?value:'';}
function num(value:unknown){const n=Number(value);return Number.isFinite(n)?n:0;}

export async function gamingPromotionsSnapshot(db:D1DatabaseLike,principal:Principal,commerceConfigured:boolean){
  const [campaignRows,orderRows]=await Promise.all([
    db.prepare('SELECT payload_json,version,created_at,updated_at FROM app_documents WHERE namespace=? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 300').bind(PROMOTION_NS).all<any>(),
    db.prepare("SELECT payload_json FROM app_documents WHERE namespace='gaming.public.order' AND deleted_at IS NULL AND json_extract(payload_json,'$.promotion.campaignId') IS NOT NULL ORDER BY updated_at DESC LIMIT 2000").all<any>(),
  ]);
  const orders=orderRows.results.map((row:any)=>parse<any>(row.payload_json)).filter(Boolean);
  const campaigns=campaignRows.results.map((row:any)=>{
    const value=parse<any>(row.payload_json)||{};
    const matching=orders.filter((order:any)=>text(order?.promotion?.campaignId)===text(value.campaignId));
    return {
      campaignId:text(value.campaignId),name:text(value.name),status:text(value.status),applicationMode:text(value.applicationMode),code:text(value.code)||undefined,
      discountType:text(value.discountType),discountValue:num(value.discountValue),minSpendLkr:num(value.minSpendLkr),startAt:text(value.startAt)||undefined,endAt:text(value.endAt)||undefined,
      productIds:Array.isArray(value.productIds)?value.productIds.map(text).filter(Boolean):[],offerIds:Array.isArray(value.offerIds)?value.offerIds.map(text).filter(Boolean):[],
      maxRedemptions:value.maxRedemptions===undefined?undefined:num(value.maxRedemptions),perCustomerLimit:value.perCustomerLimit===undefined?undefined:num(value.perCustomerLimit),marginFloorLkr:num(value.marginFloorLkr),
      createdAt:text(value.createdAt),updatedAt:text(value.updatedAt),createdBy:text(value.createdBy),updatedBy:text(value.updatedBy),version:Number(row.version||1),
      redemptionCount:matching.length,discountGrantedLkr:matching.reduce((sum:number,order:any)=>sum+num(order?.promotion?.discountLkr),0),discountedSalesLkr:matching.reduce((sum:number,order:any)=>sum+num(order?.amountLkr),0),
    };
  });
  return {source:'shared-d1' as const,generatedAt:new Date().toISOString(),capabilities:{manage:has(principal,'gaming.products.manage')&&commerceConfigured},summary:{total:campaigns.length,active:campaigns.filter((row:any)=>row.status==='active').length,coupons:campaigns.filter((row:any)=>row.applicationMode==='coupon').length,automatic:campaigns.filter((row:any)=>row.applicationMode==='automatic').length,redemptions:campaigns.reduce((sum:number,row:any)=>sum+row.redemptionCount,0),discountGrantedLkr:campaigns.reduce((sum:number,row:any)=>sum+row.discountGrantedLkr,0)},campaigns};
}

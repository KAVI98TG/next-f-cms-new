import { ProductionBackendClient } from '../../services/production/httpClient';
import { readProductionRuntimeConfig } from '../../services/production/runtime';

export type GamingCustomerLifecycle='prospect'|'new'|'active'|'repeat'|'dormant';
export type GamingCustomerOrder={orderId:string;orderNumber:string;productName:string;offerName:string;status:string;paymentState:string;amountLkr:number;promotionName?:string;createdAt:string;updatedAt:string};
export type GamingCustomer360={
  customerId:string;accountId?:string;accountType:'google'|'guest';name:string;email:string;phone?:string;country?:string;gamerTag?:string;telegram?:string;avatarUrl?:string;
  createdAt:string;lastLoginAt?:string;lastPurchaseAt?:string;lifecycle:GamingCustomerLifecycle;orders:number;verifiedOrders:number;fulfilledOrders:number;
  grossSpendLkr:number;refundedLkr:number;netSpendLkr:number;averageOrderValueLkr:number;favoriteProduct?:string;promotionUses:number;supportCases:number;openSupportCases:number;
  risk?:{score:number;level:string;state:string;updatedAt:string};
  marketing:{email:boolean;status:'subscribed'|'not_subscribed';source:string;consentedAt?:string;unsubscribedAt?:string;updatedAt?:string};
  orderHistory:GamingCustomerOrder[];
};
export type GamingCustomersSnapshot={source:'shared-d1'|'local-prototype';generatedAt:string;summary:{customers:number;signedIn:number;guests:number;repeat:number;marketingSubscribed:number;orders:number;netSalesLkr:number};customers:GamingCustomer360[]};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==='production-api'?new ProductionBackendClient(runtime.apiBaseUrl):undefined;

export async function loadGamingCustomersSnapshot():Promise<GamingCustomersSnapshot>{
  if(!client)return{source:'local-prototype',generatedAt:new Date().toISOString(),summary:{customers:0,signedIn:0,guests:0,repeat:0,marketingSubscribed:0,orders:0,netSalesLkr:0},customers:[]};
  const result=await client.execute<GamingCustomersSnapshot>({operation:'staff.gaming.customers.snapshot.get',kind:'query',input:{}});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

import { ProductionBackendClient } from '../../services/production/httpClient';
import { readProductionRuntimeConfig } from '../../services/production/runtime';
import { gamingStore } from '../data/gamingStore';

export type GamingFunnelStage={key:string;label:string;count:number;conversionFromPrevious:number|null};
export type GamingAnalyticsProduct={productId:string;productName:string;views:number;checkoutStarted:number;orders:number;paidOrders:number;fulfilledOrders:number;viewToOrderRate:number|null;orderToPaidRate:number|null;paidToFulfilledRate:number|null;grossCollectedLkr?:number;estimatedMarginLkr?:number};
export type GamingAnalyticsSupplier={providerKey:string;orders:number;completed:number;failed:number;successRate:number|null;paidValueLkr?:number;estimatedMarginLkr?:number};
export type GamingAnalyticsDay={date:string;productViews:number;checkoutStarted:number;ordersCreated:number;paymentVerified:number;fulfilled:number};
export type GamingAnalyticsSnapshot={
  source:'shared-d1-events'|'local-prototype';generatedAt:string;window:{days:number;startAt:string;endAt:string};
  dataQuality:{earlyFunnelInstrumented:boolean;coverageStart?:string;coverageNote:string};capabilities:{finance:boolean};
  funnel:{stages:GamingFunnelStage[];overallViewToOrderRate:number|null;overallViewToFulfilledRate:number|null};
  business:{orders:number;verifiedOrders:number;fulfilledOrders:number;refundedOrders:number;refundRate:number|null;riskAssessed:number;riskHeld:number;riskHoldRate:number|null;riskReleased:number;notifications:number;notificationSent:number;notificationAttention:number;notificationDeliveryRate:number|null;avgPaymentVerificationMinutes:number|null;avgFulfillmentMinutesFromPayment:number|null;grossCollectedLkr?:number;refundsLkr?:number;netSalesLkr?:number;supplierCostLkr?:number;gatewayFeesLkr?:number;supplierRecoveriesLkr?:number;gatewayRecoveriesLkr?:number;estimatedMarginLkr?:number};
  daily:GamingAnalyticsDay[];products:GamingAnalyticsProduct[];suppliers:GamingAnalyticsSupplier[];
};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==='production-api'?new ProductionBackendClient(runtime.apiBaseUrl):undefined;
const pct=(a:number,b:number)=>b>0?Math.round(a/b*1000)/10:null;

function localSnapshot(days:number):GamingAnalyticsSnapshot{
  const now=new Date(); const start=new Date(now.getTime()-days*86400000);
  const orders=gamingStore.getOrders().filter((order)=>Date.parse(order.createdAt)>=start.getTime());
  const products=gamingStore.getProducts();
  const suppliers=gamingStore.getSuppliers();
  const verified=orders.filter((order)=>order.customerPaid);
  const fulfilled=orders.filter((order)=>order.status==='completed');
  const refunded=orders.filter((order)=>order.status==='refunded');
  const productRows=products.map((product)=>{const rows=orders.filter((order)=>order.productId===product.id);const paid=rows.filter((order)=>order.customerPaid);const done=rows.filter((order)=>order.status==='completed');return {productId:product.id,productName:product.name,views:0,checkoutStarted:0,orders:rows.length,paidOrders:paid.length,fulfilledOrders:done.length,viewToOrderRate:null,orderToPaidRate:pct(paid.length,rows.length),paidToFulfilledRate:pct(done.length,paid.length),grossCollectedLkr:paid.reduce((sum,row)=>sum+row.sellingPrice,0),estimatedMarginLkr:paid.reduce((sum,row)=>sum+row.profit,0)};}).filter((row)=>row.orders>0);
  const supplierRows=suppliers.map((supplier)=>{const rows=orders.filter((order)=>order.supplierId===supplier.id);const done=rows.filter((order)=>order.status==='completed');const failed=rows.filter((order)=>order.status==='failed');return {providerKey:supplier.providerKey,orders:rows.length,completed:done.length,failed:failed.length,successRate:pct(done.length,done.length+failed.length),paidValueLkr:rows.filter((order)=>order.customerPaid).reduce((sum,row)=>sum+row.sellingPrice,0),estimatedMarginLkr:rows.filter((order)=>order.customerPaid).reduce((sum,row)=>sum+row.profit,0)};}).filter((row)=>row.orders>0);
  const daily:Array<GamingAnalyticsDay>=[]; for(let i=days-1;i>=0;i--){const date=new Date(now.getTime()-i*86400000).toISOString().slice(0,10);daily.push({date,productViews:0,checkoutStarted:0,ordersCreated:orders.filter((row)=>row.createdAt.startsWith(date)).length,paymentVerified:verified.filter((row)=>row.createdAt.startsWith(date)).length,fulfilled:fulfilled.filter((row)=>row.updatedAt.startsWith(date)).length});}
  return {source:'local-prototype',generatedAt:now.toISOString(),window:{days,startAt:start.toISOString(),endAt:now.toISOString()},dataQuality:{earlyFunnelInstrumented:false,coverageNote:'Early-funnel instrumentation is available only from the production Gaming event stream.'},capabilities:{finance:true},funnel:{stages:[{key:'product_view',label:'Product views',count:0,conversionFromPrevious:null},{key:'checkout_started',label:'Checkout started',count:0,conversionFromPrevious:null},{key:'order_created',label:'Orders created',count:orders.length,conversionFromPrevious:null},{key:'payment_submitted',label:'Payment submitted',count:verified.length,conversionFromPrevious:pct(verified.length,orders.length)},{key:'payment_verified',label:'Payment verified',count:verified.length,conversionFromPrevious:100},{key:'fulfilled',label:'Fulfilled',count:fulfilled.length,conversionFromPrevious:pct(fulfilled.length,verified.length)}],overallViewToOrderRate:null,overallViewToFulfilledRate:null},business:{orders:orders.length,verifiedOrders:verified.length,fulfilledOrders:fulfilled.length,refundedOrders:refunded.length,refundRate:pct(refunded.length,verified.length),riskAssessed:0,riskHeld:0,riskHoldRate:null,riskReleased:0,notifications:0,notificationSent:0,notificationAttention:0,notificationDeliveryRate:null,avgPaymentVerificationMinutes:null,avgFulfillmentMinutesFromPayment:null,grossCollectedLkr:verified.reduce((sum,row)=>sum+row.sellingPrice,0),refundsLkr:refunded.reduce((sum,row)=>sum+row.sellingPrice,0),netSalesLkr:verified.reduce((sum,row)=>sum+row.sellingPrice,0)-refunded.reduce((sum,row)=>sum+row.sellingPrice,0),estimatedMarginLkr:verified.reduce((sum,row)=>sum+row.profit,0)},daily,products:productRows,suppliers:supplierRows};
}

export async function loadGamingAnalyticsSnapshot(days:7|30|90):Promise<GamingAnalyticsSnapshot>{
  if(!client)return localSnapshot(days);
  const result=await client.execute<GamingAnalyticsSnapshot>({operation:'staff.gaming.analytics.snapshot.get',kind:'query',input:{days}});
  if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  return result.data;
}

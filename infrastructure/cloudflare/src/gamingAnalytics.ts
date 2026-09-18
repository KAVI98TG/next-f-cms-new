import type { D1DatabaseLike } from './env';

const ORDER_NS = 'gaming.public.order';
const REFUND_NS = 'gaming.refund';
const NOTIFICATION_NS = 'gaming.notification.outbox';
const STAFF_NS = 'cms.staff-state';
const PRODUCTS_KEY = 'nextf.vnext.gaming.products';

type Principal = { permissions: string[] };
type AuditRow = { action:string; outcome:string; target_type:string; target_id:string; detail:string; created_at:string };
type DocumentRow = { payload_json:string; created_at:string; updated_at:string };

const has = (principal:Principal, permission:string) => principal.permissions.includes(permission);
const text = (value:unknown) => typeof value === 'string' ? value : '';
const money = (value:unknown) => { const n=Number(value); return Number.isFinite(n)?n:0; };
function parse<T>(value:string):T|undefined { try { return JSON.parse(value) as T; } catch { return undefined; } }
function pct(numerator:number, denominator:number){ return denominator>0?Math.round((numerator/denominator)*1000)/10:null; }
function avg(values:number[]){ return values.length?Math.round((values.reduce((a,b)=>a+b,0)/values.length)*10)/10:null; }
function dayKey(value:string){ return value.slice(0,10); }

async function documents(db:D1DatabaseLike, namespace:string, since:string, limit=5000){
  const rows=await db.prepare('SELECT payload_json,created_at,updated_at FROM app_documents WHERE namespace=? AND deleted_at IS NULL AND created_at>=? ORDER BY created_at ASC LIMIT ?').bind(namespace,since,limit).all<DocumentRow>();
  return rows.results.flatMap((row)=>{ const value=parse<any>(row.payload_json); return value?[{value,createdAt:row.created_at,updatedAt:row.updated_at}]:[]; });
}

async function productNames(db:D1DatabaseLike){
  const row=await db.prepare('SELECT payload_json FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1').bind(STAFF_NS,PRODUCTS_KEY).first<{payload_json:string}>();
  const payload=row?parse<any>(row.payload_json):undefined;
  const items=Array.isArray(payload)?payload:[];
  return new Map(items.map((item:any)=>[text(item?.id),text(item?.displayName)||text(item?.name)||text(item?.id)]));
}

export async function gamingAnalyticsSnapshot(db:D1DatabaseLike, principal:Principal, requestedDays:unknown){
  const days=[7,30,90].includes(Number(requestedDays))?Number(requestedDays):30;
  const generatedAt=new Date();
  const windowStart=new Date(generatedAt.getTime()-days*86400000).toISOString();
  const finance=has(principal,'gaming.finance.manage');
  const activation=await db.prepare("SELECT created_at FROM audit_events WHERE action IN ('gaming.analytics.product_view','gaming.analytics.checkout_started') ORDER BY created_at ASC LIMIT 1").first<{created_at:string}>();
  const coverageStart=activation?.created_at && activation.created_at>windowStart ? activation.created_at : windowStart;
  const earlyFunnelInstrumented=Boolean(activation?.created_at);
  const [eventRows,ordersRows,refundRows,notificationRows,names]=await Promise.all([
    db.prepare("SELECT action,outcome,target_type,target_id,detail,created_at FROM audit_events WHERE action LIKE 'gaming.%' AND created_at>=? ORDER BY created_at ASC LIMIT 10000").bind(windowStart).all<AuditRow>(),
    documents(db,ORDER_NS,windowStart),
    documents(db,REFUND_NS,windowStart),
    documents(db,NOTIFICATION_NS,windowStart),
    productNames(db),
  ]);
  const events=eventRows.results.map((row)=>({...row,detailObject:parse<Record<string,unknown>>(row.detail)||{}}));
  const funnelEvents=events.filter((row)=>row.created_at>=coverageStart);
  const uniqueOrderIds=(rows:typeof funnelEvents, action:string, outcome?:string)=>new Set(rows.filter((row)=>row.action===action&&(!outcome||row.outcome===outcome)).map((row)=>text(row.detailObject.orderId)||(row.target_type==='gaming.order'?row.target_id:'')).filter(Boolean));
  const productViews=funnelEvents.filter((row)=>row.action==='gaming.analytics.product_view');
  const checkoutStarts=funnelEvents.filter((row)=>row.action==='gaming.analytics.checkout_started');
  const storefrontEventActions=new Set(['gaming.analytics.page_view','gaming.analytics.product_view','gaming.analytics.search','gaming.analytics.filter_used','gaming.analytics.offer_selected','gaming.analytics.support_opened']);
  const storefrontEvents=funnelEvents.filter((row)=>storefrontEventActions.has(row.action));
  const storefrontCount=(action:string)=>storefrontEvents.filter((row)=>row.action===action).length;
  const lastStorefrontEvent=storefrontEvents.length?storefrontEvents[storefrontEvents.length-1].created_at:undefined;
  const lastStorefrontAgeMs=lastStorefrontEvent?generatedAt.getTime()-Date.parse(lastStorefrontEvent):Number.POSITIVE_INFINITY;
  const trackingStatus=lastStorefrontEvent?(lastStorefrontAgeMs<=86_400_000?'active':'quiet'):'awaiting';
  const pageMap=new Map<string,number>();
  for(const row of storefrontEvents){ if(row.action!=='gaming.analytics.page_view') continue; const path=text(row.detailObject.path)||'/'; pageMap.set(path,(pageMap.get(path)||0)+1); }
  const landingPages=[...pageMap.entries()].map(([path,views])=>({path,views})).sort((a,b)=>b.views-a.views);
  const createdOrders=uniqueOrderIds(funnelEvents,'gaming.checkout.create','success');
  const paymentSubmitted=uniqueOrderIds(funnelEvents,'gaming.manual-payment.proof.submit','success');
  const paymentVerified=uniqueOrderIds(funnelEvents,'gaming.manual-payment.review','verified');
  const fulfilled=uniqueOrderIds(funnelEvents,'gaming.fulfillment.update','completed');
  const stages=[
    {key:'product_view',label:'Product views',count:productViews.length},
    {key:'checkout_started',label:'Checkout started',count:checkoutStarts.length},
    {key:'order_created',label:'Orders created',count:createdOrders.size},
    {key:'payment_submitted',label:'Payment submitted',count:paymentSubmitted.size},
    {key:'payment_verified',label:'Payment verified',count:paymentVerified.size},
    {key:'fulfilled',label:'Fulfilled',count:fulfilled.size},
  ].map((stage,index,array)=>({...stage,conversionFromPrevious:index===0?null:pct(stage.count,array[index-1].count)}));

  const dailyMap=new Map<string,any>();
  for(let i=days-1;i>=0;i--){ const date=new Date(generatedAt.getTime()-i*86400000).toISOString().slice(0,10); dailyMap.set(date,{date,productViews:0,checkoutStarted:0,ordersCreated:0,paymentVerified:0,fulfilled:0}); }
  for(const row of funnelEvents){
    const day=dailyMap.get(dayKey(row.created_at)); if(!day) continue;
    if(row.action==='gaming.analytics.product_view') day.productViews++;
    else if(row.action==='gaming.analytics.checkout_started') day.checkoutStarted++;
    else if(row.action==='gaming.checkout.create'&&row.outcome==='success') day.ordersCreated++;
    else if(row.action==='gaming.manual-payment.review'&&row.outcome==='verified') day.paymentVerified++;
    else if(row.action==='gaming.fulfillment.update'&&row.outcome==='completed') day.fulfilled++;
  }

  const orders=ordersRows.map((row)=>row.value);
  const attributionMap=new Map<string,any>();
  for(const row of orders){
    const attribution=row?.attribution&&typeof row.attribution==='object'?row.attribution:{};
    const source=text(attribution?.source)||'direct';
    const medium=text(attribution?.medium)||'none';
    const campaign=text(attribution?.campaign)||'—';
    const key=`${source}\u0000${medium}\u0000${campaign}`;
    if(!attributionMap.has(key)) attributionMap.set(key,{source,medium,campaign,orders:0,verifiedOrders:0,fulfilledOrders:0,grossCollectedLkr:0,estimatedMarginLkr:0});
    const item=attributionMap.get(key); item.orders++;
    if(row?.payment?.state==='verified'){ item.verifiedOrders++; item.grossCollectedLkr+=money(row?.amountLkr); item.estimatedMarginLkr+=money(row?.economics?.marginLkr); }
    if(row?.status==='completed') item.fulfilledOrders++;
  }
  const acquisition=[...attributionMap.values()].map((item)=>({...item,paidRate:pct(item.verifiedOrders,item.orders),...(finance?{}:{grossCollectedLkr:undefined,estimatedMarginLkr:undefined})})).sort((a,b)=>b.orders-a.orders||b.verifiedOrders-a.verifiedOrders).slice(0,20);
  const refunds=refundRows.map((row)=>row.value);
  const notifications=notificationRows.map((row)=>row.value);
  const completedRefunds=refunds.filter((row:any)=>row?.status==='completed'&&text(row?.completedAt)>=windowStart);
  const verifiedOrders=orders.filter((row:any)=>row?.payment?.state==='verified');
  const fulfilledOrders=orders.filter((row:any)=>row?.status==='completed');
  const grossCollectedLkr=verifiedOrders.reduce((sum:number,row:any)=>sum+money(row?.amountLkr),0);
  const refundsLkr=completedRefunds.reduce((sum:number,row:any)=>sum+money(row?.amountLkr),0);
  const supplierCostLkr=verifiedOrders.filter((row:any)=>row?.fulfillment?.supplierOrderId).reduce((sum:number,row:any)=>sum+money(row?.economics?.supplierCostLkr),0);
  const gatewayFeesLkr=verifiedOrders.reduce((sum:number,row:any)=>sum+money(row?.economics?.gatewayFeeLkr)+money(row?.economics?.fixedFeeLkr),0);
  const supplierRecoveriesLkr=completedRefunds.reduce((sum:number,row:any)=>sum+money(row?.finance?.supplierRecoveryLkr),0);
  const gatewayRecoveriesLkr=completedRefunds.reduce((sum:number,row:any)=>sum+money(row?.finance?.gatewayFeeRecoveredLkr),0);

  const productMap=new Map<string,any>();
  const product=(id:string)=>{ if(!productMap.has(id)) productMap.set(id,{productId:id,productName:names.get(id)||id,views:0,checkoutStarted:0,orders:0,paidOrders:0,fulfilledOrders:0,grossCollectedLkr:0,estimatedMarginLkr:0}); return productMap.get(id); };
  for(const row of productViews){ const id=text(row.detailObject.productId)||row.target_id; if(id) product(id).views++; }
  for(const row of checkoutStarts){ const id=text(row.detailObject.productId); if(id) product(id).checkoutStarted++; }
  for(const row of orders){
    const id=text(row?.productId); if(!id) continue; const item=product(id); item.productName=text(row?.productName)||item.productName; item.orders++;
    if(row?.payment?.state==='verified'){ item.paidOrders++; item.grossCollectedLkr+=money(row?.amountLkr); item.estimatedMarginLkr+=money(row?.economics?.marginLkr); }
    if(row?.status==='completed') item.fulfilledOrders++;
  }
  const products=[...productMap.values()].map((item)=>({...item,viewToOrderRate:pct(item.orders,item.views),orderToPaidRate:pct(item.paidOrders,item.orders),paidToFulfilledRate:pct(item.fulfilledOrders,item.paidOrders),...(finance?{}:{grossCollectedLkr:undefined,estimatedMarginLkr:undefined})})).sort((a,b)=>b.orders-a.orders||b.views-a.views).slice(0,20);

  const supplierMap=new Map<string,any>();
  for(const row of orders){
    const key=text(row?.fulfillment?.providerKey)||text(row?.routing?.providerKey)||'unrouted';
    if(!supplierMap.has(key)) supplierMap.set(key,{providerKey:key,orders:0,completed:0,failed:0,paidValueLkr:0,estimatedMarginLkr:0});
    const item=supplierMap.get(key); item.orders++; if(row?.status==='completed')item.completed++; if(row?.status==='failed')item.failed++;
    if(row?.payment?.state==='verified'){ item.paidValueLkr+=money(row?.amountLkr); item.estimatedMarginLkr+=money(row?.economics?.marginLkr); }
  }
  const suppliers=[...supplierMap.values()].map((item)=>({...item,successRate:pct(item.completed,item.completed+item.failed),...(finance?{}:{paidValueLkr:undefined,estimatedMarginLkr:undefined})})).sort((a,b)=>b.orders-a.orders);

  const riskAssessed=events.filter((row)=>row.action==='gaming.risk.assessed');
  const riskHeld=riskAssessed.filter((row)=>row.outcome==='held');
  const riskReleased=events.filter((row)=>row.action==='gaming.risk.review'&&row.outcome==='released');
  const refundedOrders=new Set(completedRefunds.map((row:any)=>text(row?.orderId)).filter(Boolean));
  const sentNotifications=notifications.filter((row:any)=>row?.state==='sent').length;
  const notificationAttention=notifications.filter((row:any)=>['retry','blocked','failed'].includes(text(row?.state))).length;

  const orderCreatedAt=new Map(orders.map((row:any)=>[text(row?.orderId),Date.parse(text(row?.createdAt))]));
  const paidAt=new Map<string,number>();
  const paymentMinutes:number[]=[]; const fulfillmentMinutes:number[]=[];
  for(const row of events){
    const orderId=text(row.detailObject.orderId)||(row.target_type==='gaming.order'?row.target_id:''); if(!orderId)continue;
    if(row.action==='gaming.manual-payment.review'&&row.outcome==='verified'){
      const ts=Date.parse(row.created_at); paidAt.set(orderId,ts); const created=orderCreatedAt.get(orderId); if(created&&ts>=created)paymentMinutes.push((ts-created)/60000);
    }
    if(row.action==='gaming.fulfillment.update'&&row.outcome==='completed'){
      const ts=Date.parse(row.created_at); const paid=paidAt.get(orderId); if(paid&&ts>=paid)fulfillmentMinutes.push((ts-paid)/60000);
    }
  }

  return {
    source:'shared-d1-events' as const, generatedAt:generatedAt.toISOString(), window:{days,startAt:windowStart,endAt:generatedAt.toISOString()},
    dataQuality:{earlyFunnelInstrumented,coverageStart:earlyFunnelInstrumented?coverageStart:undefined,coverageNote:earlyFunnelInstrumented?'Early-funnel conversion uses only events from the instrumentation coverage start.':'Early-funnel instrumentation has not recorded a product view or checkout start yet.'},
    capabilities:{finance},
    tracking:{status:trackingStatus,lastEventAt:lastStorefrontEvent,eventCount:storefrontEvents.length,pageViews:storefrontCount('gaming.analytics.page_view'),productViews:storefrontCount('gaming.analytics.product_view'),searches:storefrontCount('gaming.analytics.search'),filterUses:storefrontCount('gaming.analytics.filter_used'),offerSelections:storefrontCount('gaming.analytics.offer_selected'),supportOpens:storefrontCount('gaming.analytics.support_opened'),landingPages},
    acquisition,
    funnel:{stages,overallViewToOrderRate:pct(createdOrders.size,productViews.length),overallViewToFulfilledRate:pct(fulfilled.size,productViews.length)},
    business:{orders:orders.length,verifiedOrders:verifiedOrders.length,fulfilledOrders:fulfilledOrders.length,refundedOrders:refundedOrders.size,refundRate:pct(refundedOrders.size,verifiedOrders.length),riskAssessed:riskAssessed.length,riskHeld:riskHeld.length,riskHoldRate:pct(riskHeld.length,riskAssessed.length),riskReleased:riskReleased.length,notifications:notifications.length,notificationSent:sentNotifications,notificationAttention,notificationDeliveryRate:pct(sentNotifications,notifications.length),avgPaymentVerificationMinutes:avg(paymentMinutes),avgFulfillmentMinutesFromPayment:avg(fulfillmentMinutes),...(finance?{grossCollectedLkr,refundsLkr,netSalesLkr:grossCollectedLkr-refundsLkr,supplierCostLkr,gatewayFeesLkr,supplierRecoveriesLkr,gatewayRecoveriesLkr,estimatedMarginLkr:grossCollectedLkr-refundsLkr-supplierCostLkr-gatewayFeesLkr+supplierRecoveriesLkr+gatewayRecoveriesLkr}:{})},
    daily:[...dailyMap.values()], products, suppliers,
  };
}

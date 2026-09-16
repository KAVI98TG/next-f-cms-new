import type { D1DatabaseLike } from './env';

const ACCOUNT_NS='gaming.customer.account';
const ORDER_NS='gaming.public.order';
const REFUND_NS='gaming.refund';
const SUPPORT_NS='gaming.support.case';
const RISK_NS='gaming.risk.assessment';

type Principal={permissions:string[]};
type Row={id:string;payload_json:string;created_at:string;updated_at:string};

const text=(value:unknown)=>typeof value==='string'?value:'';
const money=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)?n:0;};
const normalizedEmail=(value:unknown)=>text(value).trim().toLowerCase();
function parse<T=any>(value:string):T|undefined{try{return JSON.parse(value) as T;}catch{return undefined;}}

async function docs(db:D1DatabaseLike,namespace:string,limit:number){
  const rows=await db.prepare('SELECT id,payload_json,created_at,updated_at FROM app_documents WHERE namespace=? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?').bind(namespace,limit).all<Row>();
  return rows.results.flatMap((row)=>{const value=parse<any>(row.payload_json);return value?[{id:row.id,value,createdAt:row.created_at,updatedAt:row.updated_at}]:[];});
}

async function guestId(email:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email));
  const token=[...new Uint8Array(digest)].slice(0,12).map((byte)=>byte.toString(16).padStart(2,'0')).join('');
  return `guest_${token}`;
}

function lifecycle(input:{orders:number;verifiedOrders:number;lastPurchaseAt?:string}){
  if(input.orders===0)return 'prospect';
  if(input.lastPurchaseAt&&Date.now()-Date.parse(input.lastPurchaseAt)>90*86400000)return 'dormant';
  if(input.verifiedOrders>=2)return 'repeat';
  if(input.verifiedOrders===1)return 'active';
  return 'new';
}

export async function gamingCustomersSnapshot(db:D1DatabaseLike,principal:Principal){
  if(!principal.permissions.includes('gaming.orders.manage')) throw new Error('GAMING_CUSTOMERS_FORBIDDEN');
  const [accountRows,orderRows,refundRows,supportRows,riskRows]=await Promise.all([
    docs(db,ACCOUNT_NS,3000),docs(db,ORDER_NS,8000),docs(db,REFUND_NS,8000),docs(db,SUPPORT_NS,4000),docs(db,RISK_NS,8000),
  ]);
  const completedRefundByOrder=new Map<string,number>();
  for(const row of refundRows){if(text(row.value?.status)!=='completed')continue;const orderId=text(row.value?.orderId);if(orderId)completedRefundByOrder.set(orderId,(completedRefundByOrder.get(orderId)||0)+money(row.value?.amountLkr));}
  const supportByOrder=new Map<string,{total:number;open:number}>();
  for(const row of supportRows){const orderId=text(row.value?.orderId);if(!orderId)continue;const current=supportByOrder.get(orderId)||{total:0,open:0};current.total++;if(!['resolved','closed'].includes(text(row.value?.status)))current.open++;supportByOrder.set(orderId,current);}
  const riskByOrder=new Map<string,{score:number;level:string;state:string;updatedAt:string}>();
  for(const row of riskRows){const orderId=text(row.value?.orderId);if(!orderId)continue;const current=riskByOrder.get(orderId);const candidate={score:Number(row.value?.score||0),level:text(row.value?.level),state:text(row.value?.state),updatedAt:text(row.value?.updatedAt)||row.updatedAt};if(!current||candidate.updatedAt>current.updatedAt)riskByOrder.set(orderId,candidate);}

  const accounts=accountRows.map((row)=>row.value).filter((row)=>normalizedEmail(row?.email));
  const accountByEmail=new Map(accounts.map((account)=>[normalizedEmail(account.email),account]));
  const emails=new Set<string>(accounts.map((account)=>normalizedEmail(account.email)));
  for(const row of orderRows){const email=normalizedEmail(row.value?.customer?.email);if(email)emails.add(email);}

  const customers=[] as any[];
  for(const email of emails){
    const account=accountByEmail.get(email);
    const orders=orderRows.map((row)=>row.value).filter((order)=>normalizedEmail(order?.customer?.email)===email).sort((a,b)=>text(b?.createdAt).localeCompare(text(a?.createdAt)));
    const verified=orders.filter((order)=>text(order?.payment?.state)==='verified');
    const gross=verified.reduce((sum,order)=>sum+money(order?.amountLkr),0);
    const refunds=orders.reduce((sum,order)=>sum+(completedRefundByOrder.get(text(order?.orderId))||0),0);
    const productCounts=new Map<string,number>();
    for(const order of (verified.length?verified:orders)){const label=text(order?.productName)||text(order?.offerName)||text(order?.productId);if(label)productCounts.set(label,(productCounts.get(label)||0)+1);}
    const favorite=[...productCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0];
    const lastPurchaseAt=verified.map((order)=>text(order?.createdAt)).filter(Boolean).sort().at(-1);
    const support=orders.reduce((acc,order)=>{const item=supportByOrder.get(text(order?.orderId));return{total:acc.total+(item?.total||0),open:acc.open+(item?.open||0)};},{total:0,open:0});
    const risks=orders.flatMap((order)=>{const item=riskByOrder.get(text(order?.orderId));return item?[item]:[];});
    const highestRisk=risks.sort((a,b)=>b.score-a.score)[0];
    const consent=account?.marketingConsent&&typeof account.marketingConsent==='object'?account.marketingConsent:undefined;
    const subscribed=Boolean(consent?.email??account?.marketing);
    const id=account?.accountId||await guestId(email);
    customers.push({
      customerId:id,accountId:account?.accountId||undefined,accountType:account?'google':'guest',
      name:text(account?.displayName)||text(account?.name)||email.split('@')[0],email,
      phone:text(account?.phone)||undefined,country:text(account?.country)||undefined,gamerTag:text(account?.gamerTag)||undefined,telegram:text(account?.telegram)||undefined,avatarUrl:text(account?.avatarUrl)||undefined,
      createdAt:text(account?.createdAt)||text(orders.at(-1)?.createdAt)||'',lastLoginAt:text(account?.lastLoginAt)||undefined,lastPurchaseAt,
      lifecycle:lifecycle({orders:orders.length,verifiedOrders:verified.length,lastPurchaseAt}),
      orders:orders.length,verifiedOrders:verified.length,fulfilledOrders:orders.filter((order)=>text(order?.status)==='completed').length,
      grossSpendLkr:gross,refundedLkr:refunds,netSpendLkr:Math.max(0,gross-refunds),averageOrderValueLkr:verified.length?gross/verified.length:0,
      favoriteProduct:favorite,promotionUses:orders.filter((order)=>order?.promotion&&typeof order.promotion==='object').length,
      supportCases:support.total,openSupportCases:support.open,risk:highestRisk,
      marketing:{email:subscribed,status:subscribed?'subscribed':'not_subscribed',source:text(consent?.source)||(account?'profile_legacy':'none'),consentedAt:text(consent?.consentedAt)||undefined,unsubscribedAt:text(consent?.unsubscribedAt)||undefined,updatedAt:text(consent?.updatedAt)||undefined},
      orderHistory:orders.slice(0,100).map((order)=>({orderId:text(order?.orderId),orderNumber:text(order?.orderNumber),productName:text(order?.productName),offerName:text(order?.offerName),status:text(order?.status),paymentState:text(order?.payment?.state),amountLkr:money(order?.amountLkr),promotionName:text(order?.promotion?.name)||text(order?.promotion?.code)||undefined,createdAt:text(order?.createdAt),updatedAt:text(order?.updatedAt)})),
    });
  }
  customers.sort((a,b)=>(b.lastPurchaseAt||b.lastLoginAt||b.createdAt||'').localeCompare(a.lastPurchaseAt||a.lastLoginAt||a.createdAt||''));
  const signedIn=customers.filter((row)=>row.accountType==='google').length;
  const marketingSubscribed=customers.filter((row)=>row.marketing.email).length;
  const repeat=customers.filter((row)=>row.lifecycle==='repeat').length;
  return {source:'shared-d1' as const,generatedAt:new Date().toISOString(),summary:{customers:customers.length,signedIn,guests:customers.length-signedIn,repeat,marketingSubscribed,orders:customers.reduce((sum,row)=>sum+row.orders,0),netSalesLkr:customers.reduce((sum,row)=>sum+row.netSpendLkr,0)},customers};
}

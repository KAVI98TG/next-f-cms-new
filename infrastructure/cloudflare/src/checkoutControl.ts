import type { WorkerEnv } from './env';
import type { StaffPrincipal } from './staff';

export class CheckoutControlError extends Error {
  constructor(public status:number, public code:string, message:string){ super(message); }
}

function base(env:WorkerEnv){const value=String(env.CHECKOUT_API_ORIGIN||'').trim().replace(/\/$/,'');if(!value)throw new CheckoutControlError(503,'CHECKOUT_NOT_CONFIGURED','NEXT F Checkout API origin is not configured.');return value;}
function actor(principal:StaffPrincipal){return principal.email||principal.principalId||'cms-staff';}
async function call<T>(env:WorkerEnv,principal:StaffPrincipal,path:string,init?:{method?:string;body?:unknown;secretWrite?:boolean}){
  const token=init?.secretWrite?env.CHECKOUT_SECRET_ADMIN_TOKEN:env.CHECKOUT_ADMIN_TOKEN;
  if(!token)throw new CheckoutControlError(503,init?.secretWrite?'CHECKOUT_SECRET_BRIDGE_NOT_CONFIGURED':'CHECKOUT_ADMIN_BRIDGE_NOT_CONFIGURED',init?.secretWrite?'Checkout secret-management bridge is not configured.':'Checkout admin bridge is not configured.');
  const response=await fetch(`${base(env)}${path}`,{method:init?.method||'GET',headers:{authorization:`Bearer ${token}`,'content-type':'application/json','x-nextf-actor':actor(principal)},...(init?.body===undefined?{}:{body:JSON.stringify(init.body)})});
  const text=await response.text();let payload:any={};try{payload=text?JSON.parse(text):{}}catch{payload={}}
  if(!response.ok||payload?.ok===false){const detail=payload?.error?.message||payload?.problem?.detail||`Checkout API request failed (${response.status}).`;throw new CheckoutControlError(response.status,payload?.error?.code||payload?.problem?.code||'CHECKOUT_BRIDGE_FAILED',detail)}
  return payload?.data as T;
}
function can(principal:StaffPrincipal,permission:string){return principal.permissions.includes(permission)}

export async function checkoutPaymentsSnapshot(env:WorkerEnv,principal:StaffPrincipal,businessId?:string){
  const [overview,providers,businesses,transactions,refunds,webhooks,outbox,auditRows]=await Promise.all([
    call<any>(env,principal,'/v1/admin/overview'),
    call<any[]>(env,principal,'/v1/admin/providers'),
    call<any[]>(env,principal,'/v1/admin/businesses'),
    call<any[]>(env,principal,'/v1/admin/transactions?limit=100'),
    call<any[]>(env,principal,'/v1/admin/refunds'),
    call<any[]>(env,principal,'/v1/admin/webhooks'),
    call<any[]>(env,principal,'/v1/admin/outbox'),
    can(principal,'platform.audit.read')?call<any[]>(env,principal,'/v1/admin/audit'):Promise.resolve([]),
  ]);
  const selected=businessId&&businesses.some((row:any)=>row.id===businessId)?businessId:(businesses[0]?.id||'');
  const availability=selected?await call<any>(env,principal,`/v1/admin/availability?businessId=${encodeURIComponent(selected)}`):{businessId:'',businessRules:[],marketRules:[]};
  return {overview,providers,businesses,selectedBusinessId:selected,availability,transactions,refunds,webhooks,outbox,audit:auditRows,capabilities:{configure:can(principal,'platform.settings.manage'),secretWrite:can(principal,'platform.security.manage'),audit:can(principal,'platform.audit.read'),refunds:false},contractRelease:env.CHECKOUT_CONTRACT_RELEASE||'1.0.0'};
}

export async function updateCheckoutProvider(env:WorkerEnv,principal:StaffPrincipal,key:string,input:any){return call(env,principal,`/v1/admin/providers/${encodeURIComponent(key)}`,{method:'PUT',body:input})}
export async function checkCheckoutProviderHealth(env:WorkerEnv,principal:StaffPrincipal,key:string){return call(env,principal,`/v1/admin/providers/${encodeURIComponent(key)}/health`,{method:'POST',body:{}})}
export async function updateCheckoutBusiness(env:WorkerEnv,principal:StaffPrincipal,businessId:string,input:any){return call(env,principal,`/v1/admin/businesses/${encodeURIComponent(businessId)}`,{method:'PUT',body:input})}
export async function updateCheckoutBusinessRule(env:WorkerEnv,principal:StaffPrincipal,providerKey:string,businessId:string,input:any){return call(env,principal,`/v1/admin/providers/${encodeURIComponent(providerKey)}/businesses/${encodeURIComponent(businessId)}`,{method:'PUT',body:input})}
export async function updateCheckoutMarketRule(env:WorkerEnv,principal:StaffPrincipal,providerKey:string,businessId:string,marketId:string,currency:string,input:any){return call(env,principal,`/v1/admin/providers/${encodeURIComponent(providerKey)}/markets/${encodeURIComponent(businessId)}/${encodeURIComponent(marketId)}/${encodeURIComponent(currency)}`,{method:'PUT',body:input})}
export async function rotateCheckoutSecret(env:WorkerEnv,principal:StaffPrincipal,logicalKey:string,value:string){return call(env,principal,`/v1/admin/secrets/${encodeURIComponent(logicalKey)}`,{method:'POST',body:{value},secretWrite:true})}

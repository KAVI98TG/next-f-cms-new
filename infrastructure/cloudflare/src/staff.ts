import type { D1DatabaseLike, WorkerEnv } from "./env";
import { D1DocumentRepository } from "./repository";
import { D1IdempotencyRepository } from "./idempotency";
import { recordAudit } from "./audit";
import { runMaintenance } from "./maintenance";
import { gamingOperationsSnapshot } from "./gamingOperations";
import { gamingAnalyticsSnapshot } from "./gamingAnalytics";
import { gamingPromotionsSnapshot } from "./gamingPromotions";
import { gamingSupportSnapshot } from "./gamingSupport";
import { gamingCustomersSnapshot } from "./gamingCustomers";
import { GamingControlError, commandGamingSupportCase, completeGamingRefund, createGamingPromotion, createGamingRefund, createGamingSupportCase, decideGamingRefund, decideGamingRisk, markGamingRefundSent, reviewGamingPayment, retryGamingFulfillment, retryGamingNotification, updateGamingPromotion } from "./gamingControl";
import { createMediaUpload, finalizeMediaUpload } from "./media";

export type StaffAccessIdentity = { subject:string; email:string; assurance:"cloudflare-access" };
export type StaffPrincipal = { principalId:string; staffUserId:string; accountId:string; organizationId:string; permissions:string[]; email:string };
export type StaffRequestBody = { input?:unknown; workspaceScope?:{organizationId?:string;workspaceId?:string} };

const STATE_NAMESPACE = "cms.staff-state";
const STATE_KEY_PREFIX = "nextf.";
const CUSTOMER_WORKSPACES_STATE_KEY = "nextf.v0.12.digital.customer-workspaces";

type CustomerWorkspaceStateRecord = {
  id: string;
  organizationId: string;
  status?: string;
  [key: string]: unknown;
};

export class StaffApiError extends Error {
  constructor(public status:number, public code:string, message:string){ super(message); }
}

function parsePermissions(raw:string):string[]{
  try { const value=JSON.parse(raw); return Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[]; } catch { return []; }
}

export async function resolveStaffPrincipal(db:D1DatabaseLike, identity:StaffAccessIdentity):Promise<StaffPrincipal>{
  const row=await db.prepare("SELECT access_subject,email,account_id,staff_user_id,organization_id,permissions_json,status FROM staff_identity_bindings WHERE (access_subject=? OR lower(email)=lower(?)) LIMIT 1").bind(identity.subject,identity.email).first<any>();
  if(!row||row.status!=="active") throw new StaffApiError(403,"STAFF_IDENTITY_NOT_BOUND","Cloudflare Access identity is not bound to an active CMS staff user");
  if(row.access_subject!==identity.subject) throw new StaffApiError(403,"STAFF_SUBJECT_MISMATCH","Cloudflare Access subject does not match the stored staff binding");
  return { principalId:row.account_id, accountId:row.account_id, staffUserId:row.staff_user_id, organizationId:row.organization_id, permissions:parsePermissions(row.permissions_json), email:row.email };
}

function hasPermission(principal:StaffPrincipal, permission:string){ return principal.permissions.includes(permission); }
function hasAny(principal:StaffPrincipal, permissions:string[]){ return permissions.some((permission)=>hasPermission(principal,permission)); }
const DIGITAL_MANAGE_PERMISSIONS=["digital.sales.manage","digital.projects.manage","digital.billing.manage","digital.sites.manage","digital.settings.manage","digital.website-platform.manage"];
const PLATFORM_MANAGE_PERMISSIONS=["platform.users.manage","platform.access.manage","platform.settings.manage","platform.help.manage","platform.organizations.manage","platform.domains.manage","platform.security.manage","platform.backup.manage","platform.cleanup.manage"];

function stateReadAllowed(principal:StaffPrincipal,key:string){
  if(key.startsWith("nextf.v0.4.digital.")||key.startsWith("nextf.v0.10.digital.")||key.startsWith("nextf.v0.12.digital.")||key.startsWith("nextf.v0.13.digital.")||key.startsWith("nextf.v0.14.digital.")||key.startsWith("nextf.v0.19.digital.")||key.includes("website-platform")||key.includes("contract-registry")) return hasPermission(principal,"digital.read")||hasPermission(principal,"digital.website-platform.manage");
  if(key.startsWith("nextf.v0.5.gaming.")) return false;
  if(key.startsWith("nextf.vnext.gaming.")) return hasPermission(principal,"gaming.read");
  if(key.startsWith("nextf.v0.6.software.")) return hasPermission(principal,"software.read");
  if(key.startsWith("nextf.v0.11.help.")) return hasPermission(principal,"platform.read")||hasPermission(principal,"platform.help.manage");
  return hasPermission(principal,"platform.read");
}

function stateWriteAllowed(principal:StaffPrincipal,key:string){
  if(key.startsWith("nextf.v0.4.digital.leads")||key.startsWith("nextf.v0.4.digital.opportunities")||key.startsWith("nextf.v0.4.digital.proposals")||key.startsWith("nextf.v0.4.digital.clients")) return hasPermission(principal,"digital.sales.manage");
  if(key.startsWith("nextf.v0.4.digital.projects")||key.startsWith("nextf.v0.4.digital.tasks")||key.startsWith("nextf.v0.4.digital.deliverables")||key.startsWith("nextf.v0.4.digital.approvals")||key.startsWith("nextf.v0.4.digital.tickets")||key.startsWith("nextf.v0.4.digital.workflows")||key.startsWith("nextf.v0.10.digital.project-templates")) return hasPermission(principal,"digital.projects.manage");
  if(key.startsWith("nextf.v0.4.digital.invoices")||key.startsWith("nextf.v0.4.digital.subscriptions")||key.startsWith("nextf.v0.10.digital.billing-adjustments")||key.startsWith("nextf.v0.10.digital.addons")) return hasPermission(principal,"digital.billing.manage");
  if(key.startsWith("nextf.v0.4.digital.sites")) return hasPermission(principal,"digital.sites.manage");
  if(key.startsWith("nextf.v0.4.digital.services")||key.startsWith("nextf.v0.10.digital.settings")) return hasPermission(principal,"digital.settings.manage");
  if(key.startsWith("nextf.v0.4.digital.activity")) return hasAny(principal,DIGITAL_MANAGE_PERMISSIONS);
  if(key.includes("website-platform")||key.includes("contract-registry")||key.startsWith("nextf.v0.12.digital.")||key.startsWith("nextf.v0.13.digital.")||key.startsWith("nextf.v0.14.digital.")||key.startsWith("nextf.v0.19.digital.")||key.startsWith("nextf.v0.10.digital.portal-access")) return hasPermission(principal,"digital.website-platform.manage");
  if(key.startsWith("nextf.v0.5.gaming.")) return false;
  if(key.startsWith("nextf.vnext.gaming.supplier-status.")) return false;
  if(key.startsWith("nextf.vnext.gaming.supplier-config.")||key.startsWith("nextf.vnext.gaming.supplier-command.")) return hasPermission(principal,"gaming.suppliers.manage");
  if(key.startsWith("nextf.vnext.gaming.pricing.")) return hasPermission(principal,"gaming.products.manage");
  if(key.startsWith("nextf.vnext.gaming.storefront")||key.startsWith("nextf.vnext.gaming.game-families")) return hasPermission(principal,"gaming.products.manage");
  if(key.startsWith("nextf.vnext.gaming.products")||key.startsWith("nextf.vnext.gaming.offers")||key.startsWith("nextf.vnext.gaming.mappings")) return hasPermission(principal,"gaming.products.manage");
  if(key.startsWith("nextf.vnext.gaming.orders")) return hasPermission(principal,"gaming.orders.manage");
  if(key.startsWith("nextf.vnext.gaming.")) return hasAny(principal,["gaming.products.manage","gaming.orders.manage","gaming.suppliers.manage","gaming.finance.manage"]);
  if(key.startsWith("nextf.v0.6.software.products")||key.startsWith("nextf.v0.6.software.editions")||key.startsWith("nextf.v0.6.software.settings")) return hasPermission(principal,"software.products.manage");
  if(key.startsWith("nextf.v0.6.software.releases")||key.startsWith("nextf.v0.6.software.updates")||key.startsWith("nextf.v0.6.software.downloads")) return hasPermission(principal,"software.releases.manage");
  if(key.startsWith("nextf.v0.6.software.licenses")||key.startsWith("nextf.v0.6.software.activations")) return hasPermission(principal,"software.licenses.manage");
  if(key.startsWith("nextf.v0.6.software.orders")||key.startsWith("nextf.v0.6.software.subscriptions")||key.startsWith("nextf.v0.6.software.customers")) return hasPermission(principal,"software.billing.manage");
  if(key.startsWith("nextf.v0.6.software.")) return hasAny(principal,["software.products.manage","software.releases.manage","software.licenses.manage","software.billing.manage"]);
  if(key.startsWith("nextf.v0.2.platform.users")) return hasPermission(principal,"platform.users.manage");
  if(key.startsWith("nextf.v0.2.platform.roles")) return hasPermission(principal,"platform.access.manage");
  if(key.startsWith("nextf.v0.2.platform.settings")) return hasPermission(principal,"platform.settings.manage");
  if(key.startsWith("nextf.v0.11.help.")) return hasPermission(principal,"platform.help.manage");
  if(key.startsWith("nextf.v0.13.platform.identity")||key.startsWith("nextf.v0.13.customer-access")) return hasPermission(principal,"platform.access.manage");
  if(key.startsWith("nextf.v0.10.platform.organizations")||key.startsWith("nextf.v0.10.platform.workspaces")) return hasPermission(principal,"platform.organizations.manage");
  if(key.startsWith("nextf.v0.10.platform.domains")) return hasPermission(principal,"platform.domains.manage");
  if(key.startsWith("nextf.v0.10.platform.security")) return hasPermission(principal,"platform.security.manage");
  if(key.startsWith("nextf.v0.10.platform.backups")) return hasPermission(principal,"platform.backup.manage");
  if(key.startsWith("nextf.v0.10.platform.cleanup")||key.startsWith("nextf.v0.10.platform.retention")) return hasPermission(principal,"platform.cleanup.manage");
  if(key.startsWith("nextf.v0.10.platform.logs")) return hasPermission(principal,"platform.logs.read");
  if(key.startsWith("nextf.v0.2.platform.integrations")) return hasPermission(principal,"platform.settings.manage");
  if(key.startsWith("nextf.v0.2.platform.audit")||key.startsWith("nextf.v0.2.platform.notifications")||key.startsWith("nextf.v0.7.operations.")) return hasAny(principal,PLATFORM_MANAGE_PERMISSIONS);
  return hasPermission(principal,"platform.settings.manage");
}

function assertStateKey(value:unknown):string{
  if(typeof value!=="string"||!value.startsWith(STATE_KEY_PREFIX)||value.length>220) throw new StaffApiError(400,"VALIDATION_FAILED","Durable state key must be a NEXT F application key");
  return value;
}
function integerOrUndefined(value:unknown){ return Number.isInteger(value)&&Number(value)>0?Number(value):undefined; }

function canonical(value:unknown):string{
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}
async function sha256(value:string){ const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,"0")).join(""); }

async function requireCustomerWorkspaceScope(input:{body:StaffRequestBody;principal:StaffPrincipal;env:WorkerEnv;requestId:string;correlationId:string;repository:D1DocumentRepository}) {
  const organizationId=input.body.workspaceScope?.organizationId?.trim();
  const workspaceId=input.body.workspaceScope?.workspaceId?.trim();
  if(!organizationId||!workspaceId) throw new StaffApiError(400,"VALIDATION_FAILED","workspaceScope.organizationId and workspaceScope.workspaceId are required");
  const document=await input.repository.get(STATE_NAMESPACE,CUSTOMER_WORKSPACES_STATE_KEY);
  const rows=Array.isArray(document?.payload)?document.payload:[];
  const workspace=rows.find((row):row is CustomerWorkspaceStateRecord=>Boolean(row)&&typeof row==="object"&&(row as CustomerWorkspaceStateRecord).id===workspaceId&&(row as CustomerWorkspaceStateRecord).organizationId===organizationId);
  if(!workspace){
    await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:"staff.workspace.scope.denied",principalKind:"staff",principalId:input.principal.accountId,organizationId,workspaceId,targetType:"customer-workspace",targetId:workspaceId,outcome:"denied",requestId:input.requestId,correlationId:input.correlationId,detail:"Requested workspace did not match the supplied organization scope."});
    throw new StaffApiError(403,"WORKSPACE_SCOPE_MISMATCH","The requested workspace does not belong to the supplied organization scope");
  }
  return {organizationId,workspaceId,workspace};
}

export async function handleStaffQuery(input:{operation:string;body:StaffRequestBody;principal:StaffPrincipal;env:WorkerEnv;requestId:string;correlationId:string}){
  if(input.operation==="staff.session.get") return { principalId:input.principal.principalId, staffUserId:input.principal.staffUserId, organizationId:input.principal.organizationId, email:input.principal.email, permissions:input.principal.permissions, assurance:"cloudflare-access" as const };
  const repository=new D1DocumentRepository(input.env.DB);
  if(input.operation==="staff.state.snapshot.get"){
    const rows=await repository.list(STATE_NAMESPACE);
    return { documents: rows.filter((row)=>stateReadAllowed(input.principal,row.id)).map((row)=>({key:row.id,value:row.payload,version:row.version,updatedAt:row.updatedAt})), source:"d1" as const };
  }
  if(input.operation==="staff.gaming.operations.snapshot.get"){
    if(!hasPermission(input.principal,"gaming.read")) throw new StaffApiError(403,"FORBIDDEN","Gaming read permission is required");
    return gamingOperationsSnapshot(input.env.DB,input.principal,{paymentReview:Boolean(input.env.GAMING_API_ORIGIN&&input.env.GAMING_CMS_OPERATIONS_TOKEN),fulfillmentRetry:Boolean(input.env.GAMING_API_ORIGIN&&input.env.GAMING_CMS_OPERATIONS_TOKEN),refundManage:Boolean(input.env.GAMING_API_ORIGIN&&input.env.GAMING_CMS_OPERATIONS_TOKEN),riskReview:Boolean(input.env.GAMING_API_ORIGIN&&input.env.GAMING_CMS_OPERATIONS_TOKEN),notificationRetry:Boolean(input.env.GAMING_API_ORIGIN&&input.env.GAMING_CMS_OPERATIONS_TOKEN)});
  }
  if(input.operation==="staff.gaming.analytics.snapshot.get"){
    if(!hasPermission(input.principal,"gaming.read")) throw new StaffApiError(403,"FORBIDDEN","Gaming read permission is required");
    const query=input.body.input as Record<string,unknown>|undefined;
    return gamingAnalyticsSnapshot(input.env.DB,input.principal,query?.days);
  }
  if(input.operation==="staff.gaming.promotions.snapshot.get"){
    if(!hasPermission(input.principal,"gaming.read")) throw new StaffApiError(403,"FORBIDDEN","Gaming read permission is required");
    return gamingPromotionsSnapshot(input.env.DB,input.principal,Boolean(input.env.GAMING_API_ORIGIN&&input.env.GAMING_CMS_COMMERCE_TOKEN));
  }
  if(input.operation==="staff.gaming.support.snapshot.get"){
    if(!hasPermission(input.principal,"gaming.orders.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming order management permission is required");
    return gamingSupportSnapshot(input.env.DB,input.principal,Boolean(input.env.GAMING_API_ORIGIN&&input.env.GAMING_CMS_SUPPORT_TOKEN));
  }
  if(input.operation==="staff.gaming.customers.snapshot.get"){
    if(!hasPermission(input.principal,"gaming.orders.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming order management permission is required");
    return gamingCustomersSnapshot(input.env.DB,input.principal);
  }
  if(input.operation==="staff.state.document.get"){
    const record=input.body.input as Record<string,unknown>|undefined; const key=assertStateKey(record?.key);
    if(!stateReadAllowed(input.principal,key)) throw new StaffApiError(403,"FORBIDDEN","Staff permission does not allow this durable state document");
    const row=await repository.get(STATE_NAMESPACE,key);
    return row?{key,value:row.payload,version:row.version,updatedAt:row.updatedAt}:null;
  }
  if(input.operation==="staff.workspace.get"){
    if(!hasPermission(input.principal,"digital.website-platform.manage")) throw new StaffApiError(403,"FORBIDDEN","Website Platform permission is required");
    const scope=await requireCustomerWorkspaceScope({...input,repository});
    return scope.workspace;
  }
  if(input.operation==="staff.workspace.activity.list"){
    if(!hasPermission(input.principal,"digital.website-platform.manage")) throw new StaffApiError(403,"FORBIDDEN","Website Platform permission is required");
    const scope=await requireCustomerWorkspaceScope({...input,repository});
    const rows=await input.env.DB.prepare("SELECT id,action,principal_kind,principal_id,organization_id,workspace_id,target_type,target_id,outcome,request_id,correlation_id,detail,created_at FROM audit_events WHERE workspace_id=? AND organization_id=? ORDER BY created_at DESC LIMIT 200").bind(scope.workspaceId,scope.organizationId).all<any>();
    return rows.results;
  }
  if(input.operation==="staff.website-platform.queue.list"){
    if(!hasPermission(input.principal,"digital.website-platform.manage")) throw new StaffApiError(403,"FORBIDDEN","Website Platform permission is required");
    const rows=await input.env.DB.prepare("SELECT id,event_type,idempotency_key,organization_id,workspace_id,payload_json,state,attempt_count,created_at,updated_at FROM outbox_events ORDER BY created_at DESC LIMIT 200").all<any>();
    return rows.results.map((row)=>({...row,payload:JSON.parse(row.payload_json)}));
  }
  throw new StaffApiError(404,"NOT_FOUND",`No staff query handler is registered for ${input.operation}`);
}

export async function handleStaffCommand(input:{operation:string;body:StaffRequestBody;principal:StaffPrincipal;env:WorkerEnv;idempotencyKey:string;requestId:string;correlationId:string}){
  const repository=new D1DocumentRepository(input.env.DB); const idempotency=new D1IdempotencyRepository(input.env.DB);
  const commandInput=input.body.input as Record<string,unknown>|undefined;
  const requestHash=await sha256(canonical({operation:input.operation,input:commandInput,workspaceScope:input.body.workspaceScope}));
  const claim=await idempotency.claim({key:input.idempotencyKey,commandName:input.operation,principalFingerprint:`staff:${input.principal.accountId}:${input.principal.staffUserId}`,requestHash,ttlSeconds:86400});
  if(claim.outcome==="conflict") throw new StaffApiError(409,"IDEMPOTENCY_CONFLICT","Idempotency key was already used for a different command payload");
  if(claim.outcome==="replay"&&claim.record.state==="claimed") throw new StaffApiError(409,"IDEMPOTENCY_IN_PROGRESS","A command with this idempotency key is still in progress");
  if(claim.outcome==="replay"&&claim.record.state==="failed") throw new StaffApiError(409,"IDEMPOTENCY_PREVIOUSLY_FAILED","The previous command attempt with this idempotency key failed");
  try{
  if(input.operation==="staff.media.upload.create"){
      const purpose=String(commandInput?.purpose||"");
      const required=purpose==="support_evidence"?"gaming.orders.manage":"gaming.products.manage";
      if(!hasPermission(input.principal,required)) throw new StaffApiError(403,"FORBIDDEN","Staff permission does not allow this media upload");
      if(claim.outcome==="replay"){try{return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true};}catch{throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed media upload result cannot be replayed safely");}}
      let response:Record<string,unknown>;
      try{response=await createMediaUpload(input.env,input.principal,commandInput||{});}catch(error){const code=error instanceof Error?error.message:"MEDIA_UPLOAD_FAILED";const status=code==="MEDIA_FORBIDDEN"?403:code.includes("NOT_FOUND")?404:code==="MEDIA_SIGNING_NOT_CONFIGURED"?503:400;throw new StaffApiError(status,code,"Media upload could not be created");}
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"media.asset",targetId:String(response.assetId||""),outcome:"upload_pending",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({assetId:String(response.assetId||""),purpose})});
      return response;
    }
    if(input.operation==="staff.media.upload.finalize"){
      if(claim.outcome==="replay"){try{return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true};}catch{throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed media finalize result cannot be replayed safely");}}
      let response:Record<string,unknown>;
      try{response=await finalizeMediaUpload(input.env,input.principal,commandInput||{}) as unknown as Record<string,unknown>;}catch(error){const code=error instanceof Error?error.message:"MEDIA_FINALIZE_FAILED";const status=code==="MEDIA_FORBIDDEN"?403:code.includes("NOT_FOUND")?404:code==="MEDIA_VERSION_CONFLICT"?409:400;throw new StaffApiError(status,code,"Media upload could not be finalized");}
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"media.asset",targetId:String(response.assetId||""),outcome:"ready",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({assetId:String(response.assetId||""),purpose:String(response.purpose||"")})});
      return response;
    }
    if(input.operation==="staff.gaming.promotion.create"){
      if(!hasPermission(input.principal,"gaming.products.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming product management permission is required");
      if(claim.outcome==="replay"){try{return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true};}catch{throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed promotion create result cannot be replayed safely");}}
      const response=await createGamingPromotion(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const campaignId=typeof response?.campaignId==="string"?response.campaignId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.promotion.campaign",targetId:campaignId,outcome:String(response?.status||"created"),requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({campaignId,name:String(response?.name||"")})});
      return response;
    }
    if(input.operation==="staff.gaming.promotion.update"){
      if(!hasPermission(input.principal,"gaming.products.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming product management permission is required");
      if(claim.outcome==="replay"){try{return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true};}catch{throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed promotion update result cannot be replayed safely");}}
      const response=await updateGamingPromotion(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const campaignId=typeof response?.campaignId==="string"?response.campaignId:String(commandInput?.campaignId||"");
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.promotion.campaign",targetId:campaignId,outcome:String(response?.status||"updated"),requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({campaignId,name:String(response?.name||"")})});
      return response;
    }
    if(input.operation==="staff.gaming.payment.review"){
      if(!hasPermission(input.principal,"gaming.finance.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming finance permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed payment review result cannot be replayed safely"); }
      }
      const response=await reviewGamingPayment(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const order=response.order as Record<string,unknown>;
      const orderId=typeof order?.orderId==="string"?order.orderId:"";
      const paymentInput=commandInput??{};
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.payment.proof",targetId:response.proofId,outcome:response.decision,requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,proofId:response.proofId,decision:response.decision,...(response.decision==="verified"?{receivedAmountLkr:Number(paymentInput.receivedAmountLkr),receivedAt:String(paymentInput.receivedAt||"")}:{})})});
      return response;
    }
    if(input.operation==="staff.gaming.refund.create"){
      if(!hasPermission(input.principal,"gaming.finance.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming finance permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed refund request cannot be replayed safely"); }
      }
      const response=await createGamingRefund(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const refundId=typeof response?.refundId==="string"?response.refundId:"";
      const orderId=typeof response?.orderId==="string"?response.orderId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.refund",targetId:refundId||orderId,outcome:"requested",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,refundId:refundId||undefined,amountLkr:Number(commandInput?.amountLkr||0),reasonCode:String(commandInput?.reasonCode||"")})});
      return response;
    }
    if(input.operation==="staff.gaming.refund.decision"){
      if(!hasPermission(input.principal,"gaming.finance.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming finance permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed refund decision cannot be replayed safely"); }
      }
      const response=await decideGamingRefund(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const refundId=typeof response?.refundId==="string"?response.refundId:String(commandInput?.refundId||"");
      const orderId=typeof response?.orderId==="string"?response.orderId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.refund",targetId:refundId,outcome:String(commandInput?.decision||""),requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,refundId})});
      return response;
    }
    if(input.operation==="staff.gaming.refund.sent"){
      if(!hasPermission(input.principal,"gaming.finance.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming finance permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed refund payout record cannot be replayed safely"); }
      }
      const response=await markGamingRefundSent(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const refundId=typeof response?.refundId==="string"?response.refundId:String(commandInput?.refundId||"");
      const orderId=typeof response?.orderId==="string"?response.orderId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.refund",targetId:refundId,outcome:"sent",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,refundId,sentAt:String(commandInput?.sentAt||""),supplierRecoveryLkr:Number(commandInput?.supplierRecoveryLkr||0),gatewayFeeRecoveredLkr:Number(commandInput?.gatewayFeeRecoveredLkr||0)})});
      return response;
    }
    if(input.operation==="staff.gaming.refund.complete"){
      if(!hasPermission(input.principal,"gaming.finance.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming finance permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed refund result cannot be replayed safely"); }
      }
      const response=await completeGamingRefund(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const refund=response?.refund as Record<string,unknown>|undefined;
      const refundId=typeof refund?.refundId==="string"?refund.refundId:String(commandInput?.refundId||"");
      const orderId=typeof refund?.orderId==="string"?refund.orderId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.refund",targetId:refundId,outcome:"completed",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,refundId})});
      return response;
    }
    if(input.operation==="staff.gaming.risk.review"){
      if(!hasPermission(input.principal,"gaming.orders.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming order management permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed risk decision cannot be replayed safely"); }
      }
      const response=await decideGamingRisk(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const assessment=response?.assessment as Record<string,unknown>|undefined;
      const assessmentId=typeof assessment?.assessmentId==="string"?assessment.assessmentId:String(commandInput?.assessmentId||"");
      const orderId=typeof assessment?.orderId==="string"?assessment.orderId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.risk.assessment",targetId:assessmentId,outcome:String(commandInput?.decision||""),requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,assessmentId,decision:String(commandInput?.decision||"")})});
      return response;
    }
    if(input.operation==="staff.gaming.notification.retry"){
      if(!hasPermission(input.principal,"gaming.orders.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming order management permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed notification retry result cannot be replayed safely"); }
      }
      const response=await retryGamingNotification(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const notification=response.notification as Record<string,unknown>;
      const orderId=typeof notification?.orderId==="string"?notification.orderId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.notification",targetId:response.notificationId,outcome:"queued",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,notificationId:response.notificationId})});
      return response;
    }
    if(input.operation==="staff.gaming.support.case.create"){
      if(!hasPermission(input.principal,"gaming.orders.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming order management permission is required");
      if(claim.outcome==="replay"){try{return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true};}catch{throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed support case result cannot be replayed safely");}}
      const response=await createGamingSupportCase(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const caseRow=(response?.case||{}) as Record<string,unknown>;const caseId=String(caseRow.caseId||"");const orderId=String(caseRow.orderId||"");
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.support.case",targetId:caseId,outcome:"open",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId,caseId,category:String(caseRow.category||""),priority:String(caseRow.priority||"")})});
      return response;
    }
    if(input.operation==="staff.gaming.support.case.command"){
      if(!hasPermission(input.principal,"gaming.orders.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming order management permission is required");
      if(claim.outcome==="replay"){try{return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true};}catch{throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed support action result cannot be replayed safely");}}
      const response=await commandGamingSupportCase(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const caseRow=(response?.case||{}) as Record<string,unknown>;const caseId=String(caseRow.caseId||commandInput?.caseId||"");const orderId=String(caseRow.orderId||"");
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.support.case",targetId:caseId,outcome:String(commandInput?.action||"updated"),requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId,caseId,action:String(commandInput?.action||"")})});
      return response;
    }
    if(input.operation==="staff.gaming.fulfillment.retry"){
      if(!hasAny(input.principal,["gaming.orders.manage","gaming.suppliers.manage"])) throw new StaffApiError(403,"FORBIDDEN","Gaming order or supplier management permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed fulfillment retry result cannot be replayed safely"); }
      }
      const response=await retryGamingFulfillment(input.env,commandInput,input.requestId,input.correlationId,{accountId:input.principal.accountId,staffUserId:input.principal.staffUserId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      const job=response.job as Record<string,unknown>;
      const orderId=typeof job?.orderId==="string"?job.orderId:"";
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"gaming.fulfillment.job",targetId:response.jobId,outcome:"queued",requestId:input.requestId,correlationId:input.correlationId,detail:JSON.stringify({orderId:orderId||undefined,jobId:response.jobId})});
      return response;
    }
    if(input.operation==="staff.state.document.put"){
      const key=assertStateKey(commandInput?.key); if(!stateWriteAllowed(input.principal,key)) throw new StaffApiError(403,"FORBIDDEN","Staff permission does not allow this durable state mutation");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as {key:string;version:number;updatedAt:string},replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed command result cannot be replayed safely"); }
      }
      const row=await repository.put(STATE_NAMESPACE,key,commandInput?.value,{organizationId:input.principal.organizationId,expectedVersion:integerOrUndefined(commandInput?.expectedVersion)});
      const response={key,version:row.version,updatedAt:row.updatedAt};
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"durable-state",targetId:key,outcome:"completed",requestId:input.requestId,correlationId:input.correlationId,detail:`Durable CMS state updated to version ${row.version}.`});
      return response;
    }
    if(input.operation==="staff.state.document.delete"){
      const key=assertStateKey(commandInput?.key); if(!stateWriteAllowed(input.principal,key)) throw new StaffApiError(403,"FORBIDDEN","Staff permission does not allow this durable state mutation");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as {key:string;deleted:true},replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed command result cannot be replayed safely"); }
      }
      await repository.remove(STATE_NAMESPACE,key,integerOrUndefined(commandInput?.expectedVersion));
      const response={key,deleted:true as const};
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      await recordAudit(input.env.DB,{id:crypto.randomUUID(),action:input.operation,principalKind:"staff",principalId:input.principal.accountId,organizationId:input.principal.organizationId,targetType:"durable-state",targetId:key,outcome:"completed",requestId:input.requestId,correlationId:input.correlationId,detail:"Durable CMS state document soft-deleted."});
      return response;
    }
    if(input.operation==="staff.system.maintenance.run"){
      if(!hasPermission(input.principal,"platform.cleanup.manage")) throw new StaffApiError(403,"FORBIDDEN","Platform cleanup permission is required");
      if(claim.outcome==="replay"){
        try { return {...JSON.parse(claim.record.response_reference) as Record<string,unknown>,replayed:true}; }
        catch { throw new StaffApiError(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","The completed maintenance result cannot be replayed safely"); }
      }
      const response=await runMaintenance(input.env,"staff",{principalId:input.principal.accountId,requestId:input.requestId,correlationId:input.correlationId});
      await idempotency.complete(input.idempotencyKey,JSON.stringify(response));
      return response;
    }
    throw new StaffApiError(404,"NOT_FOUND",`No staff command handler is registered for ${input.operation}`);
  }catch(error){
    const mapped = error instanceof StaffApiError ? error : error instanceof GamingControlError ? new StaffApiError(error.status,error.code,error.message) : error instanceof Error && error.message.includes("Optimistic concurrency conflict") ? new StaffApiError(409,"CONFLICT","Durable state changed since this CMS session loaded. Refresh before retrying the mutation.") : error;
    if(claim.outcome==="claimed") await idempotency.fail(input.idempotencyKey,mapped instanceof StaffApiError?mapped.code:"INTERNAL_ERROR");
    throw mapped;
  }
}

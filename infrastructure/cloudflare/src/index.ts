import type { ProductionEvent, QueueMessageBatchLike, ScheduledControllerLike, WorkerEnv } from "./env";
import { AccessVerificationError, verifyAccessAssertion } from "./access";
import { enforcePublicRateLimit, verifyTurnstile } from "./publicIngress";
import { D1IdempotencyRepository } from "./idempotency";
import { runMaintenance } from "./maintenance";
import { json, originAllowed, problem, requestId } from "./http";
import { handleStaffCommand, handleStaffQuery, resolveStaffPrincipal, StaffApiError, type StaffRequestBody } from "./staff";
import { handleNextfProjectRequest } from "./mainSiteIngest";
import { servePrivateMedia, servePublicMedia } from "./media";

const corsHeaders=(origin:string|null,env:WorkerEnv):Record<string,string>=>{
  const allowed=[env.CMS_ORIGIN,env.WORKSPACE_ORIGIN,env.PUBLIC_SITE_ORIGIN];
  return origin&&allowed.includes(origin)?{"access-control-allow-origin":origin,"access-control-allow-credentials":"true","access-control-allow-headers":"content-type,idempotency-key,x-turnstile-token,x-correlation-id,x-request-id","access-control-allow-methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS","vary":"origin"}:{};
};
async function health(env:WorkerEnv){
  const db=await env.DB.prepare("SELECT 1 AS ok").first<{ok:number}>();
  return {status:db?.ok===1?"ok":"degraded",environment:env.ENVIRONMENT,bindings:{d1:Boolean(env.DB),r2:Boolean(env.FILES),mediaR2:Boolean(env.MEDIA),queue:Boolean(env.EVENTS),rateLimiter:Boolean(env.PUBLIC_RATE_LIMITER)},staffDurableState:true};
}
function canonical(value:unknown):string{
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}
async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,"0")).join("");}
async function publicCommand(request:Request,env:WorkerEnv,route:string,id:string){
  if(!(await enforcePublicRateLimit(request,env,route))) return problem(429,"RATE_LIMITED","Public request rate limit exceeded",id);
  const idempotencyKey=request.headers.get("idempotency-key");
  if(!idempotencyKey) return problem(400,"IDEMPOTENCY_KEY_REQUIRED","Public mutation requires Idempotency-Key",id);
  let payload:Record<string,unknown>;
  try{payload=await request.json() as Record<string,unknown>;}catch{return problem(400,"VALIDATION_FAILED","Public mutation body must be valid JSON",id);}
  const idempotency=new D1IdempotencyRepository(env.DB);
  const principalFingerprint=`public:${route}:${request.headers.get("origin")||env.PUBLIC_SITE_ORIGIN}`;
  const requestHash=await sha256(canonical({route,payload}));
  const existing=await idempotency.get(idempotencyKey);
  if(existing){
    const same=existing.command_name===route&&existing.principal_fingerprint===principalFingerprint&&existing.request_hash===requestHash;
    if(!same) return problem(409,"IDEMPOTENCY_CONFLICT","Idempotency key was already used for a different public mutation",id);
    if(existing.state==="completed"&&existing.response_reference){
      try{return json({ok:true,requestId:id,data:{...JSON.parse(existing.response_reference),replayed:true}},202);}catch{return problem(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","Completed public mutation receipt is unavailable",id);}
    }
    if(existing.state==="claimed") return problem(409,"IDEMPOTENCY_IN_PROGRESS","A public mutation with this Idempotency-Key is already in progress",id);
  }
  const turnstile=request.headers.get("x-turnstile-token")||"";
  if(!(await verifyTurnstile(turnstile,request,env))) return problem(403,"ABUSE_PROTECTION_FAILED","Turnstile verification failed",id);
  const claim=await idempotency.claim({key:idempotencyKey,commandName:route,principalFingerprint,requestHash,ttlSeconds:86400});
  if(claim.outcome==="conflict") return problem(409,"IDEMPOTENCY_CONFLICT","Idempotency key was already used for a different public mutation",id);
  if(claim.outcome==="replay"){
    if(claim.record.state==="completed"&&claim.record.response_reference){
      try{return json({ok:true,requestId:id,data:{...JSON.parse(claim.record.response_reference),replayed:true}},202);}catch{return problem(409,"IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE","Completed public mutation receipt is unavailable",id);}
    }
    return problem(409,"IDEMPOTENCY_IN_PROGRESS","A public mutation with this Idempotency-Key is already in progress",id);
  }
  const event:ProductionEvent={id:crypto.randomUUID(),type:route,idempotencyKey,occurredAt:new Date().toISOString(),payload};
  const receipt={receiptId:event.id,accepted:true};
  try{
    await env.EVENTS.send(event,{contentType:"json"});
    await idempotency.complete(idempotencyKey,JSON.stringify(receipt));
    return json({ok:true,requestId:id,data:{...receipt,replayed:false}},202);
  }catch(error){
    await idempotency.fail(idempotencyKey,"PUBLIC_EVENT_ENQUEUE_FAILED");
    throw error;
  }
}

function staffRoute(pathname:string){
  const match=pathname.match(/^\/v1\/staff\/(queries|commands)\/([^/]+)$/);
  if(!match) return undefined;
  return {kind:match[1]==="queries"?"query" as const:"command" as const,operation:decodeURIComponent(match[2])};
}

async function staffResponse(request:Request,env:WorkerEnv,id:string,route:{kind:"query"|"command";operation:string}){
  if(request.method!=="POST") return problem(405,"METHOD_NOT_ALLOWED","Staff API operations require POST",id);
  const correlationId=request.headers.get("x-correlation-id")||crypto.randomUUID();
  try{
    const identity=await verifyAccessAssertion(request,env);
    const principal=await resolveStaffPrincipal(env.DB,identity);
    const body=await request.json() as StaffRequestBody;
    if(route.kind==="query"){
      const data=await handleStaffQuery({operation:route.operation,body,principal,env,requestId:id,correlationId});
      return json({ok:true,requestId:id,correlationId,data});
    }
    const idempotencyKey=request.headers.get("idempotency-key");
    if(!idempotencyKey) return json({ok:false,requestId:id,correlationId,problem:{code:"IDEMPOTENCY_KEY_REQUIRED",title:"Idempotency key required",detail:"Staff mutations require Idempotency-Key",requestId:id,correlationId,retryable:false}},400);
    const data=await handleStaffCommand({operation:route.operation,body,principal,env,idempotencyKey,requestId:id,correlationId});
    return json({ok:true,requestId:id,correlationId,data});
  }catch(error){
    const status=error instanceof StaffApiError||error instanceof AccessVerificationError?error.status:500;
    const code=error instanceof StaffApiError||error instanceof AccessVerificationError?error.code:"INTERNAL_ERROR";
    const detail=error instanceof Error?error.message:"Unexpected staff API failure";
    return json({ok:false,requestId:id,correlationId,problem:{code,title:code.replaceAll("_"," "),detail,requestId:id,correlationId,retryable:status>=500}},status);
  }
}

export default {
  async fetch(request:Request,env:WorkerEnv):Promise<Response>{
    const id=requestId(request); const url=new URL(request.url); const origin=request.headers.get("origin"); const allowed=[env.CMS_ORIGIN,env.WORKSPACE_ORIGIN,env.PUBLIC_SITE_ORIGIN];
    const mediaHost=env.MEDIA_ORIGIN?new URL(env.MEDIA_ORIGIN).host:"media.nextf.lk";
    if(url.host===mediaHost){
      const publicAsset=url.pathname.match(/^\/a\/([^/]+)$/);
      if(publicAsset&&(request.method==="GET"||request.method==="HEAD")) return servePublicMedia(request,env,decodeURIComponent(publicAsset[1]));
      return new Response("Not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
    }
    if(!originAllowed(origin,allowed)) return problem(403,"ORIGIN_DENIED","Request origin is not allowlisted",id);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders(origin,env)});
    let response:Response;
    try{
      const staff=staffRoute(url.pathname);
      if(url.pathname==="/auth/complete"&&request.method==="GET"){
        const identity=await verifyAccessAssertion(request,env);
        await resolveStaffPrincipal(env.DB,identity);
        response=new Response(null,{status:302,headers:{location:env.CMS_ORIGIN,"cache-control":"no-store"}});
      }
      else if(url.pathname==="/health"&&request.method==="GET") response=json({ok:true,requestId:id,data:await health(env)});
      else if(request.method==="GET"&&url.pathname.match(/^\/v1\/staff\/media\/[^/]+\/download$/)){
        const identity=await verifyAccessAssertion(request,env); const principal=await resolveStaffPrincipal(env.DB,identity); const assetId=decodeURIComponent(url.pathname.split("/")[4]||"");
        if(!principal.permissions.includes("gaming.orders.manage")) throw new StaffApiError(403,"FORBIDDEN","Gaming order management permission is required");
        response=await servePrivateMedia(env,principal,assetId);
      }
      else if(url.pathname==="/v1/integrations/nextf/project-requests") response=await handleNextfProjectRequest(request,env,id);
      else if(url.pathname==="/v1/public/leads"&&request.method==="POST") response=await publicCommand(request,env,"public.lead.submit",id);
      else if(url.pathname==="/v1/public/demo-access"&&request.method==="POST") response=await publicCommand(request,env,"public.demo-access.request",id);
      else if(url.pathname==="/v1/public/conversions"&&request.method==="POST") response=await publicCommand(request,env,"public.conversion.track",id);
      else if(staff) response=await staffResponse(request,env,id,staff);
      else response=problem(404,"NOT_FOUND","No production API route is registered",id);
    }catch(error){response=problem(500,"INTERNAL_ERROR",error instanceof Error?error.message:"Unexpected production adapter failure",id)}
    const headers=new Headers(response.headers); for(const [key,value] of Object.entries(corsHeaders(origin,env))) headers.set(key,value); headers.set("x-request-id",id); headers.set("x-content-type-options","nosniff"); headers.set("referrer-policy","no-referrer");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(controller: ScheduledControllerLike, env: WorkerEnv) {
    await runMaintenance(env,"scheduled");
  },
  async queue(batch: QueueMessageBatchLike<ProductionEvent>, env: WorkerEnv) {
    for (const message of batch.messages) {
      const event = message.body;
      try {
        if (event.type === "system.demo.expiry-sweep" || event.type === "system.retention.cleanup" || event.type === "system.idempotency.cleanup") {
          await runMaintenance(env,"scheduled");
          message.ack();
          continue;
        }
        await env.DB.prepare("INSERT OR IGNORE INTO outbox_events(id,event_type,idempotency_key,organization_id,workspace_id,payload_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,\'pending\',?,?)").bind(event.id,event.type,event.idempotencyKey,event.organizationId??null,event.workspaceId??null,JSON.stringify(event.payload),event.occurredAt,new Date().toISOString()).run();
        message.ack();
      } catch {
        message.retry();
      }
    }
  }
};

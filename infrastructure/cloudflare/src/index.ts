import type { ProductionEvent, QueueMessageBatchLike, ScheduledControllerLike, WorkerEnv } from "./env";
import { AccessVerificationError, verifyAccessAssertion } from "./access";
import { enforcePublicRateLimit, verifyTurnstile } from "./publicIngress";
import { json, originAllowed, problem, requestId } from "./http";
import { handleStaffCommand, handleStaffQuery, resolveStaffPrincipal, StaffApiError, type StaffRequestBody } from "./staff";

const corsHeaders=(origin:string|null,env:WorkerEnv):Record<string,string>=>{
  const allowed=[env.CMS_ORIGIN,env.WORKSPACE_ORIGIN,env.PUBLIC_SITE_ORIGIN];
  return origin&&allowed.includes(origin)?{"access-control-allow-origin":origin,"access-control-allow-credentials":"true","access-control-allow-headers":"content-type,idempotency-key,x-turnstile-token,x-correlation-id,x-request-id","access-control-allow-methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS","vary":"origin"}:{};
};
async function health(env:WorkerEnv){
  const db=await env.DB.prepare("SELECT 1 AS ok").first<{ok:number}>();
  return {status:db?.ok===1?"ok":"degraded",environment:env.ENVIRONMENT,bindings:{d1:Boolean(env.DB),r2:Boolean(env.FILES),queue:Boolean(env.EVENTS),rateLimiter:Boolean(env.PUBLIC_RATE_LIMITER)},staffDurableState:true};
}
async function publicCommand(request:Request,env:WorkerEnv,route:string,id:string){
  const turnstile=request.headers.get("x-turnstile-token")||"";
  if(!(await enforcePublicRateLimit(request,env,route))) return problem(429,"RATE_LIMITED","Public request rate limit exceeded",id);
  if(!(await verifyTurnstile(turnstile,request,env))) return problem(403,"ABUSE_PROTECTION_FAILED","Turnstile verification failed",id);
  const idempotencyKey=request.headers.get("idempotency-key"); if(!idempotencyKey) return problem(400,"IDEMPOTENCY_KEY_REQUIRED","Public mutation requires Idempotency-Key",id);
  const payload=await request.json() as Record<string,unknown>;
  const event:ProductionEvent={id:crypto.randomUUID(),type:route,idempotencyKey,occurredAt:new Date().toISOString(),payload};
  await env.EVENTS.send(event,{contentType:"json"});
  return json({ok:true,requestId:id,data:{receiptId:event.id,accepted:true}},202);
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
    if(!originAllowed(origin,allowed)) return problem(403,"ORIGIN_DENIED","Request origin is not allowlisted",id);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders(origin,env)});
    let response:Response;
    try{
      const staff=staffRoute(url.pathname);
      if(url.pathname==="/health"&&request.method==="GET") response=json({ok:true,requestId:id,data:await health(env)});
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
    const occurredAt = new Date(controller.scheduledTime || Date.now()).toISOString();
    for (const type of ["system.demo.expiry-sweep", "system.retention.cleanup", "system.idempotency.cleanup"]) {
      const event: ProductionEvent = { id: crypto.randomUUID(), type, idempotencyKey: `${type}:${occurredAt.slice(0,13)}`, occurredAt, payload: { cron: controller.cron } };
      await env.EVENTS.send(event, { contentType: "json" });
    }
  },
  async queue(batch: QueueMessageBatchLike<ProductionEvent>, env: WorkerEnv) {
    for (const message of batch.messages) {
      const event = message.body;
      try {
        if (event.type === "system.idempotency.cleanup") {
          await env.DB.prepare("DELETE FROM idempotency_records WHERE expires_at <= ?").bind(new Date().toISOString()).run();
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

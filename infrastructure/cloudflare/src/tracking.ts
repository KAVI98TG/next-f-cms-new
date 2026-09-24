import type { TrackingQueueMessage, WorkerEnv } from "./env";
import { json, problem } from "./http";

type RecordValue = Record<string, unknown>;
type Disposition = "accepted" | "duplicate" | "restricted" | "rejected";
type Reason = "none" | "consent-denied" | "unknown-event" | "invalid-schema" | "invalid-origin" | "invalid-environment" | "unsupported-version" | "payload-limit" | "rate-limited" | "prohibited-property" | "bot-or-invalid-traffic";
type ItemResult = { eventId: string; status: Disposition; reasonCode: Reason; receivedAt: string; processingId?: string };

const MAX_BYTES=64*1024;
const MAX_EVENTS=20;
const MAX_PROPERTIES=32;
const ENVIRONMENTS=new Set(["development","preview","staging","production"]);
const PROHIBITED_KEY=/(password|passcode|secret|token|authorization|cookie|cvv|cvc|card(number)?|pan|email|phone|address|first.?name|last.?name|full.?name)/i;

const asRecord=(value:unknown):RecordValue|undefined=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as RecordValue:undefined;
const text=(value:unknown,max=160)=>typeof value==="string"&&value.trim().length>0&&value.length<=max?value.trim():undefined;
const validDate=(value:unknown)=>typeof value==="string"&&!Number.isNaN(Date.parse(value));
const configured=(value:string)=>new Set(value.split(",").map((item)=>item.trim()).filter(Boolean));

async function readBoundedJson(request:Request):Promise<RecordValue>{
  const declared=Number(request.headers.get("content-length")||0);
  if(declared>MAX_BYTES) throw new Error("PAYLOAD_LIMIT");
  const buffer=await request.arrayBuffer();
  if(buffer.byteLength>MAX_BYTES) throw new Error("PAYLOAD_LIMIT");
  try{const value=JSON.parse(new TextDecoder().decode(buffer));const record=asRecord(value);if(!record)throw new Error("VALIDATION");return record;}
  catch(error){if(error instanceof Error&&error.message==="PAYLOAD_LIMIT")throw error;throw new Error("VALIDATION");}
}

function analyticsConsentGranted(event:RecordValue){
  const context=asRecord(event.context);const consent=asRecord(context?.consent);const preferences=Array.isArray(consent?.preferences)?consent.preferences:[];
  return preferences.some((item)=>{const preference=asRecord(item);return preference?.categoryKey==="analytics"&&preference?.state==="granted";});
}

function hasProhibitedProperty(value:RecordValue){
  return Object.entries(value).some(([key,item])=>PROHIBITED_KEY.test(key)||typeof item==="function"||typeof item==="symbol"||typeof item==="bigint");
}

function validateEvent(value:unknown,input:{siteId:string;organizationId:string;source:"browser"|"server";eventKeys:Set<string>;versions:Set<string>;receivedAt:string}):{result?:ItemResult;message?:TrackingQueueMessage["event"]}{
  const event=asRecord(value);const eventId=text(event?.eventId);const eventKey=text(event?.eventKey);const occurredAt=event?.occurredAt;const schemaVersion=text(event?.schemaVersion,40);
  const reject=(reasonCode:Reason):{result:ItemResult}=>({result:{eventId:eventId||"unknown",status:"rejected",reasonCode,receivedAt:input.receivedAt}});
  if(!event||!eventId||!eventKey||!validDate(occurredAt)||!schemaVersion||event.debug!==Boolean(event.debug))return reject("invalid-schema");
  if(!input.versions.has(schemaVersion))return reject("unsupported-version");
  if(!input.eventKeys.has(eventKey))return reject("unknown-event");
  const scope=asRecord(event.scope);if(scope?.siteId!==input.siteId||scope?.organizationId!==input.organizationId)return reject("invalid-schema");
  if(event.source!==input.source)return reject("invalid-schema");
  const context=asRecord(event.context);const properties=asRecord(event.properties);
  if(!context||!properties||Object.keys(properties).length>MAX_PROPERTIES)return reject("payload-limit");
  if(hasProhibitedProperty(properties))return reject("prohibited-property");
  if(!analyticsConsentGranted(event))return {result:{eventId,status:"restricted",reasonCode:"consent-denied",receivedAt:input.receivedAt}};
  return {message:{eventId,eventKey,occurredAt:String(occurredAt),schemaVersion,debug:Boolean(event.debug),context,properties,source:input.source}};
}

async function recordHealth(env:WorkerEnv,siteId:string,environment:string,delta:{received?:number;accepted?:number;rejected?:number;duplicate?:number;restricted?:number;schema?:number;unknown?:number},metadata?:{receivedAt:string;sdkId:string;sdkVersion:string}){
  const now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO tracking_health_counters(site_id,environment,received_count,accepted_count,rejected_count,duplicate_count,consent_restricted_count,schema_error_count,unknown_event_count,processing_failure_count,last_event_received_at,last_sdk_id,last_sdk_version,last_contract_version,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)
    ON CONFLICT(site_id,environment) DO UPDATE SET received_count=received_count+excluded.received_count,accepted_count=accepted_count+excluded.accepted_count,rejected_count=rejected_count+excluded.rejected_count,duplicate_count=duplicate_count+excluded.duplicate_count,consent_restricted_count=consent_restricted_count+excluded.consent_restricted_count,schema_error_count=schema_error_count+excluded.schema_error_count,unknown_event_count=unknown_event_count+excluded.unknown_event_count,last_event_received_at=COALESCE(excluded.last_event_received_at,last_event_received_at),last_sdk_id=COALESCE(excluded.last_sdk_id,last_sdk_id),last_sdk_version=COALESCE(excluded.last_sdk_version,last_sdk_version),last_contract_version=excluded.last_contract_version,updated_at=excluded.updated_at`)
    .bind(siteId,environment,delta.received||0,delta.accepted||0,delta.rejected||0,delta.duplicate||0,delta.restricted||0,delta.schema||0,delta.unknown||0,metadata?.receivedAt??null,metadata?.sdkId??null,metadata?.sdkVersion??null,env.TRACKING_CONTRACT_VERSION,now).run();
}

function serverAuthorized(request:Request,env:WorkerEnv){
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  return Boolean(env.TRACKING_SERVER_TOKEN&&token&&token===env.TRACKING_SERVER_TOKEN);
}

export async function handleTrackingIngestion(request:Request,env:WorkerEnv,requestId:string,source:"browser"|"server"){
  if(request.method!=="POST")return problem(405,"METHOD_NOT_ALLOWED","Tracking ingestion requires POST",requestId);
  const origin=request.headers.get("origin");
  if(source==="browser"&&!configured(env.TRACKING_ALLOWED_ORIGINS).has(origin||""))return problem(403,"INVALID_ORIGIN","Tracking origin is not configured for this Site",requestId);
  if(source==="server"&&!serverAuthorized(request,env))return problem(401,"UNAUTHORIZED","Server tracking credentials are missing or invalid",requestId);
  const rate=await env.PUBLIC_RATE_LIMITER.limit({key:`tracking:${source}:${origin||"server"}`});
  if(!rate.success)return problem(429,"RATE_LIMITED","Tracking request rate limit exceeded",requestId);
  let body:RecordValue;try{body=await readBoundedJson(request);}catch(error){return problem(error instanceof Error&&error.message==="PAYLOAD_LIMIT"?413:400,error instanceof Error&&error.message==="PAYLOAD_LIMIT"?"PAYLOAD_LIMIT":"VALIDATION_FAILED","Tracking body is invalid or exceeds collector limits",requestId);}
  const batchId=text(body.batchId);const siteId=text(body.siteId);const environment=text(body.environment);const sdk=asRecord(body.sdk);const sdkId=text(sdk?.sdkId,80);const sdkVersion=text(sdk?.sdkVersion,40);const events=Array.isArray(body.events)?body.events:[];
  if(!batchId||siteId!==env.TRACKING_SITE_ID||!environment||!ENVIRONMENTS.has(environment)||!sdkId||!sdkVersion||!validDate(body.sentAt)||events.length<1||events.length>MAX_EVENTS)return problem(400,"VALIDATION_FAILED","Tracking batch does not match the configured Site, environment, SDK or limits",requestId);
  if(environment!==env.ENVIRONMENT)return problem(400,"INVALID_ENVIRONMENT","Tracking environment is isolated from this collector",requestId);
  if(!configured(env.TRACKING_SDK_VERSIONS).has(sdkVersion))return problem(400,"UNSUPPORTED_VERSION","Tracking SDK version is not compatible with this collector",requestId);
  const receivedAt=new Date().toISOString();const results:ItemResult[]=[];const queue:TrackingQueueMessage[]=[];
  for(const raw of events){
    const validated=validateEvent(raw,{siteId,organizationId:env.TRACKING_ORGANIZATION_ID,source,eventKeys:configured(env.TRACKING_EVENT_KEYS),versions:configured(env.TRACKING_ENVELOPE_VERSIONS),receivedAt});
    if(validated.result){results.push(validated.result);continue;}
    const event=validated.message!;
    const inserted=await env.DB.prepare("INSERT OR IGNORE INTO tracking_ingestion_events(site_id,environment,event_id,batch_id,event_key,occurred_at,received_at,status,sdk_id,sdk_version,schema_version) VALUES(?,?,?,?,?,?,?,'queued',?,?,?)").bind(siteId,environment,event.eventId,batchId,event.eventKey,event.occurredAt,receivedAt,sdkId,sdkVersion,event.schemaVersion).run();
    if(Number(inserted.meta?.changes||0)===0){results.push({eventId:event.eventId,status:"duplicate",reasonCode:"none",receivedAt});continue;}
    const processingId=crypto.randomUUID();queue.push({kind:"first-party-tracking",batchId,receivedAt,siteId,organizationId:env.TRACKING_ORGANIZATION_ID,environment:environment as TrackingQueueMessage["environment"],sdk:{sdkId,sdkVersion},event});
    results.push({eventId:event.eventId,status:"accepted",reasonCode:"none",receivedAt,processingId});
  }
  for(let index=0;index<queue.length;index++){
    const message=queue[index];
    try{await env.TRACKING_EVENTS.send(message,{contentType:"json"});}
    catch(error){for(const unsent of queue.slice(index))await env.DB.prepare("DELETE FROM tracking_ingestion_events WHERE site_id=? AND environment=? AND event_id=? AND status='queued'").bind(unsent.siteId,unsent.environment,unsent.event.eventId).run();throw error;}
  }
  const count=(status:Disposition)=>results.filter((item)=>item.status===status).length;
  await recordHealth(env,siteId,environment,{received:events.length,accepted:count("accepted"),rejected:count("rejected"),duplicate:count("duplicate"),restricted:count("restricted"),schema:results.filter((item)=>item.reasonCode==="invalid-schema"||item.reasonCode==="unsupported-version"||item.reasonCode==="payload-limit"||item.reasonCode==="prohibited-property").length,unknown:results.filter((item)=>item.reasonCode==="unknown-event").length},{receivedAt,sdkId,sdkVersion});
  const receipt={receiptId:crypto.randomUUID(),batchId,requestId,receivedAt,acceptedCount:count("accepted"),duplicateCount:count("duplicate"),restrictedCount:count("restricted"),rejectedCount:count("rejected"),results};
  return json({ok:true,requestId,data:receipt},202);
}

export async function processTrackingEvent(env:WorkerEnv,message:TrackingQueueMessage){
  const hour=new Date(message.event.occurredAt);hour.setUTCMinutes(0,0,0);const hourStart=hour.toISOString();const processedAt=new Date().toISOString();
  const existing=await env.DB.prepare("SELECT status FROM tracking_ingestion_events WHERE site_id=? AND environment=? AND event_id=?").bind(message.siteId,message.environment,message.event.eventId).first<{status:string}>();
  if(!existing||existing.status==="processed")return;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO tracking_hourly_aggregates(site_id,environment,hour_start,event_key,event_count,updated_at) VALUES(?,?,?,?,1,?) ON CONFLICT(site_id,environment,hour_start,event_key) DO UPDATE SET event_count=event_count+1,updated_at=excluded.updated_at").bind(message.siteId,message.environment,hourStart,message.event.eventKey,processedAt),
    env.DB.prepare("UPDATE tracking_ingestion_events SET status='processed',processed_at=? WHERE site_id=? AND environment=? AND event_id=? AND status='queued'").bind(processedAt,message.siteId,message.environment,message.event.eventId),
    env.DB.prepare("UPDATE tracking_health_counters SET last_event_processed_at=?,updated_at=? WHERE site_id=? AND environment=?").bind(processedAt,processedAt,message.siteId,message.environment),
  ]);
  env.TRACKING_ANALYTICS.writeDataPoint({indexes:[message.siteId],blobs:[message.environment,message.event.eventKey,message.event.source,message.event.schemaVersion,message.sdk.sdkVersion],doubles:[1]});
}

export async function trackingReport(env:WorkerEnv,input:unknown){
  const query=asRecord(input);const siteId=text(query?.siteId)||env.TRACKING_SITE_ID;const environment=text(query?.environment)||env.ENVIRONMENT;const days=Math.max(1,Math.min(90,Number(query?.days)||30));
  if(siteId!==env.TRACKING_SITE_ID||environment!==env.ENVIRONMENT)throw new Error("TRACKING_SCOPE_DENIED");
  const periodEnd=new Date();const periodStart=new Date(periodEnd.getTime()-days*86400000);
  const rows=await env.DB.prepare("SELECT hour_start,event_key,event_count FROM tracking_hourly_aggregates WHERE site_id=? AND environment=? AND hour_start>=? ORDER BY hour_start ASC,event_key ASC").bind(siteId,environment,periodStart.toISOString()).all<{hour_start:string;event_key:string;event_count:number}>();
  const totals=new Map<string,number>();for(const row of rows.results)totals.set(row.event_key,(totals.get(row.event_key)||0)+Number(row.event_count));
  return {reportId:crypto.randomUUID(),scope:{organizationId:env.TRACKING_ORGANIZATION_ID,siteId},environment,periodStart:periodStart.toISOString(),periodEnd:periodEnd.toISOString(),granularity:"hour",metrics:[...totals].map(([eventKey,value])=>({metricKey:"events.count",value,eventKey})),dimensions:rows.results.map((row)=>({hourStart:row.hour_start,eventKey:row.event_key,value:Number(row.event_count)})),generatedAt:new Date().toISOString(),sourceFreshThrough:rows.results.at(-1)?.hour_start||null};
}

export async function trackingHealth(env:WorkerEnv,input:unknown){
  const query=asRecord(input);const siteId=text(query?.siteId)||env.TRACKING_SITE_ID;const environment=text(query?.environment)||env.ENVIRONMENT;
  if(siteId!==env.TRACKING_SITE_ID||environment!==env.ENVIRONMENT)throw new Error("TRACKING_SCOPE_DENIED");
  const row=await env.DB.prepare("SELECT * FROM tracking_health_counters WHERE site_id=? AND environment=?").bind(siteId,environment).first<Record<string,unknown>>();
  const last=typeof row?.last_event_received_at==="string"?row.last_event_received_at:undefined;const delayed=last?Date.now()-Date.parse(last)>86400000:true;
  return {healthId:crypto.randomUUID(),scope:{organizationId:env.TRACKING_ORGANIZATION_ID,siteId},environment,sdkDetected:Boolean(row?.last_sdk_version),sdkVersion:row?.last_sdk_version||undefined,contractVersion:row?.last_contract_version||env.TRACKING_CONTRACT_VERSION,lastEventReceivedAt:last,receivedCount:Number(row?.received_count||0),acceptedCount:Number(row?.accepted_count||0),rejectedCount:Number(row?.rejected_count||0),duplicateCount:Number(row?.duplicate_count||0),consentRestrictedCount:Number(row?.consent_restricted_count||0),schemaErrorCount:Number(row?.schema_error_count||0),unknownEventCount:Number(row?.unknown_event_count||0),collectorStatus:"healthy",processingStatus:Number(row?.processing_failure_count||0)>0?"blocked":delayed?"delayed":"healthy",generatedAt:new Date().toISOString()};
}

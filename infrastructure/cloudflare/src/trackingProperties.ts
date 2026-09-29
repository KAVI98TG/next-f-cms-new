import type { D1DatabaseLike, WorkerEnv } from "./env";

type Principal = { organizationId:string; permissions:string[] };
type PropertyRow = { property_id:string; site_id:string; organization_id:string; site_name:string; primary_url:string|null; status:string; contract_version:string; tracking_configuration_ref:string; collector_policy_ref:string; manifest_validation_evidence_ref:string; provisioned_at:string|null; last_reconciled_at:string|null; suspended_at:string|null; updated_at:string };
type BindingRow = { binding_id:string; environment:string; status:string; allowed_origins_json:string; collector_api_id:string; sdk_id:string; sdk_version:string; envelope_version:string; reporting_enabled:number; event_keys_json:string; consent_mode:string; last_reconciled_at:string|null };

export class TrackingPropertyError extends Error {
  constructor(public code:"FORBIDDEN"|"NOT_FOUND"|"TRACKING_SCOPE_DENIED"|"VALIDATION_FAILED"|"CONFLICT"|"PRECONDITION_FAILED",message:string){super(message);}
}

function canDiscover(principal:Principal){return principal.permissions.includes("platform.sites.view")&&principal.permissions.includes("marketing.tracking.view");}
function asBinding(row:BindingRow){return {bindingId:row.binding_id,environment:row.environment,status:row.status,allowedOrigins:JSON.parse(row.allowed_origins_json) as string[],collectorApiId:row.collector_api_id,sdkId:row.sdk_id,sdkVersion:row.sdk_version,envelopeVersion:row.envelope_version,reportingEnabled:row.reporting_enabled===1,eventKeys:JSON.parse(row.event_keys_json) as string[],consentMode:row.consent_mode,lastReconciledAt:row.last_reconciled_at};}
async function expand(db:D1DatabaseLike,row:PropertyRow){
  const bindings=await db.prepare("SELECT * FROM tracking_environment_bindings WHERE property_id=? ORDER BY environment").bind(row.property_id).all<BindingRow>();
  return {propertyId:row.property_id,scope:{organizationId:row.organization_id,siteId:row.site_id},siteRef:row.site_id,siteName:row.site_name,primaryUrl:row.primary_url,status:row.status,contractVersion:row.contract_version,trackingConfigurationRef:row.tracking_configuration_ref,collectorPolicyRef:row.collector_policy_ref,manifestValidationEvidenceRef:row.manifest_validation_evidence_ref,environmentBindings:bindings.results.map(asBinding),provisionedAt:row.provisioned_at,lastReconciledAt:row.last_reconciled_at,suspendedAt:row.suspended_at,updatedAt:row.updated_at};
}

export async function listTrackingProperties(db:D1DatabaseLike,principal:Principal,filter:unknown){
  if(!canDiscover(principal))throw new TrackingPropertyError("FORBIDDEN","Site and tracking view permissions are required");
  const requested=filter&&typeof filter==="object"&&!Array.isArray(filter)?filter as Record<string,unknown>:{};
  const siteId=typeof requested.siteId==="string"?requested.siteId.trim():"";
  const rows=await db.prepare(`SELECT p.*,s.name AS site_name,s.primary_url FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id WHERE p.organization_id=? AND (?='' OR p.site_id=?) AND p.status!='retired' ORDER BY s.name`).bind(principal.organizationId,siteId,siteId).all<PropertyRow>();
  return {properties:await Promise.all(rows.results.map((row)=>expand(db,row)))};
}

export async function getTrackingProperty(db:D1DatabaseLike,principal:Principal,siteId:string){
  if(!principal.permissions.includes("marketing.tracking.view"))throw new TrackingPropertyError("FORBIDDEN","Tracking view permission is required");
  const row=await db.prepare("SELECT p.*,s.name AS site_name,s.primary_url FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id WHERE p.site_id=? AND p.organization_id=? AND p.status!='retired'").bind(siteId,principal.organizationId).first<PropertyRow>();
  if(!row)throw new TrackingPropertyError("NOT_FOUND","Tracking property is not available in this Organization");
  return expand(db,row);
}

export async function requireTrackingBinding(db:D1DatabaseLike,siteId:string,environment:string,origin?:string){
  const row=await db.prepare(`SELECT p.property_id,p.organization_id,p.contract_version,b.binding_id,b.environment,b.status,b.allowed_origins_json,b.collector_api_id,b.sdk_id,b.sdk_version,b.envelope_version,b.reporting_enabled,b.event_keys_json,b.consent_mode,b.last_reconciled_at FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id JOIN tracking_environment_bindings b ON b.property_id=p.property_id WHERE p.site_id=? AND b.environment=? AND p.status='active' AND s.status='active'`).bind(siteId,environment).first<BindingRow & {property_id:string;organization_id:string;contract_version:string}>();
  if(!row||row.status!=="active")throw new TrackingPropertyError("TRACKING_SCOPE_DENIED","No active tracking binding is available");
  const binding=asBinding(row);
  if(origin!==undefined&&!binding.allowedOrigins.includes(origin))throw new TrackingPropertyError("TRACKING_SCOPE_DENIED","Origin is not allowed for this Site environment");
  return {propertyId:row.property_id,organizationId:row.organization_id,contractVersion:row.contract_version,...binding};
}

export async function isActiveTrackingOrigin(db:D1DatabaseLike,origin:string){
  const row=await db.prepare(`SELECT 1 AS allowed FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id JOIN tracking_environment_bindings b ON b.property_id=p.property_id JOIN json_each(b.allowed_origins_json) o WHERE p.status='active' AND s.status='active' AND b.status='active' AND o.value=? LIMIT 1`).bind(origin).first<{allowed:number}>();
  return row?.allowed===1;
}

type SiteEvidence={site_id:string;organization_id:string;status:string;validation_id:string;contract_version:string;manifest_json:string;manifest_sha256:string};
type Manifest={site?:{siteId?:string};contracts?:{contractVersion?:string};localization?:{timeZone?:string};modules?:Array<{moduleId:string;enabled:boolean;capabilities?:Array<{capabilityId:string;enabled:boolean}>}>;environments?:Array<{id:string;kind:string;baseUrl:string;enabled:boolean}>;tracking?:{enabled:boolean;contractVersion:string;sdkId:string;sdkVersion:string;collectorApiId:string;consentMode:string;events:string[];reportingEnabled:boolean}};
type PreparedBinding={bindingId:string;environment:string;status:"active"|"ready";origins:string[]};

async function currentEvidence(db:D1DatabaseLike,siteId:string,organizationId:string){
  const row=await db.prepare(`SELECT s.site_id,s.organization_id,s.status,v.validation_id,v.contract_version,v.manifest_json,v.manifest_sha256 FROM core_sites s JOIN site_manifest_validations v ON v.site_id=s.site_id WHERE s.site_id=? AND s.organization_id=? ORDER BY v.validated_at DESC,v.rowid DESC LIMIT 1`).bind(siteId,organizationId).first<SiteEvidence>();
  if(!row||row.status!=="active")throw new TrackingPropertyError("NOT_FOUND","An active canonical Site with validated Manifest evidence is required");
  return row;
}

function prepare(evidence:SiteEvidence,env:WorkerEnv){
  let manifest:Manifest;try{manifest=JSON.parse(evidence.manifest_json) as Manifest;}catch{throw new TrackingPropertyError("VALIDATION_FAILED","Stored Site Manifest evidence is invalid");}
  const modules=new Map((manifest.modules||[]).filter((item)=>item.enabled).map((item)=>[item.moduleId,item]));
  const capabilities=new Set((modules.get("analytics")?.capabilities||[]).filter((item)=>item.enabled).map((item)=>item.capabilityId));
  const tracking=manifest.tracking;
  if(evidence.contract_version!=="1.5.0"||manifest.contracts?.contractVersion!=="1.5.0"||manifest.site?.siteId!==evidence.site_id||tracking?.contractVersion!=="1.5.0"||tracking.enabled!==true||!modules.has("core")||!modules.has("consent")||!modules.has("analytics")||!capabilities.has("analytics.first-party-collection")||!capabilities.has("analytics.tracking-sdk")||tracking.collectorApiId!=="api.events.collect-browser-tracking"||tracking.sdkId!=="nextf.tracking-sdk"||!env.TRACKING_SDK_VERSIONS.split(",").includes(tracking.sdkVersion)||tracking.consentMode!=="required"||!Array.isArray(tracking.events)||tracking.events.length===0)throw new TrackingPropertyError("VALIDATION_FAILED","Current Site evidence is not eligible for V1.5.0 tracking provisioning");
  const seen=new Set<string>();const bindings:PreparedBinding[]=[];
  for(const item of manifest.environments||[]){
    if(!item.enabled)continue;
    if(seen.has(item.kind)||!new Set(["development","preview","staging","production"]).has(item.kind))throw new TrackingPropertyError("VALIDATION_FAILED","Enabled tracking environments must be unique and canonical");
    seen.add(item.kind);
    let url:URL;try{url=new URL(item.baseUrl);}catch{throw new TrackingPropertyError("VALIDATION_FAILED","Site environment URL is invalid");}
    if(!["http:","https:"].includes(url.protocol)||item.kind==="production"&&url.protocol!=="https:"||url.username||url.password)throw new TrackingPropertyError("VALIDATION_FAILED","Site environment origin is not eligible for tracking");
    bindings.push({bindingId:crypto.randomUUID(),environment:item.kind,status:item.kind===env.ENVIRONMENT?"active":"ready",origins:[url.origin]});
  }
  if(!bindings.some((item)=>item.status==="active"))throw new TrackingPropertyError("VALIDATION_FAILED","No environment matches the deployed collector");
  return {manifest,tracking,bindings};
}

function configuration(siteId:string,organizationId:string,timezone:string,now:string){
  const scope={organizationId,siteId};const identity=(suffix:string)=>({id:`${siteId}_${suffix}`,createdAt:now,updatedAt:now});
  return {identity:identity("tracking_configuration"),scope,enabled:true,dataLayer:{namespace:"nextf",queueLimit:20,flushMode:"batch",batchSize:20,debugModeAllowed:false,schemaVersion:"1.0.0"},dataPolicy:{policyVersion:"1.0.0",retentionDays:90,allowAnonymousVisitorId:false,allowAuthenticatedSubjectLinking:false,allowRawQueryString:false,allowFullReferrerPath:false,stripUrlFragments:true,stripSensitiveQueryParameters:true},consentPolicy:{identity:identity("consent_policy"),scope,policyVersion:"1.0.0",categories:[{categoryKey:"analytics",name:"Analytics",description:"Optional website measurement",required:false,defaultState:"unset",displayOrder:1}],unknownOptionalBehavior:"deny",regionStrategy:"single",effectiveAt:now},analytics:{identity:identity("analytics_configuration"),scope,enabled:true,sessionTimeoutMinutes:30,reportingTimeZone:timezone||"UTC",excludeInternalTraffic:true,rawObservationRetentionDays:90},debugMode:false,updatedAt:now};
}

function collectorPolicy(siteId:string,organizationId:string,origins:string[],env:WorkerEnv){
  return {policyId:`${siteId}_collector_policy`,scope:{organizationId,siteId},allowedOrigins:origins,maximumRequestBytes:65536,maximumEventsPerBatch:20,maximumPropertyCount:32,acceptedEnvelopeVersions:env.TRACKING_ENVELOPE_VERSIONS.split(",").map((item)=>item.trim()).filter(Boolean),consentEnforcement:"restrict",rawIpPersistence:false,redirectPolicy:"never-follow"};
}

function lifecycleOutbox(env:WorkerEnv,event:{id:string;type:string;idempotencyKey:string;occurredAt:string;organizationId:string;payload:Record<string,string>}){
  return env.DB.prepare("INSERT OR IGNORE INTO outbox_events(id,event_type,idempotency_key,organization_id,payload_json,state,created_at,updated_at) VALUES(?,?,?,?,?,'pending',?,?)").bind(event.id,event.type,event.idempotencyKey,event.organizationId,JSON.stringify(event.payload),event.occurredAt,event.occurredAt);
}

async function dispatchLifecycle(env:WorkerEnv,event:{id:string;type:string;idempotencyKey:string;occurredAt:string;organizationId:string;payload:Record<string,string>}){
  try{await env.EVENTS.send(event,{contentType:"json"});await env.DB.prepare("UPDATE outbox_events SET state='dispatched',attempt_count=attempt_count+1,updated_at=? WHERE id=? AND state='pending'").bind(new Date().toISOString(),event.id).run();}
  catch{await env.DB.prepare("UPDATE outbox_events SET attempt_count=attempt_count+1,updated_at=? WHERE id=? AND state='pending'").bind(new Date().toISOString(),event.id).run();}
}

export async function provisionTrackingProperty(env:WorkerEnv,principal:Principal,siteId:string,audit:{requestId:string;correlationId:string;accountId:string;idempotencyKey:string}){
  if(!principal.permissions.includes("marketing.tracking.manage"))throw new TrackingPropertyError("FORBIDDEN","Tracking management permission is required");
  const evidence=await currentEvidence(env.DB,siteId,principal.organizationId);
  const existing=await env.DB.prepare("SELECT property_id,manifest_validation_evidence_ref,status FROM tracking_properties WHERE site_id=? AND status!='retired'").bind(siteId).first<{property_id:string;manifest_validation_evidence_ref:string;status:string}>();
  if(existing){const row=await env.DB.prepare("SELECT p.*,s.name AS site_name,s.primary_url FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id WHERE p.property_id=? AND p.organization_id=?").bind(existing.property_id,principal.organizationId).first<PropertyRow>();if(!row)throw new TrackingPropertyError("FORBIDDEN","Tracking property scope is unavailable");return {property:await expand(env.DB,row),created:false,reconciliationRequired:existing.manifest_validation_evidence_ref!==evidence.validation_id};}
  const prepared=prepare(evidence,env);const now=new Date().toISOString();const propertyId=`trp_${crypto.randomUUID()}`;const configurationId=`${siteId}_tracking_configuration`;const policyId=`${siteId}_collector_policy`;
  const event={id:crypto.randomUUID(),type:"tracking.provisioned",idempotencyKey:`tracking.provisioned:${propertyId}`,occurredAt:now,organizationId:principal.organizationId,payload:{propertyId,siteId,organizationId:principal.organizationId,manifestValidationEvidenceRef:evidence.validation_id}};
  const config=configuration(siteId,principal.organizationId,prepared.manifest.localization?.timeZone||"UTC",now);
  const policy=collectorPolicy(siteId,principal.organizationId,prepared.bindings.flatMap((item)=>item.origins),env);
  const statements=[
    env.DB.prepare("INSERT INTO tracking_configuration_records(configuration_id,site_id,record_json,updated_at) VALUES(?,?,?,?)").bind(configurationId,siteId,JSON.stringify(config),now),
    env.DB.prepare("INSERT INTO tracking_collector_policy_records(policy_id,site_id,record_json,updated_at) VALUES(?,?,?,?)").bind(policyId,siteId,JSON.stringify(policy),now),
    env.DB.prepare("INSERT INTO tracking_properties(property_id,site_id,organization_id,status,contract_version,tracking_configuration_ref,collector_policy_ref,manifest_validation_evidence_ref,provisioned_at,last_reconciled_at,updated_at) VALUES(?,?,?,'active','1.5.0',?,?,?,?,?,?)").bind(propertyId,siteId,principal.organizationId,configurationId,policyId,evidence.validation_id,now,now,now),
    ...prepared.bindings.map((item)=>env.DB.prepare("INSERT INTO tracking_environment_bindings(binding_id,property_id,environment,status,allowed_origins_json,collector_api_id,sdk_id,sdk_version,envelope_version,reporting_enabled,event_keys_json,consent_mode,last_reconciled_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(item.bindingId,propertyId,item.environment,item.status,JSON.stringify(item.origins),prepared.tracking.collectorApiId,prepared.tracking.sdkId,prepared.tracking.sdkVersion,env.TRACKING_ENVELOPE_VERSIONS.split(",")[0].trim(),prepared.tracking.reportingEnabled?1:0,JSON.stringify(prepared.tracking.events),prepared.tracking.consentMode,now)),
    env.DB.prepare("INSERT INTO audit_events(id,action,principal_kind,principal_id,organization_id,target_type,target_id,outcome,request_id,correlation_id,detail,created_at) VALUES(?,?,'staff',?,?,'marketing.trackingProperty',?,'provisioned',?,?,?,?)").bind(crypto.randomUUID(),"api.nextf-admin.provision-tracking-property",audit.accountId,principal.organizationId,propertyId,audit.requestId,audit.correlationId,JSON.stringify({siteId,validationId:evidence.validation_id}),now),
    lifecycleOutbox(env,event),
  ];
  try{await env.DB.batch(statements);}catch(error){if(await env.DB.prepare("SELECT property_id FROM tracking_properties WHERE site_id=? AND status!='retired'").bind(siteId).first())throw new TrackingPropertyError("CONFLICT","Tracking property was provisioned concurrently; retry to read it");throw error;}
  await dispatchLifecycle(env,event);
  const row=await env.DB.prepare("SELECT p.*,s.name AS site_name,s.primary_url FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id WHERE p.property_id=?").bind(propertyId).first<PropertyRow>();
  if(!row)throw new Error("Provisioned property could not be read");
  return {property:await expand(env.DB,row),created:true,reconciliationRequired:false};
}

async function managedProperty(env:WorkerEnv,principal:Principal,siteId:string,ifMatch:string){
  if(!principal.permissions.includes("marketing.tracking.manage"))throw new TrackingPropertyError("FORBIDDEN","Tracking management permission is required");
  const row=await env.DB.prepare("SELECT p.*,s.name AS site_name,s.primary_url FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id WHERE p.site_id=? AND p.organization_id=? AND p.status!='retired'").bind(siteId,principal.organizationId).first<PropertyRow>();
  if(!row)throw new TrackingPropertyError("NOT_FOUND","Tracking property is not available in this Site scope");
  if(!ifMatch||ifMatch.replace(/^W\//,"").replace(/^\"|\"$/g,"")!==row.updated_at)throw new TrackingPropertyError("PRECONDITION_FAILED","If-Match must equal the current property updatedAt value");
  return row;
}

function nextUpdate(previous:string){const now=Date.now();return new Date(Math.max(now,Date.parse(previous)+1)).toISOString();}

export async function reconcileTrackingProperty(env:WorkerEnv,principal:Principal,siteId:string,ifMatch:string,audit:{requestId:string;correlationId:string;accountId:string}){
  const row=await managedProperty(env,principal,siteId,ifMatch);const evidence=await currentEvidence(env.DB,siteId,principal.organizationId);
  if(row.manifest_validation_evidence_ref===evidence.validation_id)return {property:await expand(env.DB,row),changed:false};
  const prepared=prepare(evidence,env);const now=nextUpdate(row.updated_at);
  const config=configuration(siteId,principal.organizationId,prepared.manifest.localization?.timeZone||"UTC",now);
  const oldConfigRow=await env.DB.prepare("SELECT record_json FROM tracking_configuration_records WHERE configuration_id=? AND site_id=?").bind(row.tracking_configuration_ref,siteId).first<{record_json:string}>();
  if(!oldConfigRow)throw new TrackingPropertyError("VALIDATION_FAILED","Canonical tracking configuration reference is unresolved");
  const oldConfig=JSON.parse(oldConfigRow.record_json) as typeof config;
  config.identity.createdAt=oldConfig.identity.createdAt;
  config.consentPolicy.identity.createdAt=oldConfig.consentPolicy.identity.createdAt;
  config.analytics.identity.createdAt=oldConfig.analytics.identity.createdAt;
  const policy=collectorPolicy(siteId,principal.organizationId,prepared.bindings.flatMap((item)=>item.origins),env);
  const active=row.status!=="suspended";
  const assertionId=crypto.randomUUID();
  const event={id:crypto.randomUUID(),type:"tracking.reconciled",idempotencyKey:`tracking.reconciled:${row.property_id}:${evidence.validation_id}`,occurredAt:now,organizationId:principal.organizationId,payload:{propertyId:row.property_id,siteId,organizationId:principal.organizationId,manifestValidationEvidenceRef:evidence.validation_id}};
  const statements=[
    env.DB.prepare("INSERT INTO tracking_write_preconditions(assertion_id,valid) VALUES(?,(SELECT CASE WHEN EXISTS(SELECT 1 FROM tracking_properties WHERE property_id=? AND updated_at=?) THEN 1 ELSE 0 END))").bind(assertionId,row.property_id,row.updated_at),
    env.DB.prepare("UPDATE tracking_configuration_records SET record_json=?,updated_at=? WHERE configuration_id=? AND site_id=?").bind(JSON.stringify(config),now,row.tracking_configuration_ref,siteId),
    env.DB.prepare("UPDATE tracking_collector_policy_records SET record_json=?,updated_at=? WHERE policy_id=? AND site_id=?").bind(JSON.stringify(policy),now,row.collector_policy_ref,siteId),
    env.DB.prepare("UPDATE tracking_environment_bindings SET status='suspended' WHERE property_id=?").bind(row.property_id),
    ...prepared.bindings.map((item)=>env.DB.prepare(`INSERT INTO tracking_environment_bindings(binding_id,property_id,environment,status,allowed_origins_json,collector_api_id,sdk_id,sdk_version,envelope_version,reporting_enabled,event_keys_json,consent_mode,last_reconciled_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(property_id,environment) DO UPDATE SET status=excluded.status,allowed_origins_json=excluded.allowed_origins_json,collector_api_id=excluded.collector_api_id,sdk_id=excluded.sdk_id,sdk_version=excluded.sdk_version,envelope_version=excluded.envelope_version,reporting_enabled=excluded.reporting_enabled,event_keys_json=excluded.event_keys_json,consent_mode=excluded.consent_mode,last_reconciled_at=excluded.last_reconciled_at`).bind(item.bindingId,row.property_id,item.environment,active?item.status:"suspended",JSON.stringify(item.origins),prepared.tracking.collectorApiId,prepared.tracking.sdkId,prepared.tracking.sdkVersion,env.TRACKING_ENVELOPE_VERSIONS.split(",")[0].trim(),prepared.tracking.reportingEnabled?1:0,JSON.stringify(prepared.tracking.events),prepared.tracking.consentMode,now)),
    env.DB.prepare("UPDATE tracking_properties SET manifest_validation_evidence_ref=?,last_reconciled_at=?,updated_at=? WHERE property_id=? AND updated_at=?").bind(evidence.validation_id,now,now,row.property_id,row.updated_at),
    env.DB.prepare("INSERT INTO audit_events(id,action,principal_kind,principal_id,organization_id,target_type,target_id,outcome,request_id,correlation_id,detail,created_at) VALUES(?,?,'staff',?,?,'marketing.trackingProperty',?,'reconciled',?,?,?,?)").bind(crypto.randomUUID(),"api.nextf-admin.reconcile-tracking-property",audit.accountId,principal.organizationId,row.property_id,audit.requestId,audit.correlationId,JSON.stringify({siteId,validationId:evidence.validation_id}),now),
    lifecycleOutbox(env,event),
    env.DB.prepare("DELETE FROM tracking_write_preconditions WHERE assertion_id=?").bind(assertionId),
  ];
  try{await env.DB.batch(statements);}catch(error){const current=await env.DB.prepare("SELECT updated_at FROM tracking_properties WHERE property_id=?").bind(row.property_id).first<{updated_at:string}>();if(current?.updated_at!==row.updated_at)throw new TrackingPropertyError("PRECONDITION_FAILED","Property changed since If-Match was read");throw error;}
  await dispatchLifecycle(env,event);
  const updated=await env.DB.prepare("SELECT p.*,s.name AS site_name,s.primary_url FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id WHERE p.property_id=?").bind(row.property_id).first<PropertyRow>();
  if(!updated)throw new Error("Reconciled property could not be read");
  return {property:await expand(env.DB,updated),changed:true};
}

export async function suspendTrackingProperty(env:WorkerEnv,principal:Principal,siteId:string,ifMatch:string,reasonCode:string,audit:{requestId:string;correlationId:string;accountId:string}){
  const row=await managedProperty(env,principal,siteId,ifMatch);if(!/^[a-z][a-z0-9.-]{1,79}$/.test(reasonCode))throw new TrackingPropertyError("VALIDATION_FAILED","A bounded suspension reasonCode is required");
  if(row.status==="suspended")return {property:await expand(env.DB,row),changed:false};
  const now=nextUpdate(row.updated_at);const assertionId=crypto.randomUUID();
  const event={id:crypto.randomUUID(),type:"tracking.suspended",idempotencyKey:`tracking.suspended:${row.property_id}:${now}`,occurredAt:now,organizationId:principal.organizationId,payload:{propertyId:row.property_id,siteId,organizationId:principal.organizationId,reasonCode}};
  try{await env.DB.batch([
    env.DB.prepare("INSERT INTO tracking_write_preconditions(assertion_id,valid) VALUES(?,(SELECT CASE WHEN EXISTS(SELECT 1 FROM tracking_properties WHERE property_id=? AND updated_at=?) THEN 1 ELSE 0 END))").bind(assertionId,row.property_id,row.updated_at),
    env.DB.prepare("UPDATE tracking_properties SET status='suspended',suspended_at=?,updated_at=? WHERE property_id=? AND updated_at=?").bind(now,now,row.property_id,row.updated_at),
    env.DB.prepare("UPDATE tracking_environment_bindings SET status='suspended' WHERE property_id=?").bind(row.property_id),
    env.DB.prepare("INSERT INTO audit_events(id,action,principal_kind,principal_id,organization_id,target_type,target_id,outcome,request_id,correlation_id,detail,created_at) VALUES(?,?,'staff',?,?,'marketing.trackingProperty',?,'suspended',?,?,?,?)").bind(crypto.randomUUID(),"api.nextf-admin.suspend-tracking-property",audit.accountId,principal.organizationId,row.property_id,audit.requestId,audit.correlationId,JSON.stringify({siteId,reasonCode}),now),
    lifecycleOutbox(env,event),
    env.DB.prepare("DELETE FROM tracking_write_preconditions WHERE assertion_id=?").bind(assertionId),
  ]);}catch(error){const current=await env.DB.prepare("SELECT updated_at FROM tracking_properties WHERE property_id=?").bind(row.property_id).first<{updated_at:string}>();if(current?.updated_at!==row.updated_at)throw new TrackingPropertyError("PRECONDITION_FAILED","Property changed since If-Match was read");throw error;}
  await dispatchLifecycle(env,event);
  const updated=await env.DB.prepare("SELECT p.*,s.name AS site_name,s.primary_url FROM tracking_properties p JOIN core_sites s ON s.site_id=p.site_id WHERE p.property_id=?").bind(row.property_id).first<PropertyRow>();
  if(!updated)throw new Error("Suspended property could not be read");
  return {property:await expand(env.DB,updated),changed:true};
}

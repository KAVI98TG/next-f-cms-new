import type { D1DatabaseLike, ProductionEvent, WorkerEnv } from "./env";
import { recordAudit } from "./audit";

const STATE_NAMESPACE = "cms.staff-state";
const DEMO_ENVIRONMENTS_KEY = "nextf.v0.14.digital.demo-environments";
const DEMO_REQUESTS_KEY = "nextf.v0.12.digital.demo-access-requests";

function positiveDays(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function readStateArray(db: D1DatabaseLike, key: string): Promise<Array<Record<string, unknown>>> {
  const row = await db.prepare("SELECT payload_json FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL LIMIT 1").bind(STATE_NAMESPACE, key).first<{payload_json:string}>();
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.payload_json);
    return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  } catch {
    return [];
  }
}

async function writeStateArray(db: D1DatabaseLike, key: string, rows: Array<Record<string, unknown>>, updatedAt: string) {
  await db.prepare("UPDATE app_documents SET payload_json=?, version=version+1, updated_at=? WHERE namespace=? AND id=? AND deleted_at IS NULL").bind(JSON.stringify(rows), updatedAt, STATE_NAMESPACE, key).run();
}

export async function runDemoExpirySweep(env: WorkerEnv, nowIso = new Date().toISOString()) {
  const nowMs = new Date(nowIso).getTime();
  const environments = await readStateArray(env.DB, DEMO_ENVIRONMENTS_KEY);
  const expiredIds = new Set<string>();
  let expiredEnvironments = 0;
  const nextEnvironments = environments.map((row) => {
    const expiresAt = typeof row.expiresAt === "string" ? new Date(row.expiresAt).getTime() : Number.POSITIVE_INFINITY;
    if (row.status === "active" && Number.isFinite(expiresAt) && expiresAt <= nowMs) {
      expiredEnvironments += 1;
      if (typeof row.demoRequestId === "string") expiredIds.add(row.demoRequestId);
      return { ...row, status: "expired", updatedAt: nowIso };
    }
    return row;
  });
  if (expiredEnvironments) await writeStateArray(env.DB, DEMO_ENVIRONMENTS_KEY, nextEnvironments, nowIso);

  let expiredRequests = 0;
  if (expiredIds.size) {
    const requests = await readStateArray(env.DB, DEMO_REQUESTS_KEY);
    const nextRequests = requests.map((row) => {
      if (typeof row.id === "string" && expiredIds.has(row.id) && !["expired", "revoked", "rejected"].includes(String(row.status ?? ""))) {
        expiredRequests += 1;
        return { ...row, status: "expired", expiresAt: typeof row.expiresAt === "string" ? row.expiresAt : nowIso, updatedAt: nowIso };
      }
      return row;
    });
    if (expiredRequests) await writeStateArray(env.DB, DEMO_REQUESTS_KEY, nextRequests, nowIso);
  }
  return { expiredEnvironments, expiredRequests };
}

export async function runRetentionCleanup(env: WorkerEnv, now = new Date()) {
  const auditDays = positiveDays(env.AUDIT_RETENTION_DAYS, 365);
  const outboxDays = positiveDays(env.OUTBOX_RETENTION_DAYS, 90);
  const auditCutoff = new Date(now.getTime() - auditDays * 86_400_000).toISOString();
  const outboxCutoff = new Date(now.getTime() - outboxDays * 86_400_000).toISOString();
  const auditResult = await env.DB.prepare("DELETE FROM audit_events WHERE created_at < ?").bind(auditCutoff).run();
  const outboxResult = await env.DB.prepare("DELETE FROM outbox_events WHERE state IN ('dispatched','failed') AND updated_at < ?").bind(outboxCutoff).run();
  let trackingRawDeleted=0;
  if(env.TRACKING_PROPERTY_ROUTING_ENABLED==="true"){
    const policies=await env.DB.prepare("SELECT p.site_id,json_extract(c.record_json,'$.dataPolicy.retentionDays') AS retention_days FROM tracking_properties p JOIN tracking_configuration_records c ON c.configuration_id=p.tracking_configuration_ref WHERE p.status!='retired'").all<{site_id:string;retention_days:number}>();
    for(const policy of policies.results){
      const days=Number(policy.retention_days);
      if(!Number.isInteger(days)||days<1||days>730)continue;
      const cutoff=new Date(now.getTime()-days*86_400_000).toISOString();
      const result=await env.DB.prepare("DELETE FROM tracking_ingestion_events WHERE rowid IN (SELECT rowid FROM tracking_ingestion_events WHERE site_id=? AND received_at<? ORDER BY received_at LIMIT 1000)").bind(policy.site_id,cutoff).run();
      trackingRawDeleted+=Number(result.meta?.changes??0);
    }
  }
  return {
    auditRetentionDays: auditDays,
    outboxRetentionDays: outboxDays,
    auditDeleted: Number(auditResult.meta?.changes ?? 0),
    outboxDeleted: Number(outboxResult.meta?.changes ?? 0),
    trackingRawDeleted,
  };
}

export async function runIdempotencyCleanup(env: WorkerEnv, nowIso = new Date().toISOString()) {
  const result = await env.DB.prepare("DELETE FROM idempotency_records WHERE expires_at <= ?").bind(nowIso).run();
  return { idempotencyDeleted: Number(result.meta?.changes ?? 0) };
}

export async function retryTrackingLifecycleOutbox(env: WorkerEnv, nowIso = new Date().toISOString()) {
  const pending = await env.DB.prepare("SELECT id,event_type,idempotency_key,organization_id,workspace_id,payload_json,created_at FROM outbox_events WHERE state='pending' AND event_type IN ('tracking.provisioned','tracking.reconciled','tracking.suspended') ORDER BY created_at LIMIT 20").all<{id:string;event_type:string;idempotency_key:string;organization_id:string|null;workspace_id:string|null;payload_json:string;created_at:string}>();
  let dispatched = 0;
  let deferred = 0;
  for (const row of pending.results) {
    try {
      const event: ProductionEvent = { id:row.id, type:row.event_type, idempotencyKey:row.idempotency_key, occurredAt:row.created_at, organizationId:row.organization_id ?? undefined, workspaceId:row.workspace_id ?? undefined, payload:JSON.parse(row.payload_json) as Record<string,unknown> };
      await env.EVENTS.send(event, { contentType:"json" });
      await env.DB.prepare("UPDATE outbox_events SET state='dispatched',attempt_count=attempt_count+1,updated_at=? WHERE id=? AND state='pending'").bind(nowIso,row.id).run();
      dispatched += 1;
    } catch {
      await env.DB.prepare("UPDATE outbox_events SET attempt_count=attempt_count+1,updated_at=? WHERE id=? AND state='pending'").bind(nowIso,row.id).run();
      deferred += 1;
    }
  }
  return { trackingLifecycleDispatched:dispatched, trackingLifecycleDeferred:deferred };
}

export async function runMaintenance(env: WorkerEnv, source: "scheduled" | "staff", context?: {principalId?:string;requestId?:string;correlationId?:string}) {
  const startedAt = new Date();
  const demo = await runDemoExpirySweep(env, startedAt.toISOString());
  const retention = await runRetentionCleanup(env, startedAt);
  const idempotency = await runIdempotencyCleanup(env, startedAt.toISOString());
  const trackingLifecycle = await retryTrackingLifecycleOutbox(env, startedAt.toISOString());
  const completedAt = new Date().toISOString();
  const result = { source, startedAt: startedAt.toISOString(), completedAt, ...demo, ...retention, ...idempotency, ...trackingLifecycle };
  await recordAudit(env.DB, {
    id: crypto.randomUUID(),
    action: source === "scheduled" ? "system.maintenance.scheduled" : "staff.system.maintenance.run",
    principalKind: source === "scheduled" ? "system" : "staff",
    principalId: context?.principalId ?? "system",
    targetType: "maintenance",
    targetId: source,
    outcome: "completed",
    requestId: context?.requestId ?? crypto.randomUUID(),
    correlationId: context?.correlationId ?? crypto.randomUUID(),
    detail: JSON.stringify(result),
  });
  return result;
}

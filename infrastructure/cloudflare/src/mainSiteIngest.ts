import type { ProductionEvent, WorkerEnv } from "./env";
import { D1IdempotencyRepository } from "./idempotency";
import { json, problem } from "./http";
import { D1DocumentRepository } from "./repository";
import { recordAudit } from "./audit";

const INTEGRATION_PATH = "/v1/integrations/nextf/project-requests";
const ENVELOPE_TYPE = "nextf.forms.projectRequest.accepted";
const ENVELOPE_CONTRACT_VERSION = "1.0.0";
const SITE_ID = "nextf-main-website";
const SUBMISSION_CONTRACT_ID = "forms.submission";
const LEAD_CONTRACT_ID = "forms.lead";
const FORM_RECORD_CONTRACT_VERSION = "0.9.0";
const SUBMISSION_NAMESPACE = "forms.submission";
const LEAD_NAMESPACE = "forms.lead";
const STAFF_STATE_NAMESPACE = "cms.staff-state";
const DIGITAL_LEADS_KEY = "nextf.v0.4.digital.leads";
const PRINCIPAL_FINGERPRINT = "service:nextf-main-website:project-request";
const COMMAND_NAME = "integration.nextf.project-request.accept";
const MAX_BODY_BYTES = 128 * 1024;

type SubmissionValue = {
  fieldKey: string;
  labelSnapshot?: string;
  primitiveIdSnapshot?: string;
  value: unknown;
  sensitive?: boolean;
  redacted?: boolean;
};

type ProjectRequestEnvelope = {
  type: string;
  contractVersion: string;
  siteId: string;
  submittedAt: string;
  records: {
    submission: Record<string, unknown> & {
      contractId: string;
      contractVersion: string;
      id: string;
      siteId: string;
      formId: string;
      formVersion: string;
      status: string;
      values: SubmissionValue[];
      files: unknown[];
      consents: unknown[];
      spamDecision: { provider?: unknown; outcome?: unknown; decidedAt?: unknown };
      requestContext: { sourceUrl?: unknown };
      submittedAt: string;
      acceptedAt: string;
      completedAt?: unknown;
      idempotencyKey: string;
      leadId: string;
    };
    lead: Record<string, unknown> & {
      contractId: string;
      contractVersion: string;
      id: string;
      siteId: string;
      displayName: string;
      organizationName?: string;
      contactPoints: unknown[];
      source: { kind?: unknown; formId?: unknown; submissionId?: unknown; label?: unknown };
      statusKey: string;
      assignedTo?: unknown;
      tags: unknown[];
      submissionIds: string[];
      createdAt: string;
      updatedAt: string;
      lastActivityAt: string;
    };
  };
};

type DigitalLeadProjection = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  estimatedValue: number;
  enquiryDetail?: string;
  sourceContext?: string;
  status: "new";
  owner: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
};

class IntegrationApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function requiredString(value: unknown, field: string, max = 500): string {
  if (typeof value !== "string" || !value.trim()) throw new IntegrationApiError(400, "VALIDATION_FAILED", `${field} is required`);
  const result = value.trim();
  if (result.length > max) throw new IntegrationApiError(400, "VALIDATION_FAILED", `${field} is too long`);
  return result;
}
function validIso(value: unknown, field: string): string {
  const result = requiredString(value, field, 80);
  if (Number.isNaN(Date.parse(result))) throw new IntegrationApiError(400, "VALIDATION_FAILED", `${field} must be an ISO timestamp`);
  return result;
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left); const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length); let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}
function assertBearer(request: Request, env: WorkerEnv) {
  const configured = env.NEXTF_MAIN_SITE_INGEST_TOKEN?.trim();
  if (!configured) throw new IntegrationApiError(503, "INTEGRATION_NOT_CONFIGURED", "Main-site CMS ingestion is not configured");
  const provided = bearerToken(request);
  if (!provided || !constantTimeEqual(provided, configured)) throw new IntegrationApiError(401, "INTEGRATION_UNAUTHORIZED", "Integration authentication failed");
}
function assertHeader(request: Request, name: string, expected: string) {
  const value = request.headers.get(name)?.trim();
  if (value !== expected) throw new IntegrationApiError(400, "CONTRACT_HEADER_MISMATCH", `${name} must equal ${expected}`);
}
function valueMap(values: SubmissionValue[]) {
  const result = new Map<string, string>();
  for (const row of values) {
    if (!row || typeof row !== "object") throw new IntegrationApiError(400, "VALIDATION_FAILED", "submission.values entries must be objects");
    const key = requiredString(row.fieldKey, "submission.values.fieldKey", 120);
    if (result.has(key)) throw new IntegrationApiError(400, "VALIDATION_FAILED", `Duplicate submission field ${key}`);
    const raw = row.value;
    result.set(key, raw === null || raw === undefined ? "" : typeof raw === "string" ? raw.trim() : String(raw));
  }
  return result;
}
function buildEnquiryDetail(values: Map<string, string>) {
  return [
    ["Need", values.get("need")],
    ["Goal", values.get("goal")],
    ["Timing", values.get("timing")],
    ["Website", values.get("website")],
    ["Message", values.get("message")],
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n").slice(0, 5000);
}
function validateEnvelope(raw: unknown, request: Request): { envelope: ProjectRequestEnvelope; projection: DigitalLeadProjection; idempotencyKey: string } {
  const root = asRecord(raw); if (!root) throw new IntegrationApiError(400, "VALIDATION_FAILED", "Project request payload must be a JSON object");
  const records = asRecord(root.records); const submission = asRecord(records?.submission); const lead = asRecord(records?.lead);
  if (!records || !submission || !lead) throw new IntegrationApiError(400, "VALIDATION_FAILED", "records.submission and records.lead are required");
  const type = requiredString(root.type, "type"); const contractVersion = requiredString(root.contractVersion, "contractVersion", 30); const siteId = requiredString(root.siteId, "siteId", 120);
  if (type !== ENVELOPE_TYPE) throw new IntegrationApiError(400, "CONTRACT_MISMATCH", `type must equal ${ENVELOPE_TYPE}`);
  if (contractVersion !== ENVELOPE_CONTRACT_VERSION) throw new IntegrationApiError(400, "CONTRACT_MISMATCH", `contractVersion must equal ${ENVELOPE_CONTRACT_VERSION}`);
  if (siteId !== SITE_ID) throw new IntegrationApiError(400, "SITE_MISMATCH", `siteId must equal ${SITE_ID}`);
  validIso(root.submittedAt, "submittedAt");

  const submissionId = requiredString(submission.id, "records.submission.id", 160);
  const leadId = requiredString(lead.id, "records.lead.id", 160);
  const idempotencyKey = requiredString(request.headers.get("idempotency-key"), "Idempotency-Key", 220);
  if (submission.contractId !== SUBMISSION_CONTRACT_ID || submission.contractVersion !== FORM_RECORD_CONTRACT_VERSION) throw new IntegrationApiError(400, "CONTRACT_MISMATCH", `submission must use ${SUBMISSION_CONTRACT_ID}@${FORM_RECORD_CONTRACT_VERSION}`);
  if (lead.contractId !== LEAD_CONTRACT_ID || lead.contractVersion !== FORM_RECORD_CONTRACT_VERSION) throw new IntegrationApiError(400, "CONTRACT_MISMATCH", `lead must use ${LEAD_CONTRACT_ID}@${FORM_RECORD_CONTRACT_VERSION}`);
  if (submission.siteId !== SITE_ID || lead.siteId !== SITE_ID) throw new IntegrationApiError(400, "SITE_MISMATCH", "Submission and lead siteId must match NEXT F main website");
  if (requiredString(submission.idempotencyKey, "records.submission.idempotencyKey", 220) !== idempotencyKey || idempotencyKey !== submissionId) throw new IntegrationApiError(400, "IDEMPOTENCY_MISMATCH", "Idempotency-Key, submission.idempotencyKey and submission.id must be identical");
  if (requiredString(submission.leadId, "records.submission.leadId", 160) !== leadId) throw new IntegrationApiError(400, "RELATION_MISMATCH", "submission.leadId must reference records.lead.id");
  if (!Array.isArray(lead.submissionIds) || !lead.submissionIds.includes(submissionId)) throw new IntegrationApiError(400, "RELATION_MISMATCH", "lead.submissionIds must include the submission id");
  const source = asRecord(lead.source); if (!source || source.submissionId !== submissionId || source.kind !== "form") throw new IntegrationApiError(400, "RELATION_MISMATCH", "lead.source must reference the submitted form record");
  if (submission.status !== "accepted" || lead.statusKey !== "new") throw new IntegrationApiError(400, "STATE_MISMATCH", "Accepted project requests must create an accepted submission and new lead");
  const spam = asRecord(submission.spamDecision); if (!spam || spam.provider !== "cloudflare-turnstile" || spam.outcome !== "passed") throw new IntegrationApiError(400, "ABUSE_PROTECTION_EVIDENCE_REQUIRED", "Submission must carry passed Cloudflare Turnstile evidence");
  validIso(spam.decidedAt, "records.submission.spamDecision.decidedAt"); validIso(submission.submittedAt, "records.submission.submittedAt"); validIso(submission.acceptedAt, "records.submission.acceptedAt");
  validIso(lead.createdAt, "records.lead.createdAt"); validIso(lead.updatedAt, "records.lead.updatedAt"); validIso(lead.lastActivityAt, "records.lead.lastActivityAt");
  if (!Array.isArray(submission.values) || !Array.isArray(submission.files) || !Array.isArray(submission.consents) || !Array.isArray(lead.contactPoints) || !Array.isArray(lead.tags)) throw new IntegrationApiError(400, "VALIDATION_FAILED", "Contract array fields are malformed");
  const fields = valueMap(submission.values as SubmissionValue[]);
  const name = (fields.get("name") || requiredString(lead.displayName, "records.lead.displayName", 200)).slice(0, 200);
  const email = (fields.get("email") || "").toLowerCase().slice(0, 320);
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new IntegrationApiError(400, "VALIDATION_FAILED", "Project request must contain a valid name and email submission value");
  const company = (fields.get("company") || (typeof lead.organizationName === "string" ? lead.organizationName : "")).slice(0, 200);
  const phone = (fields.get("phone") || "").slice(0, 80);
  const sourceUrl = asRecord(submission.requestContext)?.sourceUrl;
  const projection: DigitalLeadProjection = {
    id: leadId, name, company, email, phone, source: "nextf.lk", estimatedValue: 0,
    enquiryDetail: buildEnquiryDetail(fields),
    sourceContext: typeof sourceUrl === "string" && sourceUrl.trim() ? sourceUrl.trim().slice(0, 500) : "nextf-main-website/project-request",
    status: "new", owner: "Unassigned", nextAction: "Review website project request",
    createdAt: requiredString(lead.createdAt, "records.lead.createdAt", 80), updatedAt: requiredString(lead.updatedAt, "records.lead.updatedAt", 80),
  };
  return { envelope: root as unknown as ProjectRequestEnvelope, projection, idempotencyKey };
}

async function fetchJson(url: string) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new IntegrationApiError(503, "CONTRACT_AUTHORITY_UNAVAILABLE", `Contracts authority returned HTTP ${response.status}`);
    return await response.json() as Record<string, unknown>;
  } catch (error) {
    if (error instanceof IntegrationApiError) throw error;
    throw new IntegrationApiError(503, "CONTRACT_AUTHORITY_UNAVAILABLE", "Contracts authority could not be verified");
  } finally { clearTimeout(timer); }
}
async function assertLiveContractAuthority(env: WorkerEnv, envelopeVersion: string) {
  const base = env.CONTRACTS_BASE_URL.replace(/\/$/, "");
  const meta = await fetchJson(`${base}/registry/registry-meta.json`);
  if (meta.status !== "stable") throw new IntegrationApiError(503, "CONTRACT_AUTHORITY_NOT_STABLE", "Live Contracts Registry is not stable");
  const stableRelease = requiredString(meta.stableRelease, "registry.stableRelease", 40);
  if (stableRelease !== envelopeVersion) throw new IntegrationApiError(409, "CONTRACT_RELEASE_MISMATCH", `Live stable release ${stableRelease} does not match payload ${envelopeVersion}`);
  const ref = requiredString(meta.productionReleaseManifest, "registry.productionReleaseManifest", 500).replace(/^\/+/, "");
  const release = await fetchJson(new URL(ref, `${base}/`).toString());
  const acceptance = asRecord(release.acceptance); const summary = asRecord(acceptance?.summary);
  if (release.releaseVersion !== stableRelease || release.status !== "STABLE" || Number(summary?.blockingFailures) !== 0) throw new IntegrationApiError(503, "CONTRACT_RELEASE_NOT_READY", `Live Contracts release ${stableRelease} is not clean STABLE`);
}

async function hardDeletePrivateRecords(env: WorkerEnv, input: { submissionId: string; leadId: string; submission: boolean; lead: boolean }) {
  const statements = [];
  if (input.submission) statements.push(env.DB.prepare("DELETE FROM app_documents WHERE namespace=? AND id=?").bind(SUBMISSION_NAMESPACE, input.submissionId));
  if (input.lead) statements.push(env.DB.prepare("DELETE FROM app_documents WHERE namespace=? AND id=?").bind(LEAD_NAMESPACE, input.leadId));
  if (statements.length) await env.DB.batch(statements);
}
async function projectDigitalLead(repository: D1DocumentRepository, projection: DigitalLeadProjection, allowExisting = false) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await repository.get(STAFF_STATE_NAMESPACE, DIGITAL_LEADS_KEY);
    const rows = current ? current.payload : [];
    if (!Array.isArray(rows)) throw new IntegrationApiError(500, "DIGITAL_LEAD_STATE_INVALID", "Digital lead state is not an array");
    const existing = rows.find((row) => asRecord(row)?.id === projection.id);
    if (existing) {
      const source = asRecord(existing)?.source;
      if (allowExisting && source === "nextf.lk") return { version: current?.version ?? 1, alreadyPresent: true };
      throw new IntegrationApiError(409, "LEAD_ID_CONFLICT", "Lead identifier already exists in Digital Sales");
    }
    try {
      const updated = await repository.put(STAFF_STATE_NAMESPACE, DIGITAL_LEADS_KEY, [projection, ...rows].slice(0, 5000), { expectedVersion: current?.version });
      return { version: updated.version, alreadyPresent: false };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Optimistic concurrency conflict") && attempt < 2) continue;
      throw error;
    }
  }
  throw new IntegrationApiError(409, "DIGITAL_LEAD_CONFLICT", "Digital lead state changed during ingestion; retry safely with the same Idempotency-Key");
}
async function removeProjectedDigitalLead(repository: D1DocumentRepository, leadId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await repository.get(STAFF_STATE_NAMESPACE, DIGITAL_LEADS_KEY);
    if (!current || !Array.isArray(current.payload)) return;
    const rows = current.payload as unknown[];
    const target = rows.find((row) => asRecord(row)?.id === leadId);
    if (!target) return;
    if (asRecord(target)?.source !== "nextf.lk") throw new Error("Refusing to remove a non-nextf.lk lead during integration rollback");
    try {
      await repository.put(STAFF_STATE_NAMESPACE, DIGITAL_LEADS_KEY, rows.filter((row) => asRecord(row)?.id !== leadId), { expectedVersion: current.version });
      return;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Optimistic concurrency conflict") && attempt < 2) continue;
      throw error;
    }
  }
}
async function recoverExisting(env: WorkerEnv, envelope: ProjectRequestEnvelope, projection: DigitalLeadProjection, idempotencyKey: string, requestId: string) {
  const repository = new D1DocumentRepository(env.DB);
  const [submission, lead] = await Promise.all([repository.get(SUBMISSION_NAMESPACE, envelope.records.submission.id), repository.get(LEAD_NAMESPACE, envelope.records.lead.id)]);
  if (!submission || !lead) return undefined;
  if (canonical(submission.payload) !== canonical(envelope.records.submission) || canonical(lead.payload) !== canonical(envelope.records.lead)) throw new IntegrationApiError(409, "RECORD_ID_CONFLICT", "Submission or lead identifier already exists with different content");
  await projectDigitalLead(repository, projection, true);
  const receipt = { accepted: true, submissionId: envelope.records.submission.id, leadId: envelope.records.lead.id, digitalLeadId: projection.id, receiptId: `project-request:${envelope.records.submission.id}` };
  await new D1IdempotencyRepository(env.DB).complete(idempotencyKey, JSON.stringify(receipt));
  await recordAudit(env.DB, { id: crypto.randomUUID(), action: COMMAND_NAME, principalKind: "service", principalId: SITE_ID, targetType: "forms.submission", targetId: envelope.records.submission.id, outcome: "recovered", requestId, correlationId: requestId, detail: "Recovered an interrupted NEXT F website project-request ingestion without creating duplicate records." });
  return receipt;
}

export async function handleNextfProjectRequest(request: Request, env: WorkerEnv, requestId: string): Promise<Response> {
  if (request.method !== "POST") return problem(405, "METHOD_NOT_ALLOWED", "NEXT F project-request integration requires POST", requestId);
  try {
    assertBearer(request, env);
    assertHeader(request, "x-nextf-contract-version", ENVELOPE_CONTRACT_VERSION);
    assertHeader(request, "x-nextf-event", ENVELOPE_TYPE);
    assertHeader(request, "x-nextf-site-id", SITE_ID);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) throw new IntegrationApiError(413, "PAYLOAD_TOO_LARGE", "Project request payload exceeds the integration limit");
    let raw: unknown;
    try { raw = await request.json(); } catch { throw new IntegrationApiError(400, "VALIDATION_FAILED", "Project request body must be valid JSON"); }
    const { envelope, projection, idempotencyKey } = validateEnvelope(raw, request);
    const requestHash = await sha256(canonical(envelope));
    const idempotency = new D1IdempotencyRepository(env.DB);
    let existing = await idempotency.get(idempotencyKey);
    if (existing) {
      const same = existing.command_name === COMMAND_NAME && existing.principal_fingerprint === PRINCIPAL_FINGERPRINT && existing.request_hash === requestHash;
      if (!same) throw new IntegrationApiError(409, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different project request");
      if (existing.state === "completed" && existing.response_reference) {
        const receipt = JSON.parse(existing.response_reference) as Record<string, unknown>;
        return json({ ok: true, requestId, data: { ...receipt, replayed: true } }, 202);
      }
      const recovered = await recoverExisting(env, envelope, projection, idempotencyKey, requestId);
      if (recovered) return json({ ok: true, requestId, data: { ...recovered, replayed: true } }, 202);
      if (existing.state === "claimed") throw new IntegrationApiError(409, "IDEMPOTENCY_IN_PROGRESS", "This project request is already being processed");
      await env.DB.prepare("DELETE FROM idempotency_records WHERE key=? AND state='failed'").bind(idempotencyKey).run();
      existing = undefined;
    }

    await assertLiveContractAuthority(env, envelope.contractVersion);
    const claim = await idempotency.claim({ key: idempotencyKey, commandName: COMMAND_NAME, principalFingerprint: PRINCIPAL_FINGERPRINT, requestHash, ttlSeconds: 7 * 86400 });
    if (claim.outcome === "conflict") throw new IntegrationApiError(409, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different project request");
    if (claim.outcome === "replay") throw new IntegrationApiError(409, "IDEMPOTENCY_IN_PROGRESS", "This project request is already being processed");

    const repository = new D1DocumentRepository(env.DB);
    let createdSubmission = false; let createdLead = false; let projectedLead = false; let completedAuditId = "";
    try {
      const [submissionExisting, leadExisting] = await Promise.all([repository.get(SUBMISSION_NAMESPACE, envelope.records.submission.id), repository.get(LEAD_NAMESPACE, envelope.records.lead.id)]);
      if (submissionExisting || leadExisting) throw new IntegrationApiError(409, "RECORD_ID_CONFLICT", "Submission or lead identifier already exists");
      await repository.create({ namespace: SUBMISSION_NAMESPACE, id: envelope.records.submission.id, payload: envelope.records.submission }); createdSubmission = true;
      await repository.create({ namespace: LEAD_NAMESPACE, id: envelope.records.lead.id, payload: envelope.records.lead }); createdLead = true;
      const projectionResult = await projectDigitalLead(repository, projection); projectedLead = !projectionResult.alreadyPresent;

      const receipt = { accepted: true, submissionId: envelope.records.submission.id, leadId: envelope.records.lead.id, digitalLeadId: projection.id, receiptId: `project-request:${envelope.records.submission.id}` };
      completedAuditId = crypto.randomUUID();
      await recordAudit(env.DB, { id: completedAuditId, action: COMMAND_NAME, principalKind: "service", principalId: SITE_ID, targetType: "forms.submission", targetId: envelope.records.submission.id, outcome: "completed", requestId, correlationId: requestId, detail: `Accepted ${ENVELOPE_TYPE}; private submission/lead stored and lead projected to Digital Sales.` });
      await idempotency.complete(idempotencyKey, JSON.stringify(receipt));
      const event: ProductionEvent = { id: crypto.randomUUID(), type: ENVELOPE_TYPE, idempotencyKey: `integration:${idempotencyKey}`, occurredAt: new Date().toISOString(), payload: { submissionId: envelope.records.submission.id, leadId: envelope.records.lead.id, siteId: SITE_ID } };
      try { await env.EVENTS.send(event, { contentType: "json" }); }
      catch { await recordAudit(env.DB, { id: crypto.randomUUID(), action: `${COMMAND_NAME}.event`, principalKind: "service", principalId: SITE_ID, targetType: "forms.submission", targetId: envelope.records.submission.id, outcome: "queue_failed", requestId, correlationId: requestId, detail: "Project request was persisted, but the optional downstream event could not be queued." }).catch(() => undefined); }
      return json({ ok: true, requestId, data: { ...receipt, replayed: false } }, 202);
    } catch (error) {
      if (projectedLead) await removeProjectedDigitalLead(repository, projection.id).catch(() => undefined);
      await hardDeletePrivateRecords(env, { submissionId: envelope.records.submission.id, leadId: envelope.records.lead.id, submission: createdSubmission, lead: createdLead }).catch(() => undefined);
      if (completedAuditId) await env.DB.prepare("DELETE FROM audit_events WHERE id=?").bind(completedAuditId).run().catch(() => undefined);
      await idempotency.fail(idempotencyKey, error instanceof IntegrationApiError ? error.code : "INTEGRATION_WRITE_FAILED");
      throw error;
    }
  } catch (error) {
    if (error instanceof IntegrationApiError) return problem(error.status, error.code, error.message, requestId);
    await recordAudit(env.DB, { id: crypto.randomUUID(), action: `${COMMAND_NAME}.error`, principalKind: "service", principalId: SITE_ID, targetType: "integration", targetId: INTEGRATION_PATH, outcome: "failed", requestId, correlationId: requestId, detail: "NEXT F website project-request ingestion failed with an internal error. Raw PII/error payload is intentionally not recorded." }).catch(() => undefined);
    return problem(500, "INTERNAL_ERROR", "Project request ingestion failed", requestId);
  }
}

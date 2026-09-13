import type { BackendAuditSink } from "./audit";
import { authorizeOperation, type AuthorizationDataSource } from "./authorization";
import type { BackendCommandName, BackendQueryName } from "./contracts";
import { principalFingerprint, stableRequestFingerprint, type IdempotencyRepository } from "./idempotency";
import { problem, type ApiRequestContext, type ApiResult, type WorkspaceScope } from "./types";

export type CommandHandlerResult<T> = { responseReference: string; data: T };
export type CommandExecution<T> =
  | { replayed: false; responseReference: string; data: T }
  | { replayed: true; responseReference: string };

export type BackendBoundaryDependencies = {
  authorizationSource: AuthorizationDataSource;
  idempotencyRepository: IdempotencyRepository;
  auditSink?: BackendAuditSink;
  idempotencyTtlSeconds?: number;
};

function fingerprintPrincipal(context: ApiRequestContext) {
  const principal = context.principal;
  if (principal.kind === "staff") return principalFingerprint(["staff", principal.staffUserId, principal.organizationId]);
  if (principal.kind === "customer") return principalFingerprint(["customer", principal.accountId, principal.workspaceId, principal.membershipId]);
  if (principal.kind === "demo") return principalFingerprint(["demo", principal.demoRequestId, principal.demoEnvironmentId]);
  if (principal.kind === "public") return principalFingerprint(["public", principal.source, principal.principalId]);
  return principalFingerprint(["service", principal.serviceId, ...principal.scopes.slice().sort()]);
}

async function recordAudit(deps: BackendBoundaryDependencies, context: ApiRequestContext, action: string, workspaceScope: WorkspaceScope | undefined, outcome: "allowed" | "denied" | "completed" | "failed", detail: string) {
  if (!deps.auditSink) return;
  await deps.auditSink.record({
    action,
    principalKind: context.principal.kind,
    principalId: context.principal.principalId,
    organizationId: workspaceScope?.organizationId,
    workspaceId: workspaceScope?.workspaceId,
    targetType: workspaceScope ? "customer-workspace" : "backend-operation",
    targetId: workspaceScope?.workspaceId ?? action,
    outcome,
    requestId: context.requestId,
    correlationId: context.correlationId,
    detail,
  });
}

export async function executeAuthorizedQuery<T>(deps: BackendBoundaryDependencies, context: ApiRequestContext, input: { operationName: BackendQueryName; workspaceScope?: WorkspaceScope; handler: () => Promise<T> | T }): Promise<ApiResult<T>> {
  const denied = authorizeOperation(context, { operationName: input.operationName, workspaceScope: input.workspaceScope }, deps.authorizationSource);
  if (denied) {
    await recordAudit(deps, context, input.operationName, input.workspaceScope, "denied", denied.problem.detail);
    return denied;
  }
  await recordAudit(deps, context, input.operationName, input.workspaceScope, "allowed", "Backend query authorization passed.");
  try {
    const data = await input.handler();
    return { ok: true, requestId: context.requestId, correlationId: context.correlationId, data };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Backend query failed.";
    await recordAudit(deps, context, input.operationName, input.workspaceScope, "failed", detail);
    return problem(context, "INTERNAL_ERROR", "Query failed", detail, false);
  }
}

export async function executeIdempotentCommand<T>(deps: BackendBoundaryDependencies, context: ApiRequestContext, input: { operationName: BackendCommandName; workspaceScope?: WorkspaceScope; commandInput: unknown; handler: () => Promise<CommandHandlerResult<T>> | CommandHandlerResult<T> }): Promise<ApiResult<CommandExecution<T>>> {
  const denied = authorizeOperation(context, { operationName: input.operationName, workspaceScope: input.workspaceScope }, deps.authorizationSource);
  if (denied) {
    await recordAudit(deps, context, input.operationName, input.workspaceScope, "denied", denied.problem.detail);
    return denied;
  }
  const key = context.idempotencyKey!;
  const claim = await deps.idempotencyRepository.claim({
    key,
    commandName: input.operationName,
    principalFingerprint: fingerprintPrincipal(context),
    requestHash: stableRequestFingerprint(input.commandInput),
    ttlSeconds: deps.idempotencyTtlSeconds ?? 86_400,
  });
  if (claim.outcome === "conflict") {
    await recordAudit(deps, context, input.operationName, input.workspaceScope, "denied", "Idempotency key was already used for a different command payload or principal.");
    return problem(context, "IDEMPOTENCY_CONFLICT", "Idempotency key conflict", "The supplied Idempotency-Key is already bound to a different authenticated command payload.");
  }
  if (claim.outcome === "replay" && claim.record.state === "completed" && claim.record.responseReference) {
    return { ok: true, requestId: context.requestId, correlationId: context.correlationId, data: { replayed: true, responseReference: claim.record.responseReference } };
  }
  if (claim.outcome === "replay") {
    return problem(context, "CONFLICT", "Command already in progress", "The same idempotent command is already claimed. Retry after the original command reaches a terminal state.", true);
  }
  await recordAudit(deps, context, input.operationName, input.workspaceScope, "allowed", "Backend command authorization and idempotency claim passed.");
  try {
    const result = await input.handler();
    await deps.idempotencyRepository.complete(key, result.responseReference);
    await recordAudit(deps, context, input.operationName, input.workspaceScope, "completed", `Command completed with response reference ${result.responseReference}.`);
    return { ok: true, requestId: context.requestId, correlationId: context.correlationId, data: { replayed: false, responseReference: result.responseReference, data: result.data } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Backend command failed.";
    await deps.idempotencyRepository.fail(key, "COMMAND_FAILED");
    await recordAudit(deps, context, input.operationName, input.workspaceScope, "failed", detail);
    return problem(context, "INTERNAL_ERROR", "Command failed", detail, true);
  }
}

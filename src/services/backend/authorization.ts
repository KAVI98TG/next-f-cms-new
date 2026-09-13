import type { Permission } from "../../app/auth/types";
import { getApiOperation, type BackendCommandName, type BackendQueryName } from "./contracts";
import { problem, type ApiFailure, type ApiRequestContext, type WorkspaceScope } from "./types";

export type WorkspaceAuthorizationRecord = {
  workspaceId: string;
  organizationId: string;
  status: "requested" | "provisioning" | "active" | "read_only" | "suspended" | "closed";
};

export type MembershipAuthorizationRecord = {
  id: string;
  accountId: string;
  workspaceId: string;
  customerRoleId: string;
  status: "invited" | "active" | "suspended" | "revoked";
  invitationState: "pending" | "accepted" | "expired" | "revoked";
};

export type DemoAuthorizationRecord = {
  id: string;
  demoRequestId: string;
  environmentKey: string;
  status: "provisioning" | "active" | "expired" | "revoked";
  dataPolicy: "synthetic_only";
  expiresAt: string;
};

export type AuthorizationDataSource = {
  getWorkspace(workspaceId: string): WorkspaceAuthorizationRecord | undefined;
  getMembership(membershipId: string): MembershipAuthorizationRecord | undefined;
  getDemoEnvironment(environmentId: string): DemoAuthorizationRecord | undefined;
};

export type AuthorizeOperationInput = {
  operationName: BackendQueryName | BackendCommandName;
  workspaceScope?: WorkspaceScope;
};

function missingStaffPermission(context: ApiRequestContext, required: Permission[]): ApiFailure | undefined {
  const principal = context.principal;
  if (principal.kind !== "staff") return undefined;
  const missing = required.filter((permission) => !principal.permissions.includes(permission));
  if (!missing.length) return undefined;
  return problem(context, "FORBIDDEN", "Staff permission required", `Missing staff permission(s): ${missing.join(", ")}.`);
}

export function authorizeOperation(context: ApiRequestContext, input: AuthorizeOperationInput, source: AuthorizationDataSource): ApiFailure | undefined {
  const definition = getApiOperation(input.operationName);
  if (!definition) return problem(context, "NOT_FOUND", "Unknown API operation", `No V1 backend operation is registered as ${input.operationName}.`);
  if (!definition.allowedPrincipals.includes(context.principal.kind)) {
    return problem(context, "FORBIDDEN", "Principal type is not allowed", `${context.principal.kind} principals cannot execute ${definition.name}.`);
  }
  if (definition.kind === "command" && definition.idempotency === "required" && !context.idempotencyKey?.trim()) {
    return problem(context, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency key required", `${definition.name} is a mutating command and requires an Idempotency-Key.`);
  }
  if (context.principal.kind === "staff") {
    const missing = missingStaffPermission(context, definition.staffPermissions ?? []);
    if (missing) return missing;
    if (definition.workspaceScoped) {
      if (!input.workspaceScope) return problem(context, "VALIDATION_FAILED", "Workspace scope required", `${definition.name} requires an explicit workspace scope.`);
      const workspace = source.getWorkspace(input.workspaceScope.workspaceId);
      if (!workspace || workspace.organizationId !== input.workspaceScope.organizationId) return problem(context, "WORKSPACE_SCOPE_MISMATCH", "Workspace scope mismatch", "The requested workspace does not belong to the supplied organization scope.");
    }
    return undefined;
  }
  if (context.principal.kind === "customer") {
    if (!input.workspaceScope) return problem(context, "WORKSPACE_SCOPE_MISMATCH", "Customer workspace scope required", "Customer operations must be scoped to the workspace embedded in the authenticated principal.");
    if (input.workspaceScope.workspaceId !== context.principal.workspaceId || input.workspaceScope.organizationId !== context.principal.organizationId) {
      return problem(context, "WORKSPACE_SCOPE_MISMATCH", "Cross-workspace access denied", "A Customer principal cannot select a different organization or workspace through request input.");
    }
    const workspace = source.getWorkspace(context.principal.workspaceId);
    if (!workspace || workspace.organizationId !== context.principal.organizationId || !["active", "read_only"].includes(workspace.status)) {
      return problem(context, "FORBIDDEN", "Customer Workspace unavailable", "The authenticated Customer Workspace is not available for customer access.");
    }
    const membership = source.getMembership(context.principal.membershipId);
    if (!membership || membership.accountId !== context.principal.accountId || membership.workspaceId !== context.principal.workspaceId || membership.customerRoleId !== context.principal.customerRoleId || membership.status !== "active" || membership.invitationState !== "accepted") {
      return problem(context, "FORBIDDEN", "Active membership required", "Customer access requires the exact active, accepted membership represented by the authenticated principal.");
    }
    return undefined;
  }
  if (context.principal.kind === "demo") {
    const environment = source.getDemoEnvironment(context.principal.demoEnvironmentId);
    if (!environment || environment.demoRequestId !== context.principal.demoRequestId || environment.environmentKey !== context.principal.environmentKey || environment.dataPolicy !== "synthetic_only" || environment.status !== "active" || new Date(environment.expiresAt).getTime() <= Date.now()) {
      return problem(context, "DEMO_ISOLATION_VIOLATION", "Demo environment unavailable", "Demo principals are limited to their active synthetic-only environment and cannot access production workspace scope.");
    }
    if (input.workspaceScope) return problem(context, "DEMO_ISOLATION_VIOLATION", "Production workspace scope denied", "Demo requests must not contain a production Customer Workspace scope.");
    return undefined;
  }
  if (context.principal.kind === "public") {
    if (input.workspaceScope) return problem(context, "FORBIDDEN", "Public workspace scope denied", "Public website requests never receive Customer Workspace scope.");
    if (context.principal.source !== "nextf.lk") return problem(context, "FORBIDDEN", "Public source not allowed", "This public ingress is reserved for the NEXT F Digital website route.");
    if (definition.kind === "command" && context.principal.abuseProtection !== "verified") return problem(context, "PRECONDITION_FAILED", "Public abuse protection required", "Public mutation commands require server/edge rate-limit and abuse-protection evidence before business processing.");
    return undefined;
  }
  const servicePrincipal = context.principal;
  if (servicePrincipal.kind !== "service") return problem(context, "FORBIDDEN", "Unsupported principal", "The authenticated principal cannot execute this operation.");
  const missingScopes = (definition.serviceScopes ?? []).filter((scope) => !servicePrincipal.scopes.includes(scope));
  if (missingScopes.length) return problem(context, "SERVICE_SCOPE_MISSING", "Service scope required", `Missing service scope(s): ${missingScopes.join(", ")}.`);
  if (input.workspaceScope) return problem(context, "FORBIDDEN", "Service workspace impersonation denied", "Service principals operate through explicit adapter/service contracts and do not impersonate Customer Workspace principals.");
  return undefined;
}

import type { Permission } from "../../app/auth/types";

export type ApiVersion = "v1";
export type PrincipalKind = "staff" | "customer" | "demo" | "public" | "service";
export type AuthenticationAssurance = "anonymous" | "local-development" | "cloudflare-access" | "password" | "mfa" | "service-credential";

export type StaffPrincipal = {
  kind: "staff";
  principalId: string;
  staffUserId: string;
  organizationId: string;
  permissions: Permission[];
  assurance: AuthenticationAssurance;
};

export type CustomerPrincipal = {
  kind: "customer";
  principalId: string;
  accountId: string;
  organizationId: string;
  workspaceId: string;
  membershipId: string;
  customerRoleId: string;
  assurance: AuthenticationAssurance;
};

export type DemoPrincipal = {
  kind: "demo";
  principalId: string;
  demoRequestId: string;
  demoEnvironmentId: string;
  environmentKey: string;
  expiresAt: string;
  assurance: AuthenticationAssurance;
};


export type PublicPrincipal = {
  kind: "public";
  principalId: string;
  source: "nextf.lk" | "unknown";
  abuseProtection: "verified" | "unverified";
  assurance: "anonymous";
};

export type ServicePrincipal = {
  kind: "service";
  principalId: string;
  serviceId: string;
  scopes: string[];
  assurance: "service-credential";
};

export type RequestPrincipal = StaffPrincipal | CustomerPrincipal | DemoPrincipal | PublicPrincipal | ServicePrincipal;
export type AuthenticatedPrincipal = Exclude<RequestPrincipal, PublicPrincipal>;

export type ApiRequestContext = {
  apiVersion: ApiVersion;
  requestId: string;
  correlationId: string;
  principal: RequestPrincipal;
  issuedAt: string;
  idempotencyKey?: string;
};

export type ApiProblemCode =
  | "UNAUTHENTICATED"
  | "ACCESS_JWKS_UNAVAILABLE"
  | "STAFF_IDENTITY_NOT_BOUND"
  | "STAFF_SUBJECT_MISMATCH"
  | "ORIGIN_DENIED"
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "ABUSE_PROTECTION_FAILED"
  | "FORBIDDEN"
  | "WORKSPACE_SCOPE_MISMATCH"
  | "DEMO_ISOLATION_VIOLATION"
  | "SERVICE_SCOPE_MISSING"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_IN_PROGRESS"
  | "IDEMPOTENCY_PREVIOUSLY_FAILED"
  | "IDEMPOTENCY_REPLAY_RESULT_UNAVAILABLE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "PRECONDITION_FAILED"
  | "ADAPTER_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ApiProblem = {
  code: ApiProblemCode;
  title: string;
  detail: string;
  requestId: string;
  correlationId: string;
  retryable: boolean;
};

export type ApiSuccess<T> = {
  ok: true;
  requestId: string;
  correlationId: string;
  data: T;
};

export type ApiFailure = {
  ok: false;
  requestId: string;
  correlationId: string;
  problem: ApiProblem;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type QueryEnvelope<TName extends string, TInput> = {
  kind: "query";
  version: ApiVersion;
  name: TName;
  input: TInput;
};

export type CommandEnvelope<TName extends string, TInput> = {
  kind: "command";
  version: ApiVersion;
  name: TName;
  input: TInput;
};

export type WorkspaceScope = {
  organizationId: string;
  workspaceId: string;
};

export type BackendRuntimeMode = "local-prototype" | "production-adapter";

export const problem = (context: Pick<ApiRequestContext, "requestId" | "correlationId">, code: ApiProblemCode, title: string, detail: string, retryable = false): ApiFailure => ({
  ok: false,
  requestId: context.requestId,
  correlationId: context.correlationId,
  problem: { code, title, detail, requestId: context.requestId, correlationId: context.correlationId, retryable },
});

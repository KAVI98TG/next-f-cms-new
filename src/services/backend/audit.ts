import type { RequestPrincipal } from "./types";

export type BackendAuditEvent = {
  id: string;
  action: string;
  principalKind: RequestPrincipal["kind"];
  principalId: string;
  organizationId?: string;
  workspaceId?: string;
  targetType: string;
  targetId: string;
  outcome: "allowed" | "denied" | "completed" | "failed";
  requestId: string;
  correlationId: string;
  detail: string;
  createdAt: string;
};

export interface BackendAuditSink {
  record(event: Omit<BackendAuditEvent, "id" | "createdAt">): Promise<BackendAuditEvent>;
}

export const BACKEND_AUDIT_RULES = [
  "Authorization denials for sensitive or cross-tenant operations are auditable backend events.",
  "Mutating commands record request/correlation IDs and the authenticated principal, never a client-supplied actor label.",
  "Customer-visible activity may be projected from shared event infrastructure but must not expose internal-only audit detail.",
] as const;

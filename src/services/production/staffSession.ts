import type { Permission } from "../../app/auth/types";
import { isPermission } from "../../app/auth/types";
import { ProductionBackendClient } from "./httpClient";
import { readProductionRuntimeConfig } from "./runtime";

export type ProductionStaffSession = {
  principalId: string;
  staffUserId: string;
  organizationId: string;
  email: string;
  permissions: Permission[];
  assurance: "cloudflare-access";
};

const runtime = readProductionRuntimeConfig();
const client = runtime.mode === "production-api" ? new ProductionBackendClient(runtime.apiBaseUrl) : undefined;
let session: ProductionStaffSession | undefined;
let initializationPromise: Promise<void> | undefined;

function normalizeSession(value: unknown): ProductionStaffSession {
  if (!value || typeof value !== "object") throw new Error("Production staff session payload is invalid");
  const row = value as Record<string, unknown>;
  const rawPermissions = Array.isArray(row.permissions) ? row.permissions.filter((item): item is string => typeof item === "string") : [];
  const permissions = rawPermissions.filter(isPermission);
  if (typeof row.principalId !== "string" || !row.principalId) throw new Error("Production staff session is missing principalId");
  if (typeof row.staffUserId !== "string" || !row.staffUserId) throw new Error("Production staff session is missing staffUserId");
  if (typeof row.organizationId !== "string" || !row.organizationId) throw new Error("Production staff session is missing organizationId");
  if (typeof row.email !== "string" || !row.email.includes("@")) throw new Error("Production staff session is missing a valid email");
  if (row.assurance !== "cloudflare-access") throw new Error("Production staff session assurance is invalid");
  return { principalId: row.principalId, staffUserId: row.staffUserId, organizationId: row.organizationId, email: row.email.toLowerCase(), permissions, assurance: "cloudflare-access" };
}

export async function initializeProductionStaffSession() {
  if (runtime.mode !== "production-api" || session) return;
  if (initializationPromise) return initializationPromise;
  initializationPromise = (async () => {
    if (!client) throw new Error("Production API client is unavailable");
    const result = await client.execute<unknown>({ operation: "staff.session.get", kind: "query", input: {} });
    if (!result.ok) throw new Error(`${result.problem.code}: ${result.problem.detail}`);
    session = normalizeSession(result.data);
  })();
  return initializationPromise;
}

export function getProductionStaffSession(): ProductionStaffSession | undefined {
  if (runtime.mode !== "production-api") return undefined;
  if (!session) throw new Error("Production staff session was read before authentication initialization");
  return session;
}

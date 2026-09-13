import type { SessionUser } from "../../app/auth/types";
import { customerAccessStore } from "../../platform/customer-access/customerAccessStore";
import { identityStore } from "../../platform/identity/identityStore";
import { platformOperationsStore } from "../../platform/services/platformOperationsStore";
import { customerCapabilityPolicyStore } from "../../next-f/website-platform/customerCapabilityPolicyStore";
import { websitePlatformStore } from "../../next-f/website-platform/websitePlatformStore";
import { publicSiteIntegrationStore, NEXTF_PUBLIC_HOST, NEXTF_PUBLIC_SITE_KEY } from "../../next-f/website-platform/publicSiteIntegrationStore";
import { workspaceProvisioningStore } from "../../next-f/website-platform/workspaceProvisioningStore";
import { BACKEND_API_OPERATIONS } from "./contracts";
import type { AuthorizationDataSource } from "./authorization";
import type { CustomerWorkspaceProjection, DemoWorkspaceProjection, PublicSiteBootstrapProjection, StaffWorkspaceProjection } from "./projections";
import type { CustomerPrincipal, DemoPrincipal, PublicPrincipal, StaffPrincipal } from "./types";

export const localAuthorizationSource: AuthorizationDataSource = {
  getWorkspace(workspaceId) {
    const row = websitePlatformStore.getWorkspaces().find((item) => item.id === workspaceId);
    return row ? { workspaceId: row.id, organizationId: row.organizationId, status: row.status } : undefined;
  },
  getMembership(membershipId) {
    const row = customerAccessStore.getMemberships().find((item) => item.id === membershipId);
    return row ? { id: row.id, accountId: row.accountId, workspaceId: row.workspaceId, customerRoleId: row.customerRoleId, status: row.status, invitationState: row.invitationState === "not_sent" ? "pending" : row.invitationState } : undefined;
  },
  getDemoEnvironment(environmentId) {
    const row = workspaceProvisioningStore.getDemoEnvironments().find((item) => item.id === environmentId);
    return row ? { id: row.id, demoRequestId: row.demoRequestId, environmentKey: row.environmentKey, status: row.status, dataPolicy: row.dataPolicy, expiresAt: row.expiresAt } : undefined;
  },
};

export function buildLocalStaffPrincipal(user: SessionUser): StaffPrincipal {
  const staffLink = identityStore.getStaffLinks().find((row) => row.platformUserId === user.id && row.status === "active");
  return {
    kind: "staff",
    principalId: staffLink?.accountId ?? `staff:${user.id}`,
    staffUserId: user.id,
    organizationId: "org_nextf",
    permissions: user.permissions,
    assurance: "local-development",
  };
}

export function buildCustomerPrincipal(membershipId: string): CustomerPrincipal {
  const membership = customerAccessStore.getMemberships().find((row) => row.id === membershipId);
  if (!membership || membership.status !== "active" || membership.invitationState !== "accepted") throw new Error("An active accepted Customer Workspace membership is required to establish a Customer principal");
  const account = identityStore.getAccounts().find((row) => row.id === membership.accountId);
  if (!account || account.state !== "active" || account.verificationState !== "verified") throw new Error("The NEXT F Account is not eligible for a Customer principal");
  const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === membership.workspaceId);
  if (!workspace || !["active", "read_only"].includes(workspace.status)) throw new Error("The Customer Workspace is not available for customer access");
  const organization = platformOperationsStore.getOrganizations().find((row) => row.id === workspace.organizationId && row.kind === "customer" && row.status === "active");
  if (!organization) throw new Error("The Customer Workspace organization is not an active customer organization");
  return {
    kind: "customer",
    principalId: account.id,
    accountId: account.id,
    organizationId: organization.id,
    workspaceId: workspace.id,
    membershipId: membership.id,
    customerRoleId: membership.customerRoleId,
    assurance: "password",
  };
}

export function buildPublicPrincipal(input: { requestId: string; abuseProtection: "verified" | "unverified" }): PublicPrincipal {
  return { kind: "public", principalId: `public:${input.requestId}`, source: "nextf.lk", abuseProtection: input.abuseProtection, assurance: "anonymous" };
}

export function buildDemoPrincipal(demoEnvironmentId: string): DemoPrincipal {
  const environment = workspaceProvisioningStore.getDemoEnvironments().find((row) => row.id === demoEnvironmentId);
  if (!environment || environment.status !== "active" || environment.dataPolicy !== "synthetic_only" || new Date(environment.expiresAt).getTime() <= Date.now()) throw new Error("An active synthetic-only Demo Environment is required");
  const request = websitePlatformStore.getDemoRequests().find((row) => row.id === environment.demoRequestId);
  if (!request || !["active", "extended"].includes(request.status)) throw new Error("Demo Access Request is not active");
  return {
    kind: "demo",
    principalId: `demo:${request.id}`,
    demoRequestId: request.id,
    demoEnvironmentId: environment.id,
    environmentKey: environment.environmentKey,
    expiresAt: environment.expiresAt,
    assurance: "password",
  };
}

export function buildLocalStaffWorkspaceProjection(workspaceId: string): StaffWorkspaceProjection {
  const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
  if (!workspace) throw new Error("Customer Workspace not found");
  const review = workspaceProvisioningStore.getReviews().find((row) => row.workspaceId === workspaceId);
  const attachments = workspaceProvisioningStore.getAttachments().filter((row) => row.workspaceId === workspaceId);
  const connections = websitePlatformStore.getSiteConnections().filter((row) => row.workspaceId === workspaceId);
  const memberships = customerAccessStore.getMemberships().filter((row) => row.workspaceId === workspaceId);
  const operationalFlags: string[] = [];
  if (!review || review.status !== "completed") operationalFlags.push("provisioning-review-incomplete");
  if (!connections.some((row) => row.status === "connected")) operationalFlags.push("no-connected-managed-site");
  if (!memberships.some((row) => row.status === "active" && row.invitationState === "accepted")) operationalFlags.push("no-active-customer-membership");
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceStatus: workspace.status,
    organizationId: workspace.organizationId,
    clientId: workspace.clientId,
    provisioningStatus: review?.status,
    attachedProjectIds: attachments.filter((row) => row.type === "project").map((row) => row.resourceId),
    attachedServiceIds: attachments.filter((row) => row.type === "service").map((row) => row.resourceId),
    connectedSiteIds: connections.filter((row) => row.status === "connected").map((row) => row.id),
    membershipCounts: {
      active: memberships.filter((row) => row.status === "active").length,
      invited: memberships.filter((row) => row.status === "invited").length,
      suspended: memberships.filter((row) => row.status === "suspended").length,
    },
    operationalFlags,
  };
}

export function buildLocalCustomerWorkspaceProjection(principal: CustomerPrincipal): CustomerWorkspaceProjection {
  const membership = customerAccessStore.getMemberships().find((row) => row.id === principal.membershipId && row.accountId === principal.accountId && row.workspaceId === principal.workspaceId && row.status === "active" && row.invitationState === "accepted");
  if (!membership) throw new Error("Customer principal no longer has an active accepted membership");
  const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === principal.workspaceId && row.organizationId === principal.organizationId);
  if (!workspace || !["active", "read_only"].includes(workspace.status)) throw new Error("Customer Workspace is not available");
  const attachments = workspaceProvisioningStore.getAttachments().filter((row) => row.workspaceId === workspace.id);
  const projections = customerCapabilityPolicyStore.getCanonicalAccessProjections();
  const sites = websitePlatformStore.getSiteConnections().filter((row) => row.workspaceId === workspace.id && row.status === "connected").map((connection) => ({
    siteConnectionId: connection.id,
    siteId: connection.siteId,
    lifecycle: connection.status,
    contractVersion: connection.contractVersion,
    customerCapabilitiesReady: Boolean(connection.validationEvidenceId && projections.some((row) => row.siteConnectionId === connection.id && row.validationEvidenceId === connection.validationEvidenceId)),
  }));
  return {
    workspaceId: workspace.id,
    name: workspace.name,
    organizationId: workspace.organizationId,
    status: workspace.status as "active" | "read_only",
    membership: { membershipId: membership.id, customerRoleId: membership.customerRoleId },
    projectIds: attachments.filter((row) => row.type === "project").map((row) => row.resourceId),
    serviceIds: attachments.filter((row) => row.type === "service").map((row) => row.resourceId),
    sites,
  };
}

export function buildLocalDemoWorkspaceProjection(principal: DemoPrincipal): DemoWorkspaceProjection {
  const environment = workspaceProvisioningStore.getDemoEnvironments().find((row) => row.id === principal.demoEnvironmentId && row.demoRequestId === principal.demoRequestId && row.environmentKey === principal.environmentKey && row.status === "active");
  if (!environment || environment.dataPolicy !== "synthetic_only" || new Date(environment.expiresAt).getTime() <= Date.now()) throw new Error("Demo Environment is not available");
  return { demoEnvironmentId: environment.id, environmentKey: environment.environmentKey, templateVersion: environment.templateVersion, status: "active", expiresAt: environment.expiresAt, dataPolicy: "synthetic_only", restrictions: [...environment.restrictions] };
}

export function buildLocalPublicSiteBootstrapProjection(): PublicSiteBootstrapProjection {
  return publicSiteIntegrationStore.buildPublicBootstrap();
}

export function getBackendBoundaryReadiness() {
  const commands = BACKEND_API_OPERATIONS.filter((row) => row.kind === "command");
  return {
    runtimeMode: "local-prototype" as const,
    operationCount: BACKEND_API_OPERATIONS.length,
    queryCount: BACKEND_API_OPERATIONS.filter((row) => row.kind === "query").length,
    commandCount: commands.length,
    idempotentCommandCount: commands.filter((row) => row.idempotency === "required").length,
    staffOperationCount: BACKEND_API_OPERATIONS.filter((row) => row.allowedPrincipals.includes("staff")).length,
    customerOperationCount: BACKEND_API_OPERATIONS.filter((row) => row.allowedPrincipals.includes("customer")).length,
    demoOperationCount: BACKEND_API_OPERATIONS.filter((row) => row.allowedPrincipals.includes("demo")).length,
    publicOperationCount: BACKEND_API_OPERATIONS.filter((row) => row.allowedPrincipals.includes("public")).length,
    serviceOperationCount: BACKEND_API_OPERATIONS.filter((row) => row.allowedPrincipals.includes("service")).length,
    productionTransportConnected: true,
    durableIdempotencyConnected: true,
    productionIdentityProviderConnected: false,
    managedSiteAdapterRegistryConnected: false,
    publicSiteReadiness: publicSiteIntegrationStore.getReadiness(),
    note: "V0.24 adds the D1-backed staff durable-state transport and durable idempotency implementation. Production Access identity provisioning, deployment bindings, managed-site adapters and exact live-site route wiring remain separate go-live phases.",
  };
}

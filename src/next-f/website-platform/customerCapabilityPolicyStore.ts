import { customerAccessStore } from "../../platform/customer-access/customerAccessStore";
import { platformStore } from "../../platform/services/platformStore";
import { digitalStore } from "../data/digitalStore";
import { contractRegistryStore, type RegistryVerificationAuthority } from "./contractRegistryStore";
import { websitePlatformStore } from "./websitePlatformStore";
import { workspaceProvisioningStore } from "./workspaceProvisioningStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type CustomerExposureMode = "hidden" | "read_only" | "approval_required" | "direct_edit";
export type CustomerPublishingMode = "not_applicable" | "staff_only" | "approval_required" | "direct_publish";
export type CustomerCapabilityOperation = "read" | "edit" | "publish";
export type CapabilityExecutionPath = "deny" | "read" | "change_request" | "direct_mutation" | "publish_request" | "direct_publish";
export type ServiceEntitlementStatus = "active" | "suspended" | "expired" | "revoked";
export type RolePermissionGrantStatus = "active" | "revoked";
export type SecurityRestrictionMode = "hidden" | "read_only";

export type PermissionRequirement = {
  allOf: string[];
  anyOf: string[];
};

export type CanonicalFieldAccessProjection = {
  fieldPath: string;
  maximumExposure: CustomerExposureMode;
  readPermissions: PermissionRequirement;
  editPermissions: PermissionRequirement;
};

export type CanonicalCapabilityAccessProjection = {
  capabilityId: string;
  moduleId?: string;
  maximumExposure: CustomerExposureMode;
  maximumPublishing: CustomerPublishingMode;
  readPermissions: PermissionRequirement;
  editPermissions: PermissionRequirement;
  publishPermissions: PermissionRequirement;
  fields: CanonicalFieldAccessProjection[];
};

export type CanonicalCustomerAccessProjectionRecord = {
  id: string;
  siteConnectionId: string;
  validationEvidenceId: string;
  registrySnapshotId: string;
  contractVersion: string;
  verificationAuthority: RegistryVerificationAuthority;
  capabilities: CanonicalCapabilityAccessProjection[];
  verifiedBy: string;
  verifiedAt: string;
  createdAt: string;
};

export type ServiceCapabilityEntitlementRecord = {
  id: string;
  workspaceId: string;
  siteConnectionId: string;
  serviceId: string;
  capabilityId: string;
  status: ServiceEntitlementStatus;
  startsAt: string;
  endsAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
};

export type CustomerCapabilityPolicyRecord = {
  id: string;
  siteConnectionId: string;
  capabilityId: string;
  exposureMode: CustomerExposureMode;
  publishingMode: CustomerPublishingMode;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFieldPolicyRecord = {
  id: string;
  siteConnectionId: string;
  capabilityId: string;
  fieldPath: string;
  exposureMode: CustomerExposureMode;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRolePermissionGrantRecord = {
  id: string;
  siteConnectionId: string;
  customerRoleId: string;
  permissionId: string;
  status: RolePermissionGrantStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
};

export type CustomerSecurityRestrictionRecord = {
  id: string;
  siteConnectionId: string;
  capabilityId: string;
  fieldPath?: string;
  mode: SecurityRestrictionMode;
  reason: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ResourceStateAuthorization = {
  readAllowed: boolean;
  editAllowed: boolean;
  publishAllowed: boolean;
  reason?: string;
};

export type EvaluateCustomerCapabilityInput = {
  membershipId: string;
  siteConnectionId: string;
  capabilityId: string;
  operation: CustomerCapabilityOperation;
  fieldPath?: string;
  resourceState: ResourceStateAuthorization;
  at?: string;
};

export type EffectiveCustomerCapabilityDecision = {
  allowed: boolean;
  executionPath: CapabilityExecutionPath;
  exposureMode: CustomerExposureMode;
  publishingMode: CustomerPublishingMode;
  reasons: string[];
  workspaceId?: string;
  customerRoleId?: string;
  serviceEntitlementId?: string;
  policyId?: string;
};

const KEYS = {
  canonicalAccess: "nextf.v0.16.website-platform.canonical-customer-access",
  entitlements: "nextf.v0.16.website-platform.service-entitlements",
  capabilityPolicies: "nextf.v0.16.website-platform.customer-capability-policies",
  fieldPolicies: "nextf.v0.16.website-platform.customer-field-policies",
  rolePermissionGrants: "nextf.v0.16.website-platform.customer-role-permission-grants",
  securityRestrictions: "nextf.v0.16.website-platform.customer-security-restrictions",
};

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:website-platform", { detail: key }));
  return result;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const timestamp = () => new Date().toISOString();
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const exposureRank: Record<CustomerExposureMode, number> = {
  hidden: 0,
  read_only: 1,
  approval_required: 2,
  direct_edit: 3,
};

const publishingRank: Record<Exclude<CustomerPublishingMode, "not_applicable">, number> = {
  staff_only: 0,
  approval_required: 1,
  direct_publish: 2,
};

function minimumExposure(values: CustomerExposureMode[]): CustomerExposureMode {
  return values.reduce((lowest, value) => exposureRank[value] < exposureRank[lowest] ? value : lowest, "direct_edit" as CustomerExposureMode);
}

function minimumPublishing(values: CustomerPublishingMode[]): CustomerPublishingMode {
  if (values.includes("not_applicable")) return "not_applicable";
  return (values as Array<Exclude<CustomerPublishingMode, "not_applicable">>).reduce((lowest, value) => publishingRank[value] < publishingRank[lowest] ? value : lowest, "direct_publish");
}

function normalizeRequirement(input?: Partial<PermissionRequirement>): PermissionRequirement {
  return { allOf: unique(input?.allOf ?? []), anyOf: unique(input?.anyOf ?? []) };
}

function normalizeProjection(input: CanonicalCapabilityAccessProjection): CanonicalCapabilityAccessProjection {
  const seen = new Set<string>();
  const fields = input.fields.map((field) => {
    const fieldPath = field.fieldPath.trim();
    if (!fieldPath) throw new Error("Canonical customer field projection contains an empty field path");
    if (seen.has(fieldPath)) throw new Error(`Duplicate canonical customer field path: ${fieldPath}`);
    seen.add(fieldPath);
    return {
      ...field,
      fieldPath,
      readPermissions: normalizeRequirement(field.readPermissions),
      editPermissions: normalizeRequirement(field.editPermissions),
    };
  });
  return {
    ...input,
    capabilityId: input.capabilityId.trim(),
    moduleId: input.moduleId?.trim() || undefined,
    readPermissions: normalizeRequirement(input.readPermissions),
    editPermissions: normalizeRequirement(input.editPermissions),
    publishPermissions: normalizeRequirement(input.publishPermissions),
    fields,
  };
}

function requirementIds(requirement: PermissionRequirement) {
  return unique([...requirement.allOf, ...requirement.anyOf]);
}

function permissionRequirementSatisfied(requirement: PermissionRequirement, granted: Set<string>) {
  if (requirement.allOf.length === 0 && requirement.anyOf.length === 0) return false;
  if (requirement.allOf.some((permissionId) => !granted.has(permissionId))) return false;
  if (requirement.anyOf.length && !requirement.anyOf.some((permissionId) => granted.has(permissionId))) return false;
  return true;
}

function capabilityPermissions(capability: CanonicalCapabilityAccessProjection) {
  return unique([
    ...requirementIds(capability.readPermissions),
    ...requirementIds(capability.editPermissions),
    ...requirementIds(capability.publishPermissions),
    ...capability.fields.flatMap((field) => [...requirementIds(field.readPermissions), ...requirementIds(field.editPermissions)]),
  ]);
}

function findProjection(siteConnectionId: string) {
  const connection = websitePlatformStore.getSiteConnections().find((row) => row.id === siteConnectionId);
  if (!connection?.validationEvidenceId) return undefined;
  return customerCapabilityPolicyStore.getCanonicalAccessProjections().find((row) => row.siteConnectionId === siteConnectionId && row.validationEvidenceId === connection.validationEvidenceId);
}

function requireProjection(siteConnectionId: string) {
  const projection = findProjection(siteConnectionId);
  if (!projection) throw new Error("Canonical Customer Capability Access projection is unavailable; customer exposure remains fail-closed");
  return projection;
}

function requireCanonicalCapability(siteConnectionId: string, capabilityId: string) {
  const projection = requireProjection(siteConnectionId);
  const capability = projection.capabilities.find((row) => row.capabilityId === capabilityId);
  if (!capability) throw new Error("Capability is not present in the trusted canonical customer access projection for this Site Connection");
  return { projection, capability };
}

function isEntitlementActive(row: ServiceCapabilityEntitlementRecord, at: Date) {
  if (row.status !== "active") return false;
  if (new Date(row.startsAt).getTime() > at.getTime()) return false;
  if (row.endsAt && new Date(row.endsAt).getTime() <= at.getTime()) return false;
  return true;
}

function normalizeExpiredEntitlements(rows: ServiceCapabilityEntitlementRecord[]) {
  const now = new Date();
  let changed = false;
  const normalized = rows.map((row) => {
    if (row.status === "active" && row.endsAt && new Date(row.endsAt).getTime() <= now.getTime()) {
      changed = true;
      return { ...row, status: "expired" as const, updatedAt: timestamp() };
    }
    return row;
  });
  if (changed) write(KEYS.entitlements, normalized);
  return normalized;
}

export const customerCapabilityPolicyStore = {
  getCanonicalAccessProjections: () => read<CanonicalCustomerAccessProjectionRecord[]>(KEYS.canonicalAccess, []),
  getServiceEntitlements: () => normalizeExpiredEntitlements(read<ServiceCapabilityEntitlementRecord[]>(KEYS.entitlements, [])),
  getCapabilityPolicies: () => read<CustomerCapabilityPolicyRecord[]>(KEYS.capabilityPolicies, []),
  getFieldPolicies: () => read<CustomerFieldPolicyRecord[]>(KEYS.fieldPolicies, []),
  getRolePermissionGrants: () => read<CustomerRolePermissionGrantRecord[]>(KEYS.rolePermissionGrants, []),
  getSecurityRestrictions: () => read<CustomerSecurityRestrictionRecord[]>(KEYS.securityRestrictions, []),

  recordCanonicalAccessProjection(input: {
    siteConnectionId: string;
    validationEvidenceId: string;
    registrySnapshotId: string;
    contractVersion: string;
    verificationAuthority: RegistryVerificationAuthority;
    verifiedBy: string;
    capabilities: CanonicalCapabilityAccessProjection[];
  }) {
    const connection = websitePlatformStore.getSiteConnections().find((row) => row.id === input.siteConnectionId);
    const validation = contractRegistryStore.getValidationEvidence().find((row) => row.id === input.validationEvidenceId && row.siteConnectionId === input.siteConnectionId);
    const snapshot = contractRegistryStore.getSnapshots().find((row) => row.id === input.registrySnapshotId && row.status === "trusted");
    if (!connection || !validation || !snapshot) throw new Error("Trusted Site Connection validation evidence is required for canonical customer access projection");
    if (connection.validationEvidenceId !== validation.id || validation.registrySnapshotId !== snapshot.id) throw new Error("Canonical customer access projection must match the active Site Connection validation evidence and trusted Registry snapshot");
    if (connection.manifestStatus !== "valid" || !["ready", "connected"].includes(connection.status)) throw new Error("Canonical customer access projection requires a canonically valid Site Connection");
    if (validation.contractVersion !== input.contractVersion || connection.contractVersion !== input.contractVersion || snapshot.contractVersion !== input.contractVersion) throw new Error("Canonical customer access projection Contract Version does not match the validated Site Connection");
    if (validation.verificationAuthority !== input.verificationAuthority || snapshot.verificationAuthority !== input.verificationAuthority) throw new Error("Canonical customer access projection verification authority does not match trusted validation evidence");
    if (!input.verifiedBy.trim()) throw new Error("Canonical customer access projection requires verifier identity");

    const resolvedCapabilityIds = new Set(validation.resolution.capabilityIds);
    const resolvedModuleIds = new Set(validation.resolution.moduleIds);
    const resolvedPermissionIds = new Set(validation.resolution.permissionIds);
    const seenCapabilities = new Set<string>();
    const capabilities = input.capabilities.map(normalizeProjection);
    for (const capability of capabilities) {
      if (!capability.capabilityId || !resolvedCapabilityIds.has(capability.capabilityId)) throw new Error(`Customer access projection references unresolved Capability ID: ${capability.capabilityId || "(empty)"}`);
      if (seenCapabilities.has(capability.capabilityId)) throw new Error(`Duplicate canonical customer access Capability ID: ${capability.capabilityId}`);
      seenCapabilities.add(capability.capabilityId);
      if (capability.moduleId && !resolvedModuleIds.has(capability.moduleId)) throw new Error(`Customer access projection references unresolved Module ID: ${capability.moduleId}`);
      for (const permissionId of capabilityPermissions(capability)) {
        if (!resolvedPermissionIds.has(permissionId)) throw new Error(`Customer access projection references unresolved Permission ID: ${permissionId}`);
      }
    }

    const now = timestamp();
    const row: CanonicalCustomerAccessProjectionRecord = {
      id: uid("customer_access_projection"),
      ...input,
      verifiedBy: input.verifiedBy.trim(),
      capabilities,
      verifiedAt: now,
      createdAt: now,
    };
    const prior = this.getCanonicalAccessProjections();
    write(KEYS.canonicalAccess, [row, ...prior]);
    platformStore.addAudit("System", "Canonical Customer Capability Access projection recorded", connection.siteId, "NEXT F Digital", `${capabilities.length} canonical capability access projection(s) bound to validation evidence ${validation.id}. No customer access is granted by projection alone.`, "info");
    return row;
  },

  grantServiceEntitlement(input: { workspaceId: string; siteConnectionId: string; serviceId: string; capabilityId: string; createdBy: string; endsAt?: string }) {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === input.workspaceId);
    const connection = websitePlatformStore.getSiteConnections().find((row) => row.id === input.siteConnectionId);
    const service = digitalStore.getServices().find((row) => row.id === input.serviceId && row.active);
    if (!workspace || !connection || !service) throw new Error("Workspace, Site Connection, or active service not found");
    if (connection.workspaceId !== workspace.id) throw new Error("Service entitlement Site Connection does not belong to the selected Customer Workspace");
    if (!connection.validationEvidenceId || !["ready", "connected"].includes(connection.status)) throw new Error("Service entitlement requires a canonically validated Site Connection");
    requireCanonicalCapability(connection.id, input.capabilityId);
    const attached = workspaceProvisioningStore.getAttachments().some((row) => row.workspaceId === workspace.id && row.type === "service" && row.resourceId === service.id);
    if (!attached) throw new Error("Service must be explicitly attached to the Customer Workspace before it can entitle website capabilities");
    const existing = this.getServiceEntitlements().find((row) => row.workspaceId === workspace.id && row.siteConnectionId === connection.id && row.serviceId === service.id && row.capabilityId === input.capabilityId && row.status !== "revoked");
    if (existing) return existing;
    const now = timestamp();
    if (input.endsAt && new Date(input.endsAt).getTime() <= new Date(now).getTime()) throw new Error("Service entitlement expiry must be in the future");
    const row: ServiceCapabilityEntitlementRecord = {
      id: uid("service_entitlement"),
      workspaceId: workspace.id,
      siteConnectionId: connection.id,
      serviceId: service.id,
      capabilityId: input.capabilityId,
      status: "active",
      startsAt: now,
      endsAt: input.endsAt,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    write(KEYS.entitlements, [row, ...this.getServiceEntitlements()]);
    platformStore.addAudit("Admin", "Customer website service entitlement granted", input.capabilityId, "NEXT F Digital", `Workspace ${workspace.id}; Site Connection ${connection.id}; service ${service.id}. Entitlement restricts access further and never overrides Contract, Manifest, role, field, privacy, or security policy.`, "info");
    return row;
  },

  setEntitlementStatus(id: string, nextStatus: Exclude<ServiceEntitlementStatus, "expired">, actorId: string) {
    const current = this.getServiceEntitlements().find((row) => row.id === id);
    if (!current) throw new Error("Service capability entitlement not found");
    if (current.status === "revoked") throw new Error("Revoked service capability entitlement is immutable");
    const allowed: Record<ServiceEntitlementStatus, ServiceEntitlementStatus[]> = {
      active: ["suspended", "revoked"],
      suspended: ["active", "revoked"],
      expired: ["revoked"],
      revoked: [],
    };
    if (!allowed[current.status].includes(nextStatus)) throw new Error(`Invalid service entitlement transition: ${current.status} → ${nextStatus}`);
    const now = timestamp();
    const rows = this.getServiceEntitlements().map((row) => row.id === id ? { ...row, status: nextStatus, revokedAt: nextStatus === "revoked" ? now : row.revokedAt, updatedAt: now } : row);
    write(KEYS.entitlements, rows);
    platformStore.addAudit("Admin", `Customer website service entitlement ${nextStatus}`, current.capabilityId, "NEXT F Digital", `Entitlement ${id}; actor ${actorId}.`, nextStatus === "active" ? "info" : "warning");
    return rows.find((row) => row.id === id);
  },

  setCapabilityPolicy(input: { siteConnectionId: string; capabilityId: string; exposureMode: CustomerExposureMode; publishingMode: CustomerPublishingMode; createdBy: string }) {
    const { capability } = requireCanonicalCapability(input.siteConnectionId, input.capabilityId);
    if (exposureRank[input.exposureMode] > exposureRank[capability.maximumExposure]) throw new Error("Customer exposure policy cannot exceed the canonical Contract maximum");
    if (capability.maximumPublishing === "not_applicable" && input.publishingMode !== "not_applicable") throw new Error("Publishing is not applicable for this canonical capability");
    if (capability.maximumPublishing !== "not_applicable" && input.publishingMode === "not_applicable") throw new Error("Business policy cannot redefine a canonical publishing capability as not applicable");
    if (capability.maximumPublishing !== "not_applicable" && input.publishingMode !== "not_applicable" && publishingRank[input.publishingMode] > publishingRank[capability.maximumPublishing]) throw new Error("Customer publishing policy cannot exceed the canonical Contract maximum");
    const existing = this.getCapabilityPolicies().find((row) => row.siteConnectionId === input.siteConnectionId && row.capabilityId === input.capabilityId);
    const now = timestamp();
    const row: CustomerCapabilityPolicyRecord = existing
      ? { ...existing, exposureMode: input.exposureMode, publishingMode: input.publishingMode, updatedAt: now }
      : { id: uid("customer_capability_policy"), ...input, createdAt: now, updatedAt: now };
    const rows = existing ? this.getCapabilityPolicies().map((item) => item.id === existing.id ? row : item) : [row, ...this.getCapabilityPolicies()];
    write(KEYS.capabilityPolicies, rows);
    platformStore.addAudit("Admin", "Customer Capability Access Policy updated", input.capabilityId, "NEXT F Digital", `Exposure ${input.exposureMode}; publishing ${input.publishingMode}. Missing policy remains deny-by-default for every other capability.`, "info");
    return row;
  },

  setFieldPolicy(input: { siteConnectionId: string; capabilityId: string; fieldPath: string; exposureMode: CustomerExposureMode; createdBy: string }) {
    const { capability } = requireCanonicalCapability(input.siteConnectionId, input.capabilityId);
    const field = capability.fields.find((row) => row.fieldPath === input.fieldPath);
    if (!field) throw new Error("Field is not present in the trusted canonical customer access projection");
    const parent = this.getCapabilityPolicies().find((row) => row.siteConnectionId === input.siteConnectionId && row.capabilityId === input.capabilityId);
    if (!parent) throw new Error("Set the capability-level Customer Capability Access Policy before setting field policy");
    const maximum = minimumExposure([capability.maximumExposure, field.maximumExposure, parent.exposureMode]);
    if (exposureRank[input.exposureMode] > exposureRank[maximum]) throw new Error("Field policy cannot exceed the canonical field maximum or parent customer capability policy");
    const existing = this.getFieldPolicies().find((row) => row.siteConnectionId === input.siteConnectionId && row.capabilityId === input.capabilityId && row.fieldPath === input.fieldPath);
    const now = timestamp();
    const row: CustomerFieldPolicyRecord = existing
      ? { ...existing, exposureMode: input.exposureMode, updatedAt: now }
      : { id: uid("customer_field_policy"), ...input, createdAt: now, updatedAt: now };
    const rows = existing ? this.getFieldPolicies().map((item) => item.id === existing.id ? row : item) : [row, ...this.getFieldPolicies()];
    write(KEYS.fieldPolicies, rows);
    platformStore.addAudit("Admin", "Customer field exposure policy updated", `${input.capabilityId}:${input.fieldPath}`, "NEXT F Digital", `Field maximum exposure set to ${input.exposureMode}; the most restrictive effective result still wins.`, "info");
    return row;
  },

  grantRolePermission(input: { siteConnectionId: string; customerRoleId: string; permissionId: string; createdBy: string }) {
    const projection = requireProjection(input.siteConnectionId);
    const role = customerAccessStore.getRoles().find((row) => row.id === input.customerRoleId && row.status === "active");
    const validation = contractRegistryStore.getValidationEvidence().find((row) => row.id === projection.validationEvidenceId);
    if (!role || !validation) throw new Error("Active customer role or canonical validation evidence not found");
    if (!validation.resolution.permissionIds.includes(input.permissionId)) throw new Error("Role permission grant must reference an exact canonical Permission ID resolved for this Site Connection");
    const referenced = projection.capabilities.some((capability) => capabilityPermissions(capability).includes(input.permissionId));
    if (!referenced) throw new Error("Permission is not used by the canonical customer access projection for this Site Connection");
    const existing = this.getRolePermissionGrants().find((row) => row.siteConnectionId === input.siteConnectionId && row.customerRoleId === role.id && row.permissionId === input.permissionId && row.status === "active");
    if (existing) return existing;
    const now = timestamp();
    const row: CustomerRolePermissionGrantRecord = { id: uid("customer_role_permission"), ...input, status: "active", createdAt: now, updatedAt: now };
    write(KEYS.rolePermissionGrants, [row, ...this.getRolePermissionGrants()]);
    platformStore.addAudit("Admin", "Canonical customer role permission granted", input.permissionId, "NEXT F Digital", `Customer role ${role.name}; Site Connection ${input.siteConnectionId}. This grant is still constrained by Contract, Manifest, entitlement, policy, field, state, and security rules.`, "info");
    return row;
  },

  revokeRolePermission(id: string, actorId: string) {
    const current = this.getRolePermissionGrants().find((row) => row.id === id);
    if (!current || current.status === "revoked") return current;
    const now = timestamp();
    const rows = this.getRolePermissionGrants().map((row) => row.id === id ? { ...row, status: "revoked" as const, revokedAt: now, updatedAt: now } : row);
    write(KEYS.rolePermissionGrants, rows);
    platformStore.addAudit("Admin", "Canonical customer role permission revoked", current.permissionId, "NEXT F Digital", `Grant ${id}; actor ${actorId}.`, "warning");
    return rows.find((row) => row.id === id);
  },

  addSecurityRestriction(input: { siteConnectionId: string; capabilityId: string; fieldPath?: string; mode: SecurityRestrictionMode; reason: string; createdBy: string }) {
    const { capability } = requireCanonicalCapability(input.siteConnectionId, input.capabilityId);
    if (input.fieldPath && !capability.fields.some((row) => row.fieldPath === input.fieldPath)) throw new Error("Security restriction field is not present in the trusted canonical projection");
    if (!input.reason.trim()) throw new Error("Privacy/security restriction requires an explicit reason");
    const now = timestamp();
    const row: CustomerSecurityRestrictionRecord = { id: uid("customer_security_restriction"), ...input, reason: input.reason.trim(), active: true, createdAt: now, updatedAt: now };
    write(KEYS.securityRestrictions, [row, ...this.getSecurityRestrictions()]);
    platformStore.addAudit("Admin", "Customer privacy/security restriction added", input.capabilityId, "NEXT F Digital", `${input.fieldPath ? `Field ${input.fieldPath}; ` : ""}${input.mode}: ${row.reason}`, "warning");
    return row;
  },

  disableSecurityRestriction(id: string, actorId: string) {
    const current = this.getSecurityRestrictions().find((row) => row.id === id);
    if (!current || !current.active) return current;
    const rows = this.getSecurityRestrictions().map((row) => row.id === id ? { ...row, active: false, updatedAt: timestamp() } : row);
    write(KEYS.securityRestrictions, rows);
    platformStore.addAudit("Admin", "Customer privacy/security restriction disabled", current.capabilityId, "NEXT F Digital", `Restriction ${id}; actor ${actorId}.`, "warning");
    return rows.find((row) => row.id === id);
  },

  evaluate(input: EvaluateCustomerCapabilityInput): EffectiveCustomerCapabilityDecision {
    const reasons: string[] = [];
    const deny = (message: string, detail?: Partial<EffectiveCustomerCapabilityDecision>): EffectiveCustomerCapabilityDecision => ({
      allowed: false,
      executionPath: "deny",
      exposureMode: detail?.exposureMode ?? "hidden",
      publishingMode: detail?.publishingMode ?? "staff_only",
      reasons: [...reasons, message],
      workspaceId: detail?.workspaceId,
      customerRoleId: detail?.customerRoleId,
      serviceEntitlementId: detail?.serviceEntitlementId,
      policyId: detail?.policyId,
    });

    const at = new Date(input.at ?? timestamp());
    const connection = websitePlatformStore.getSiteConnections().find((row) => row.id === input.siteConnectionId);
    if (!connection || connection.status !== "connected" || connection.manifestStatus !== "valid" || !connection.validationEvidenceId) return deny("Managed Site Connection is not connected with valid canonical Contract evidence.");
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === connection.workspaceId);
    if (!workspace || !["active", "read_only"].includes(workspace.status)) return deny("Customer Workspace is not available for customer access.");
    const membership = customerAccessStore.getMemberships().find((row) => row.id === input.membershipId && row.workspaceId === workspace.id);
    if (!membership || membership.status !== "active" || membership.invitationState !== "accepted") return deny("Active accepted Customer Workspace membership is required.", { workspaceId: workspace.id });
    const role = customerAccessStore.getRoles().find((row) => row.id === membership.customerRoleId && row.status === "active");
    if (!role) return deny("Customer role is unavailable or retired.", { workspaceId: workspace.id });
    const projection = findProjection(connection.id);
    if (!projection || projection.validationEvidenceId !== connection.validationEvidenceId) return deny("Canonical Customer Capability Access projection is missing or stale for the active Site validation evidence.", { workspaceId: workspace.id, customerRoleId: role.id });
    const validation = contractRegistryStore.getValidationEvidence().find((row) => row.id === projection.validationEvidenceId);
    if (!validation || validation.compatibilityStatus !== "compatible" || !validation.schemaValid || !validation.resolution.capabilityIds.includes(input.capabilityId)) return deny("Capability is not supported by the validated Site Manifest and Contract resolution.", { workspaceId: workspace.id, customerRoleId: role.id });
    const capability = projection.capabilities.find((row) => row.capabilityId === input.capabilityId);
    if (!capability) return deny("Canonical customer access metadata for this capability is unresolved.", { workspaceId: workspace.id, customerRoleId: role.id });

    const entitlement = this.getServiceEntitlements().find((row) => row.workspaceId === workspace.id && row.siteConnectionId === connection.id && row.capabilityId === input.capabilityId && isEntitlementActive(row, at));
    if (!entitlement) return deny("No active service entitlement permits this capability for the Customer Workspace.", { workspaceId: workspace.id, customerRoleId: role.id });
    const policy = this.getCapabilityPolicies().find((row) => row.siteConnectionId === connection.id && row.capabilityId === input.capabilityId);
    if (!policy) return deny("Customer Capability Access Policy is missing; customer access fails closed.", { workspaceId: workspace.id, customerRoleId: role.id, serviceEntitlementId: entitlement.id });

    const fieldProjection = input.fieldPath ? capability.fields.find((row) => row.fieldPath === input.fieldPath) : undefined;
    if (input.fieldPath && !fieldProjection) return deny("Requested field is not present in the canonical customer access projection.", { workspaceId: workspace.id, customerRoleId: role.id, serviceEntitlementId: entitlement.id, policyId: policy.id });
    const fieldPolicy = input.fieldPath ? this.getFieldPolicies().find((row) => row.siteConnectionId === connection.id && row.capabilityId === input.capabilityId && row.fieldPath === input.fieldPath) : undefined;
    const restrictions = this.getSecurityRestrictions().filter((row) => row.active && row.siteConnectionId === connection.id && row.capabilityId === input.capabilityId && (!row.fieldPath || row.fieldPath === input.fieldPath));

    const exposureInputs: CustomerExposureMode[] = [capability.maximumExposure, policy.exposureMode];
    if (fieldProjection) exposureInputs.push(fieldProjection.maximumExposure);
    if (fieldPolicy) exposureInputs.push(fieldPolicy.exposureMode);
    restrictions.forEach((row) => exposureInputs.push(row.mode));
    const exposureMode = minimumExposure(exposureInputs);
    const publishingMode = minimumPublishing([capability.maximumPublishing, policy.publishingMode]);
    const baseDetail = { workspaceId: workspace.id, customerRoleId: role.id, serviceEntitlementId: entitlement.id, policyId: policy.id, exposureMode, publishingMode };

    if (workspace.status === "read_only" && input.operation !== "read") return deny("Customer Workspace is currently read-only.", baseDetail);
    if (input.operation === "read" && !input.resourceState.readAllowed) return deny(input.resourceState.reason || "Resource state does not permit customer read access.", baseDetail);
    if (input.operation === "edit" && !input.resourceState.editAllowed) return deny(input.resourceState.reason || "Resource state does not permit customer edits.", baseDetail);
    if (input.operation === "publish" && !input.resourceState.publishAllowed) return deny(input.resourceState.reason || "Resource state does not permit customer publishing.", baseDetail);
    if (exposureMode === "hidden") return deny("The most restrictive exposure rule hides this capability or field from the customer.", baseDetail);
    if (input.operation === "publish" && exposureMode === "read_only") return deny("The most restrictive exposure rule permits read-only access and therefore blocks customer publishing.", baseDetail);

    const rolePermissions = new Set<string>(this.getRolePermissionGrants().filter((row) => row.siteConnectionId === connection.id && row.customerRoleId === role.id && row.status === "active").map((row) => row.permissionId));
    const required = input.operation === "read"
      ? (fieldProjection?.readPermissions ?? capability.readPermissions)
      : input.operation === "edit"
        ? (fieldProjection?.editPermissions ?? capability.editPermissions)
        : capability.publishPermissions;
    if (!permissionRequirementSatisfied(required, rolePermissions)) return deny("Customer role lacks the exact canonical permission requirement for this operation.", baseDetail);

    if (input.operation === "read") {
      return { ...baseDetail, allowed: true, executionPath: "read", reasons: ["All customer authorization layers permit read access."] };
    }
    if (input.operation === "edit") {
      if (exposureMode === "read_only") return deny("Customer policy permits read-only access to this capability or field.", baseDetail);
      if (exposureMode === "approval_required") return { ...baseDetail, allowed: true, executionPath: "change_request", reasons: ["Edit is allowed only through the approval/change-request workflow."] };
      return { ...baseDetail, allowed: true, executionPath: "direct_mutation", reasons: ["All layers permit direct customer edit; the future API must still validate the same decision server-side."] };
    }

    if (publishingMode === "not_applicable") return deny("Publishing is not applicable to this canonical capability.", baseDetail);
    if (publishingMode === "staff_only") return deny("Publishing remains NEXT F staff-only for this capability.", baseDetail);
    if (publishingMode === "approval_required") return { ...baseDetail, allowed: true, executionPath: "publish_request", reasons: ["Customer may request publication; direct publish remains blocked."] };
    return { ...baseDetail, allowed: true, executionPath: "direct_publish", reasons: ["All layers permit direct customer publishing; the future publishing API must re-evaluate authorization server-side."] };
  },
};

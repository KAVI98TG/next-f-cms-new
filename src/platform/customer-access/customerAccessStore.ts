import { platformStore } from "../services/platformStore";
import { identityStore } from "../identity/identityStore";
import { websitePlatformStore } from "../../next-f/website-platform/websitePlatformStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type CustomerMembershipStatus = "invited" | "active" | "suspended" | "revoked";
export type CustomerInvitationState = "not_sent" | "pending" | "accepted" | "expired" | "revoked";
export type CustomerRoleStatus = "active" | "retired";

export type CustomerRoleRecord = {
  id: string;
  name: string;
  description: string;
  status: CustomerRoleStatus;
  system: boolean;
  contractPermissionBindings: string[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerMembershipRecord = {
  id: string;
  accountId: string;
  workspaceId: string;
  customerRoleId: string;
  status: CustomerMembershipStatus;
  invitationState: CustomerInvitationState;
  invitedAt?: string;
  invitationExpiresAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const KEYS = {
  roles: "nextf.v0.13.customer-access.roles",
  memberships: "nextf.v0.13.customer-access.memberships",
};

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

const roleSeed: CustomerRoleRecord[] = [
  { id: "customer_role_owner", name: "Owner", description: "Business-level customer owner role. Website permissions are resolved later from Contracts and entitlements.", status: "active", system: true, contractPermissionBindings: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: "customer_role_admin", name: "Customer Admin", description: "Customer workspace administrator role. Does not imply NEXT F staff or Platform permissions.", status: "active", system: true, contractPermissionBindings: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: "customer_role_content", name: "Content Editor", description: "Business role placeholder for eligible content workflows. Exact website permissions remain contract-driven.", status: "active", system: true, contractPermissionBindings: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: "customer_role_marketing", name: "Marketing User", description: "Business role placeholder for eligible marketing workflows. Exact website permissions remain contract-driven.", status: "active", system: true, contractPermissionBindings: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: "customer_role_billing", name: "Billing Contact", description: "Business role for customer-visible billing context; no Platform finance authority is inherited.", status: "active", system: true, contractPermissionBindings: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: "customer_role_contributor", name: "Contributor", description: "Limited customer business role. Website operations remain unresolved until the contract authorization layer exists.", status: "active", system: true, contractPermissionBindings: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: "customer_role_readonly", name: "Read Only", description: "Customer workspace role intended for view-only experiences after authorization is implemented.", status: "active", system: true, contractPermissionBindings: [], createdAt: ago(200), updatedAt: ago(1) },
];

const membershipSeed: CustomerMembershipRecord[] = [
  {
    id: "membership_1",
    accountId: "acct_customer_1",
    workspaceId: "cws_1",
    customerRoleId: "customer_role_owner",
    status: "active",
    invitationState: "accepted",
    invitedAt: ago(185),
    acceptedAt: ago(184),
    createdBy: "usr_admin",
    createdAt: ago(185),
    updatedAt: ago(5),
  },
];

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:customer-access", { detail: key }));
  return result;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const customerAccessStore = {
  getRoles: () => read(KEYS.roles, roleSeed),
  getMemberships() {
    const rows = read<CustomerMembershipRecord[]>(KEYS.memberships, membershipSeed);
    const now = Date.now();
    const normalized = rows.map((row) => {
      if (row.status === "invited" && row.invitationState === "pending" && row.invitationExpiresAt && new Date(row.invitationExpiresAt).getTime() <= now) {
        return { ...row, invitationState: "expired" as const, updatedAt: new Date().toISOString() };
      }
      return row;
    });
    if (typeof window !== "undefined" && JSON.stringify(rows) !== JSON.stringify(normalized)) write(KEYS.memberships, normalized);
    return normalized;
  },

  inviteMembership(input: { accountId: string; workspaceId: string; customerRoleId: string; createdBy: string }) {
    const account = identityStore.getAccounts().find((row) => row.id === input.accountId);
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === input.workspaceId);
    const role = this.getRoles().find((row) => row.id === input.customerRoleId && row.status === "active");
    if (!account || !workspace || !role) throw new Error("Account, workspace, or customer role not found");
    if (account.state !== "active") throw new Error("Account is not active");
    if (account.verificationState !== "verified") throw new Error("Account must be verified before a real customer membership invitation is issued");
    if (workspace.status !== "active") throw new Error("Workspace must be active before membership invitations are issued");
    const existing = this.getMemberships().find((row) => row.accountId === input.accountId && row.workspaceId === input.workspaceId && row.status !== "revoked");
    if (existing) return existing;
    const timestamp = new Date().toISOString();
    const membership: CustomerMembershipRecord = {
      id: uid("membership"),
      ...input,
      status: "invited",
      invitationState: "pending",
      invitedAt: timestamp,
      invitationExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    write(KEYS.memberships, [membership, ...this.getMemberships()]);
    platformStore.addAudit("Admin", "Customer membership invited", account.primaryEmail, "Platform", `Workspace ${workspace.id}; customer role ${role.name}. Invitation does not grant staff access or unresolved website permissions.`, "info");
    return membership;
  },


  resendInvitation(id: string, actorId: string) {
    const membership = this.getMemberships().find((row) => row.id === id);
    if (!membership || membership.status !== "invited" || !["pending", "expired"].includes(membership.invitationState)) throw new Error("Only pending or expired membership invitations can be resent");
    const account = identityStore.getAccounts().find((row) => row.id === membership.accountId);
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === membership.workspaceId);
    if (!account || account.state !== "active" || account.verificationState !== "verified") throw new Error("Account is no longer eligible for invitation");
    if (!workspace || workspace.status !== "active") throw new Error("Workspace must be active before an invitation is resent");
    const timestamp = new Date().toISOString();
    const rows = this.getMemberships().map((row) => row.id === id ? { ...row, invitationState: "pending" as const, invitedAt: timestamp, invitationExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), updatedAt: timestamp } : row);
    write(KEYS.memberships, rows);
    platformStore.addAudit("Admin", "Customer membership invitation resent", account.primaryEmail, "Platform", `Workspace ${workspace.id}; actor ${actorId}. Invitation still grants no access until accepted.`, "info");
    return rows.find((row) => row.id === id);
  },

  expireInvitation(id: string, actorId: string) {
    const membership = this.getMemberships().find((row) => row.id === id);
    if (!membership || membership.status !== "invited" || membership.invitationState !== "pending") throw new Error("Only pending invitations can be expired");
    const rows = this.getMemberships().map((row) => row.id === id ? { ...row, invitationState: "expired" as const, invitationExpiresAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : row);
    write(KEYS.memberships, rows);
    platformStore.addAudit("Admin", "Customer membership invitation expired", id, "Platform", `Invitation expired by ${actorId}; no customer access was activated.`, "warning");
    return rows.find((row) => row.id === id);
  },

  acceptInvitation(id: string, accountId: string) {
    const membership = this.getMemberships().find((row) => row.id === id);
    if (!membership || membership.accountId !== accountId) throw new Error("Membership invitation does not belong to this NEXT F Account");
    if (membership.status !== "invited" || membership.invitationState !== "pending") throw new Error("Membership invitation is not pending acceptance");
    if (membership.invitationExpiresAt && new Date(membership.invitationExpiresAt).getTime() <= Date.now()) throw new Error("Membership invitation has expired");
    const account = identityStore.getAccounts().find((row) => row.id === accountId);
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === membership.workspaceId);
    if (!account || account.state !== "active" || account.verificationState !== "verified") throw new Error("Account is not eligible to accept this membership");
    if (!workspace || workspace.status !== "active") throw new Error("Customer Workspace is not active");
    const timestamp = new Date().toISOString();
    const rows = this.getMemberships().map((row) => row.id === id ? { ...row, status: "active" as const, invitationState: "accepted" as const, acceptedAt: timestamp, updatedAt: timestamp } : row);
    write(KEYS.memberships, rows);
    platformStore.addAudit(account.displayName, "Customer membership invitation accepted", id, "Platform", `Workspace ${membership.workspaceId}; customer role ${membership.customerRoleId}.`, "info");
    return rows.find((row) => row.id === id);
  },

  suspendMembership(id: string) {
    const rows = this.getMemberships().map((row) => row.id === id && row.status !== "revoked" ? { ...row, status: "suspended" as const, updatedAt: new Date().toISOString() } : row);
    write(KEYS.memberships, rows);
    const updated = rows.find((row) => row.id === id);
    if (updated) platformStore.addAudit("Admin", "Customer membership suspended", updated.id, "Platform", `Workspace ${updated.workspaceId}; account ${updated.accountId}.`, "warning");
    return updated;
  },

  revokeMembership(id: string) {
    const timestamp = new Date().toISOString();
    const rows = this.getMemberships().map((row) => row.id === id ? { ...row, status: "revoked" as const, invitationState: "revoked" as const, revokedAt: timestamp, updatedAt: timestamp } : row);
    write(KEYS.memberships, rows);
    const updated = rows.find((row) => row.id === id);
    if (updated) platformStore.addAudit("Admin", "Customer membership revoked", updated.id, "Platform", `Workspace ${updated.workspaceId}; account ${updated.accountId}.`, "warning");
    return updated;
  },

  updateRole(id: string, patch: Partial<Pick<CustomerRoleRecord, "description" | "status">>) {
    const rows = this.getRoles().map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row);
    write(KEYS.roles, rows);
    return rows.find((row) => row.id === id);
  },
};

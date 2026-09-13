import { identityStore } from "../../platform/identity/identityStore";
import { platformOperationsStore } from "../../platform/services/platformOperationsStore";
import { platformStore } from "../../platform/services/platformStore";
import { portalRepository } from "../clients/portalRepository";
import { digitalStore } from "../data/digitalStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export const WEBSITE_CONTRACT_VERSION = "1.0.0";
export const SITE_MANIFEST_FILENAME = "nextf.site.json";

export type CustomerWorkspaceStatus = "requested" | "provisioning" | "active" | "read_only" | "suspended" | "closed";
export type SiteConnectionStatus = "registered" | "identity_pending" | "manifest_received" | "validating" | "incompatible" | "ready" | "connected" | "suspended" | "revoked";
export type ManifestValidationStatus = "unverified" | "received" | "validating" | "valid" | "invalid" | "incompatible";
export type DemoAccessStatus = "submitted" | "under_review" | "approved" | "rejected" | "active" | "expired" | "revoked" | "extended";
export type CustomerOrganizationLinkStatus = "active" | "disconnected";
export type LegacyPortalMigrationState = "blocked_identity" | "blocked_organization" | "blocked_workspace" | "ready_for_review";

export type CustomerOrganizationLinkRecord = {
  id: string;
  clientId: string;
  organizationId: string;
  status: CustomerOrganizationLinkStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerWorkspaceRecord = {
  id: string;
  clientId: string;
  organizationId: string;
  name: string;
  key: string;
  status: CustomerWorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  provisionedAt?: string;
};

export type SiteConnectionRecord = {
  id: string;
  siteId: string;
  workspaceId: string;
  contractVersion: string;
  manifestFilename: string;
  manifestStatus: ManifestValidationStatus;
  status: SiteConnectionStatus;
  lastValidatedAt?: string;
  registrySnapshotId?: string;
  validationEvidenceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoAccessRequestRecord = {
  id: string;
  name: string;
  email: string;
  company: string;
  status: DemoAccessStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  expiresAt?: string;
  demoEnvironmentId?: string;
  reviewNote: string;
  updatedAt?: string;
};

export type LegacyPortalMigrationAssessment = {
  portalAccessId: string;
  clientId: string;
  email: string;
  legacyStatus: "invited" | "active" | "suspended";
  accountId?: string;
  organizationId?: string;
  workspaceId?: string;
  state: LegacyPortalMigrationState;
  reason: string;
};

const KEYS = {
  workspaces: "nextf.v0.12.digital.customer-workspaces",
  siteConnections: "nextf.v0.12.digital.site-connections",
  demoRequests: "nextf.v0.12.digital.demo-access-requests",
  organizationLinks: "nextf.v0.13.digital.customer-organization-links",
};

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();
const ahead = (days: number) => new Date(now + days * 86_400_000).toISOString();

const organizationLinkSeed: CustomerOrganizationLinkRecord[] = [
  { id: "customer_org_link_1", clientId: "client_1", organizationId: "org_customer_lanka", status: "active", createdAt: ago(190), updatedAt: ago(5) },
];

const workspaceSeed: CustomerWorkspaceRecord[] = [
  {
    id: "cws_1",
    clientId: "client_1",
    organizationId: "org_customer_lanka",
    name: "Lanka Craft House Workspace",
    key: "lanka-craft-house",
    status: "active",
    createdAt: ago(180),
    updatedAt: ago(2),
    provisionedAt: ago(178),
  },
];

const connectionSeed: SiteConnectionRecord[] = [
  {
    id: "site_connection_1",
    siteId: "site_1",
    workspaceId: "cws_1",
    contractVersion: WEBSITE_CONTRACT_VERSION,
    manifestFilename: SITE_MANIFEST_FILENAME,
    manifestStatus: "unverified",
    status: "registered",
    createdAt: ago(7),
    updatedAt: ago(2),
  },
];

const demoSeed: DemoAccessRequestRecord[] = [
  {
    id: "demo_1",
    name: "Kasun Perera",
    email: "kasun@example.com",
    company: "Northshore Studio",
    status: "under_review",
    requestedAt: ago(2),
    reviewNote: "Requested from the NEXT F Digital website demo journey.",
  },
  {
    id: "demo_2",
    name: "Ayesha Silva",
    email: "ayesha@example.com",
    company: "Aster Retail",
    status: "active",
    requestedAt: ago(14),
    reviewedAt: ago(12),
    expiresAt: ahead(2),
    reviewNote: "Approved for isolated demonstration access only.",
  },
];

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:website-platform", { detail: key }));
  return result;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function patchDemoRequestRecord(id: string, patch: Partial<DemoAccessRequestRecord>) {
  const timestamp = new Date().toISOString();
  const rows = read(KEYS.demoRequests, demoSeed).map((row) => row.id === id ? { ...row, ...patch, updatedAt: timestamp } : row);
  write(KEYS.demoRequests, rows);
  return rows.find((row) => row.id === id);
}

export const websitePlatformStore = {
  getOrganizationLinks() {
    const rows = read(KEYS.organizationLinks, organizationLinkSeed);
    const organizations = new Set(platformOperationsStore.getOrganizations().map((row) => row.id));
    const clients = new Set(digitalStore.getClients().map((row) => row.id));
    const normalized = rows.filter((row) => organizations.has(row.organizationId) && clients.has(row.clientId));
    if (typeof window !== "undefined" && JSON.stringify(rows) !== JSON.stringify(normalized)) write(KEYS.organizationLinks, normalized);
    return normalized;
  },
  getWorkspaces() {
    const rows = read<Array<CustomerWorkspaceRecord | Omit<CustomerWorkspaceRecord, "organizationId">>>(KEYS.workspaces, workspaceSeed);
    const links = this.getOrganizationLinks();
    const normalized: CustomerWorkspaceRecord[] = rows.map((row) => {
      if ("organizationId" in row && row.organizationId) return row as CustomerWorkspaceRecord;
      const matches = links.filter((link) => link.clientId === row.clientId && link.status === "active");
      return { ...row, organizationId: matches.length === 1 ? matches[0].organizationId : "" } as CustomerWorkspaceRecord;
    });
    if (typeof window !== "undefined" && JSON.stringify(rows) !== JSON.stringify(normalized)) write(KEYS.workspaces, normalized);
    return normalized;
  },
  getSiteConnections() {
    const rows = read<Array<SiteConnectionRecord | (Omit<SiteConnectionRecord, "status"> & { status: "pending" })>>(KEYS.siteConnections, connectionSeed);
    const normalized: SiteConnectionRecord[] = rows.map((row) => row.status === "pending" ? { ...row, status: "registered" as const } : row as SiteConnectionRecord);
    if (typeof window !== "undefined" && JSON.stringify(rows) !== JSON.stringify(normalized)) write(KEYS.siteConnections, normalized);
    return normalized;
  },
  getDemoRequests: () => read(KEYS.demoRequests, demoSeed),

  linkCustomerOrganization(clientId: string, organizationId: string) {
    const client = digitalStore.getClients().find((item) => item.id === clientId);
    const organization = platformOperationsStore.getOrganizations().find((item) => item.id === organizationId);
    if (!client || !organization) throw new Error("Digital client or Platform organization not found");
    if (organization.kind !== "customer") throw new Error("Only customer organizations can own Customer Workspaces");
    const links = this.getOrganizationLinks();
    const exact = links.find((link) => link.clientId === clientId && link.organizationId === organizationId && link.status === "active");
    if (exact) return exact;
    const conflictingClient = links.find((link) => link.clientId === clientId && link.status === "active");
    if (conflictingClient) throw new Error("Digital client already has an active customer organization link");
    const conflictingOrganization = links.find((link) => link.organizationId === organizationId && link.status === "active");
    if (conflictingOrganization) throw new Error("Customer organization is already linked to another Digital client");
    const timestamp = new Date().toISOString();
    const link: CustomerOrganizationLinkRecord = { id: uid("customer_org_link"), clientId, organizationId, status: "active", createdAt: timestamp, updatedAt: timestamp };
    write(KEYS.organizationLinks, [link, ...links]);
    platformStore.addAudit("Admin", "Digital client linked to customer organization", client.company || client.name, "NEXT F Digital", `Customer organization ${organization.name} (${organization.id}) linked explicitly.`, "info");
    return link;
  },

  requestWorkspace(clientId: string, organizationId: string, name?: string) {
    const client = digitalStore.getClients().find((item) => item.id === clientId);
    const organization = platformOperationsStore.getOrganizations().find((item) => item.id === organizationId);
    if (!client || !organization) throw new Error("Client or customer organization not found");
    const link = this.getOrganizationLinks().find((item) => item.clientId === clientId && item.organizationId === organizationId && item.status === "active");
    if (!link) throw new Error("Digital client must be explicitly linked to the selected customer organization first");
    const timestamp = new Date().toISOString();
    const workspaceName = name?.trim() || `${client.company || client.name} Workspace`;
    const baseKey = slug(workspaceName) || slug(client.company || client.name) || "customer-workspace";
    const siblingKeys = new Set(this.getWorkspaces().filter((row) => row.organizationId === organizationId && row.status !== "closed").map((row) => row.key));
    let key = baseKey;
    let suffix = 2;
    while (siblingKeys.has(key)) key = `${baseKey}-${suffix++}`;
    const row: CustomerWorkspaceRecord = {
      id: uid("cws"),
      clientId,
      organizationId,
      name: workspaceName,
      key,
      status: "requested",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    write(KEYS.workspaces, [row, ...this.getWorkspaces()]);
    platformStore.addAudit("Admin", "Customer workspace requested", row.name, "NEXT F Digital", `Organization ${organization.name}; provisioning requested; no customer access was granted.`, "info");
    return row;
  },

  updateWorkspace(id: string, patch: Partial<Pick<CustomerWorkspaceRecord, "name">>) {
    const rows = this.getWorkspaces().map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row);
    write(KEYS.workspaces, rows);
    const updated = rows.find((row) => row.id === id);
    if (updated) platformStore.addAudit("Admin", "Customer workspace metadata updated", updated.name, "NEXT F Digital", "Lifecycle status is controlled by explicit transition methods.", "info");
    return updated;
  },

  transitionWorkspace(id: string, nextStatus: CustomerWorkspaceStatus, detail: string, provisionedAt?: string) {
    const current = this.getWorkspaces().find((row) => row.id === id);
    if (!current) throw new Error("Customer Workspace not found");
    const allowed: Record<CustomerWorkspaceStatus, CustomerWorkspaceStatus[]> = {
      requested: ["provisioning", "closed"],
      provisioning: ["active", "closed"],
      active: ["read_only", "suspended", "closed"],
      read_only: ["active", "suspended", "closed"],
      suspended: ["active", "read_only", "closed"],
      closed: [],
    };
    if (!allowed[current.status].includes(nextStatus)) throw new Error(`Invalid Customer Workspace lifecycle transition: ${current.status} → ${nextStatus}`);
    const timestamp = new Date().toISOString();
    const rows = this.getWorkspaces().map((row) => row.id === id ? { ...row, status: nextStatus, provisionedAt: provisionedAt ?? row.provisionedAt, updatedAt: timestamp } : row);
    write(KEYS.workspaces, rows);
    const updated = rows.find((row) => row.id === id);
    if (updated) platformStore.addAudit("Admin", "Customer workspace lifecycle transitioned", updated.name, "NEXT F Digital", `${current.status} → ${nextStatus}. ${detail}`, nextStatus === "suspended" || nextStatus === "closed" ? "warning" : "info");
    return updated;
  },

  connectSite(workspaceId: string, siteId: string) {
    const workspace = this.getWorkspaces().find((item) => item.id === workspaceId);
    const site = digitalStore.getSites().find((item) => item.id === siteId);
    if (!workspace || !site) throw new Error("Workspace or site not found");
    if (!workspace.organizationId) throw new Error("Workspace has no resolved customer organization");
    if (workspace.clientId !== site.clientId) throw new Error("Site and workspace must belong to the same Digital client");
    const duplicate = this.getSiteConnections().find((item) => item.siteId === siteId && item.status !== "revoked");
    if (duplicate) return duplicate;
    const timestamp = new Date().toISOString();
    const row: SiteConnectionRecord = {
      id: uid("site_connection"),
      siteId,
      workspaceId,
      contractVersion: WEBSITE_CONTRACT_VERSION,
      manifestFilename: SITE_MANIFEST_FILENAME,
      manifestStatus: "unverified",
      status: "registered",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    write(KEYS.siteConnections, [row, ...this.getSiteConnections()]);
    platformStore.addAudit("Admin", "Site connection requested", site.domain, "NEXT F Digital", `Pinned to contract ${WEBSITE_CONTRACT_VERSION}; manifest validation still required.`, "info");
    return row;
  },

  updateSiteConnection(id: string, patch: Partial<Pick<SiteConnectionRecord, "registrySnapshotId" | "validationEvidenceId" | "lastValidatedAt">>) {
    const rows = this.getSiteConnections().map((row) => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row);
    write(KEYS.siteConnections, rows);
    return rows.find((row) => row.id === id);
  },

  transitionSiteConnection(id: string, nextStatus: SiteConnectionStatus, patch: Partial<Pick<SiteConnectionRecord, "manifestStatus" | "registrySnapshotId" | "validationEvidenceId" | "lastValidatedAt">>) {
    const current = this.getSiteConnections().find((row) => row.id === id);
    if (!current) throw new Error("Managed Site Connection not found");
    const allowed: Record<SiteConnectionStatus, SiteConnectionStatus[]> = {
      registered: ["identity_pending", "manifest_received", "revoked"],
      identity_pending: ["registered", "manifest_received", "revoked"],
      manifest_received: ["manifest_received", "validating", "revoked"],
      validating: ["ready", "incompatible", "revoked"],
      incompatible: ["manifest_received", "validating", "suspended", "revoked"],
      ready: ["connected", "suspended", "revoked"],
      connected: ["suspended", "revoked"],
      suspended: ["manifest_received", "validating", "ready", "connected", "revoked"],
      revoked: [],
    };
    if (!allowed[current.status].includes(nextStatus)) throw new Error(`Invalid Site Connection lifecycle transition: ${current.status} → ${nextStatus}`);
    const rows = this.getSiteConnections().map((row) => row.id === id ? { ...row, ...patch, status: nextStatus, updatedAt: new Date().toISOString() } : row);
    write(KEYS.siteConnections, rows);
    return rows.find((row) => row.id === id);
  },

  submitDemoRequest(input: { name: string; email: string; company: string }) {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("A valid email address is required for a demo request");
    const existingOpen = this.getDemoRequests().find((row) => row.email.toLowerCase() === email && !["rejected", "expired", "revoked"].includes(row.status));
    if (existingOpen) return existingOpen;
    const timestamp = new Date().toISOString();
    const row: DemoAccessRequestRecord = {
      id: uid("demo"),
      name: input.name.trim() || email,
      email,
      company: input.company.trim(),
      status: "submitted",
      requestedAt: timestamp,
      reviewNote: "",
      updatedAt: timestamp,
    };
    write(KEYS.demoRequests, [row, ...this.getDemoRequests()]);
    platformStore.addAudit("System", "Demo access requested", row.email, "NEXT F Digital", "Demo request submitted for staff review; no environment or Customer Workspace was created.", "info");
    return row;
  },

  startDemoReview(id: string, reviewerId: string) {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || request.status !== "submitted") throw new Error("Only submitted demo requests can enter review");
    const updated = patchDemoRequestRecord(id, { status: "under_review", reviewedBy: reviewerId, reviewedAt: new Date().toISOString() });
    if (updated) platformStore.addAudit("Admin", "Demo access review started", updated.email, "NEXT F Digital", "Demo request entered staff review; no environment or Customer Workspace access was granted.", "info");
    return updated;
  },

  approveDemoRequest(id: string, reviewerId: string, reviewNote = "Approved for isolated demonstration access only.") {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || request.status !== "under_review") throw new Error("Demo request must be under review before approval");
    const updated = patchDemoRequestRecord(id, { status: "approved", reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote });
    if (updated) platformStore.addAudit("Admin", "Demo access request approved", updated.email, "NEXT F Digital", "Approval permits isolated demo provisioning only; no environment is active yet.", "info");
    return updated;
  },

  rejectDemoRequest(id: string, reviewerId: string, reviewNote = "Demo access request rejected.") {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || !["submitted", "under_review"].includes(request.status)) throw new Error("Demo request is not reviewable");
    const updated = patchDemoRequestRecord(id, { status: "rejected", reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote });
    if (updated) platformStore.addAudit("Admin", "Demo access request rejected", updated.email, "NEXT F Digital", reviewNote, "warning");
    return updated;
  },

  linkDemoEnvironment(id: string, demoEnvironmentId: string) {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || request.status !== "approved") throw new Error("Only an approved demo request can receive an environment reference");
    if (request.demoEnvironmentId && request.demoEnvironmentId !== demoEnvironmentId) throw new Error("Demo request already references a different environment");
    return patchDemoRequestRecord(id, { demoEnvironmentId });
  },

  activateDemoAccess(id: string, expiresAt: string) {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || request.status !== "approved" || !request.demoEnvironmentId) throw new Error("Approved request with a provisioned demo environment is required before activation");
    return patchDemoRequestRecord(id, { status: "active", expiresAt });
  },

  extendDemoAccess(id: string, expiresAt: string) {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || !["active", "extended"].includes(request.status)) throw new Error("Only active demo access can be extended");
    return patchDemoRequestRecord(id, { status: "extended", expiresAt });
  },

  expireDemoAccess(id: string) {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || !["active", "extended"].includes(request.status)) return request;
    const updated = patchDemoRequestRecord(id, { status: "expired" });
    if (updated) platformStore.addAudit("System", "Demo access expired", updated.email, "NEXT F Digital", "Isolated demo access reached its expiry. No production workspace was affected.", "info");
    return updated;
  },

  revokeDemoAccess(id: string, reason = "Revoked by NEXT F staff") {
    const request = this.getDemoRequests().find((row) => row.id === id);
    if (!request || !["approved", "active", "extended"].includes(request.status)) throw new Error("Demo request is not in a revocable access state");
    const updated = patchDemoRequestRecord(id, { status: "revoked", reviewNote: reason });
    if (updated) platformStore.addAudit("Admin", "Demo access revoked", updated.email, "NEXT F Digital", reason, "warning");
    return updated;
  },

  getLegacyPortalMigrationAssessments(): LegacyPortalMigrationAssessment[] {
    const links = this.getOrganizationLinks();
    const workspaces = this.getWorkspaces();
    return portalRepository.get().map((portal) => {
      const account = identityStore.findAccountByEmail(portal.email);
      if (!account) return { portalAccessId: portal.id, clientId: portal.clientId, email: portal.email, legacyStatus: portal.status, state: "blocked_identity", reason: "No verified NEXT F Account relationship has been resolved. Email matching alone is not enough to migrate access." };
      const organizationLinks = links.filter((link) => link.clientId === portal.clientId && link.status === "active");
      if (organizationLinks.length !== 1) return { portalAccessId: portal.id, clientId: portal.clientId, email: portal.email, legacyStatus: portal.status, accountId: account.id, state: "blocked_organization", reason: "A single explicit customer organization link is required before migration can be reviewed." };
      const organizationId = organizationLinks[0].organizationId;
      const eligibleWorkspaces = workspaces.filter((workspace) => workspace.clientId === portal.clientId && workspace.organizationId === organizationId && workspace.status !== "closed");
      if (eligibleWorkspaces.length !== 1) return { portalAccessId: portal.id, clientId: portal.clientId, email: portal.email, legacyStatus: portal.status, accountId: account.id, organizationId, state: "blocked_workspace", reason: "A single target Customer Workspace must be selected safely; no production membership is inferred." };
      return { portalAccessId: portal.id, clientId: portal.clientId, email: portal.email, legacyStatus: portal.status, accountId: account.id, organizationId, workspaceId: eligibleWorkspaces[0].id, state: "ready_for_review", reason: "Identity, organization, and workspace can be resolved. Staff review is still required; the legacy portal state is not copied automatically." };
    });
  },
};

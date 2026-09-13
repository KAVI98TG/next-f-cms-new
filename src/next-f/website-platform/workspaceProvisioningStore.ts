import { identityStore } from "../../platform/identity/identityStore";
import { platformOperationsStore } from "../../platform/services/platformOperationsStore";
import { platformStore } from "../../platform/services/platformStore";
import { digitalStore } from "../data/digitalStore";
import { websitePlatformStore } from "./websitePlatformStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type ProvisioningReviewStatus = "not_started" | "in_review" | "approved" | "blocked" | "completed";
export type WorkspaceAttachmentType = "project" | "service";
export type ProvisioningActivityTarget = "workspace" | "demo";
export type DemoEnvironmentStatus = "provisioning" | "active" | "expired" | "revoked";

export type WorkspaceProvisioningReview = {
  id: string;
  workspaceId: string;
  status: ProvisioningReviewStatus;
  primaryAccountId?: string;
  reviewerId?: string;
  reviewNote: string;
  startedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

export type WorkspaceAttachmentRecord = {
  id: string;
  workspaceId: string;
  type: WorkspaceAttachmentType;
  resourceId: string;
  attachedBy: string;
  attachedAt: string;
};

export type ProvisioningActivityRecord = {
  id: string;
  targetType: ProvisioningActivityTarget;
  targetId: string;
  action: string;
  actorId: string;
  detail: string;
  createdAt: string;
};

export type DemoEnvironmentRecord = {
  id: string;
  demoRequestId: string;
  environmentKey: string;
  templateVersion: string;
  dataPolicy: "synthetic_only";
  status: DemoEnvironmentStatus;
  restrictions: string[];
  expiresAt: string;
  resetCount: number;
  provisionedBy: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  revokedAt?: string;
};

export type WorkspaceProvisioningAssessment = {
  workspaceId: string;
  primaryAccountId?: string;
  accountReady: boolean;
  clientReady: boolean;
  organizationReady: boolean;
  organizationLinkReady: boolean;
  eligibleProjectIds: string[];
  eligibleServiceIds: string[];
  eligibleSiteIds: string[];
  attachedProjectIds: string[];
  attachedServiceIds: string[];
  connectedSiteIds: string[];
  blockers: string[];
};

const KEYS = {
  reviews: "nextf.v0.14.digital.workspace-provisioning-reviews",
  attachments: "nextf.v0.14.digital.workspace-attachments",
  activity: "nextf.v0.14.digital.provisioning-activity",
  demoEnvironments: "nextf.v0.14.digital.demo-environments",
};

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();
const ahead = (days: number) => new Date(now + days * 86_400_000).toISOString();

const reviewSeed: WorkspaceProvisioningReview[] = [
  {
    id: "provision_review_1",
    workspaceId: "cws_1",
    status: "completed",
    primaryAccountId: "acct_customer_1",
    reviewerId: "usr_admin",
    reviewNote: "Seed workspace normalized as an already-provisioned real customer workspace.",
    startedAt: ago(180),
    approvedAt: ago(179),
    completedAt: ago(178),
    updatedAt: ago(5),
  },
];

const attachmentSeed: WorkspaceAttachmentRecord[] = [
  { id: "workspace_attachment_project_1", workspaceId: "cws_1", type: "project", resourceId: "proj_1", attachedBy: "usr_admin", attachedAt: ago(178) },
  { id: "workspace_attachment_service_1", workspaceId: "cws_1", type: "service", resourceId: "svc_seo_growth", attachedBy: "usr_admin", attachedAt: ago(178) },
];

const activitySeed: ProvisioningActivityRecord[] = [
  { id: "provision_activity_1", targetType: "workspace", targetId: "cws_1", action: "workspace.provisioned", actorId: "usr_admin", detail: "Existing seed workspace normalized into the V0.14 provisioning history.", createdAt: ago(178) },
  { id: "provision_activity_demo_1", targetType: "demo", targetId: "demo_2", action: "demo.activated", actorId: "usr_admin", detail: "Seed demo environment activated with synthetic-only data.", createdAt: ago(12) },
];

const demoEnvironmentSeed: DemoEnvironmentRecord[] = [
  {
    id: "demo_environment_1",
    demoRequestId: "demo_2",
    environmentKey: "demo-aster-retail",
    templateVersion: "demo-v1",
    dataPolicy: "synthetic_only",
    status: "active",
    restrictions: ["synthetic-data-only", "no-production-integrations", "no-production-publishing", "no-secret-access"],
    expiresAt: ahead(2),
    resetCount: 0,
    provisionedBy: "usr_admin",
    createdAt: ago(12),
    updatedAt: ago(12),
    activatedAt: ago(12),
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

function addActivity(targetType: ProvisioningActivityTarget, targetId: string, action: string, actorId: string, detail: string) {
  const row: ProvisioningActivityRecord = { id: uid("provision_activity"), targetType, targetId, action, actorId, detail, createdAt: new Date().toISOString() };
  write(KEYS.activity, [row, ...read(KEYS.activity, activitySeed)].slice(0, 500));
  return row;
}

export const workspaceProvisioningStore = {
  getReviews: () => read(KEYS.reviews, reviewSeed),
  getAttachments: () => read(KEYS.attachments, attachmentSeed),
  getActivity: () => read(KEYS.activity, activitySeed),

  getDemoEnvironments() {
    const rows = read(KEYS.demoEnvironments, demoEnvironmentSeed);
    if (typeof window === "undefined") return rows;
    const timestamp = Date.now();
    let changed = false;
    const normalized = rows.map((row) => {
      if (row.status === "active" && new Date(row.expiresAt).getTime() <= timestamp) {
        changed = true;
        return { ...row, status: "expired" as const, updatedAt: new Date().toISOString() };
      }
      return row;
    });
    if (changed) {
      write(KEYS.demoEnvironments, normalized);
      normalized.filter((row) => row.status === "expired").forEach((row) => {
        const request = websitePlatformStore.getDemoRequests().find((item) => item.id === row.demoRequestId);
        if (request && !["expired", "revoked", "rejected"].includes(request.status)) websitePlatformStore.expireDemoAccess(request.id);
      });
    }
    return normalized;
  },

  getReviewForWorkspace(workspaceId: string) {
    return this.getReviews().find((row) => row.workspaceId === workspaceId);
  },

  assessWorkspace(workspaceId: string): WorkspaceProvisioningAssessment {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
    if (!workspace) throw new Error("Customer Workspace not found");
    const review = this.getReviewForWorkspace(workspaceId);
    const account = review?.primaryAccountId ? identityStore.getAccounts().find((row) => row.id === review.primaryAccountId) : undefined;
    const client = digitalStore.getClients().find((row) => row.id === workspace.clientId);
    const organization = platformOperationsStore.getOrganizations().find((row) => row.id === workspace.organizationId);
    const organizationLink = websitePlatformStore.getOrganizationLinks().find((row) => row.clientId === workspace.clientId && row.organizationId === workspace.organizationId && row.status === "active");
    const projects = digitalStore.getProjects().filter((row) => row.clientId === workspace.clientId && row.status !== "cancelled");
    const subscriptions = digitalStore.getSubscriptions().filter((row) => row.clientId === workspace.clientId && row.status !== "cancelled");
    const eligibleServiceIds = [...new Set([...projects.map((row) => row.serviceId), ...subscriptions.map((row) => row.serviceId)])];
    const eligibleSites = digitalStore.getSites().filter((row) => row.clientId === workspace.clientId);
    const attachments = this.getAttachments().filter((row) => row.workspaceId === workspaceId);
    const connectedSites = websitePlatformStore.getSiteConnections().filter((row) => row.workspaceId === workspaceId && row.status !== "revoked");
    const blockers: string[] = [];
    const accountReady = Boolean(account && account.state === "active" && account.verificationState === "verified");
    const clientReady = client?.status === "active";
    const organizationReady = Boolean(organization && organization.kind === "customer" && organization.status === "active");
    const organizationLinkReady = Boolean(organizationLink);
    if (!accountReady) blockers.push("Select a verified, active NEXT F Account as the primary customer identity for provisioning review.");
    if (!clientReady) blockers.push("Digital client must be active before a real Customer Workspace can be provisioned.");
    if (!organizationReady) blockers.push("Customer organization must be active and classified as customer.");
    if (!organizationLinkReady) blockers.push("Digital client and Customer Organization must have an explicit active relationship.");
    if (!projects.length && !subscriptions.length) blockers.push("At least one eligible project or subscription/service relationship is required.");
    return {
      workspaceId,
      primaryAccountId: review?.primaryAccountId,
      accountReady,
      clientReady,
      organizationReady,
      organizationLinkReady,
      eligibleProjectIds: projects.map((row) => row.id),
      eligibleServiceIds,
      eligibleSiteIds: eligibleSites.map((row) => row.id),
      attachedProjectIds: attachments.filter((row) => row.type === "project").map((row) => row.resourceId),
      attachedServiceIds: attachments.filter((row) => row.type === "service").map((row) => row.resourceId),
      connectedSiteIds: connectedSites.map((row) => row.siteId),
      blockers,
    };
  },

  startReview(workspaceId: string, primaryAccountId: string, reviewerId: string, reviewNote = "") {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
    if (!workspace) throw new Error("Customer Workspace not found");
    if (workspace.status !== "requested") throw new Error("Only requested workspaces can enter provisioning review");
    const account = identityStore.getAccounts().find((row) => row.id === primaryAccountId);
    if (!account || account.state !== "active" || account.verificationState !== "verified") throw new Error("Provisioning review requires a verified, active NEXT F Account");
    const timestamp = new Date().toISOString();
    const current = this.getReviewForWorkspace(workspaceId);
    const review: WorkspaceProvisioningReview = current
      ? { ...current, primaryAccountId, reviewerId, reviewNote, status: "in_review", startedAt: current.startedAt ?? timestamp, updatedAt: timestamp }
      : { id: uid("provision_review"), workspaceId, primaryAccountId, reviewerId, reviewNote, status: "in_review", startedAt: timestamp, updatedAt: timestamp };
    write(KEYS.reviews, [review, ...this.getReviews().filter((row) => row.workspaceId !== workspaceId)]);
    addActivity("workspace", workspaceId, "workspace.review_started", reviewerId, `Provisioning review started with primary account ${account.primaryEmail}.`);
    platformStore.addAudit("Admin", "Customer workspace provisioning review started", workspace.name, "NEXT F Digital", `Primary account ${account.id}; no customer access granted.`, "info");
    return review;
  },

  approveReview(workspaceId: string, reviewerId: string, reviewNote = "") {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
    const current = this.getReviewForWorkspace(workspaceId);
    if (!workspace || !current) throw new Error("Provisioning review not found");
    if (current.status !== "in_review" && current.status !== "blocked") throw new Error("Provisioning review is not awaiting approval");
    const assessment = this.assessWorkspace(workspaceId);
    if (assessment.blockers.length) {
      const timestamp = new Date().toISOString();
      const blocked = { ...current, status: "blocked" as const, reviewerId, reviewNote: reviewNote || current.reviewNote, updatedAt: timestamp };
      write(KEYS.reviews, [blocked, ...this.getReviews().filter((row) => row.workspaceId !== workspaceId)]);
      addActivity("workspace", workspaceId, "workspace.review_blocked", reviewerId, assessment.blockers.join(" "));
      throw new Error(assessment.blockers.join(" "));
    }
    const timestamp = new Date().toISOString();
    const approved: WorkspaceProvisioningReview = { ...current, status: "approved", reviewerId, reviewNote: reviewNote || current.reviewNote, approvedAt: timestamp, updatedAt: timestamp };
    write(KEYS.reviews, [approved, ...this.getReviews().filter((row) => row.workspaceId !== workspaceId)]);
    websitePlatformStore.transitionWorkspace(workspaceId, "provisioning", "Provisioning eligibility review approved.");
    addActivity("workspace", workspaceId, "workspace.review_approved", reviewerId, "Eligibility review approved. Workspace entered provisioning state; membership access is still not granted.");
    platformStore.addAudit("Admin", "Customer workspace provisioning approved", workspace.name, "NEXT F Digital", "Eligibility review passed and workspace entered provisioning state. Membership invitation remains a separate step.", "info");
    return approved;
  },

  attachProject(workspaceId: string, projectId: string, actorId: string) {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
    if (!workspace || workspace.status !== "provisioning") throw new Error("Workspace must be in provisioning state before projects are attached");
    const assessment = this.assessWorkspace(workspaceId);
    if (!assessment.eligibleProjectIds.includes(projectId)) throw new Error("Project is not an eligible project for this customer workspace");
    const existing = this.getAttachments().find((row) => row.workspaceId === workspaceId && row.type === "project" && row.resourceId === projectId);
    if (existing) return existing;
    const row: WorkspaceAttachmentRecord = { id: uid("workspace_attachment"), workspaceId, type: "project", resourceId: projectId, attachedBy: actorId, attachedAt: new Date().toISOString() };
    write(KEYS.attachments, [row, ...this.getAttachments()]);
    addActivity("workspace", workspaceId, "workspace.project_attached", actorId, `Project ${projectId} attached explicitly.`);
    return row;
  },

  attachService(workspaceId: string, serviceId: string, actorId: string) {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
    if (!workspace || workspace.status !== "provisioning") throw new Error("Workspace must be in provisioning state before services are attached");
    const assessment = this.assessWorkspace(workspaceId);
    if (!assessment.eligibleServiceIds.includes(serviceId)) throw new Error("Service is not backed by an eligible project or subscription relationship for this client");
    const existing = this.getAttachments().find((row) => row.workspaceId === workspaceId && row.type === "service" && row.resourceId === serviceId);
    if (existing) return existing;
    const row: WorkspaceAttachmentRecord = { id: uid("workspace_attachment"), workspaceId, type: "service", resourceId: serviceId, attachedBy: actorId, attachedAt: new Date().toISOString() };
    write(KEYS.attachments, [row, ...this.getAttachments()]);
    addActivity("workspace", workspaceId, "workspace.service_attached", actorId, `Service ${serviceId} attached explicitly.`);
    return row;
  },

  attachSite(workspaceId: string, siteId: string, actorId: string) {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
    if (!workspace || workspace.status !== "provisioning") throw new Error("Workspace must be in provisioning state before sites are attached");
    const assessment = this.assessWorkspace(workspaceId);
    if (!assessment.eligibleSiteIds.includes(siteId)) throw new Error("Site does not belong to the Customer Workspace Digital client");
    const row = websitePlatformStore.connectSite(workspaceId, siteId);
    addActivity("workspace", workspaceId, "workspace.site_attached", actorId, `Site ${siteId} connected with contract pin ${row.contractVersion}; Site Manifest remains fail-closed until validated.`);
    return row;
  },

  activateWorkspace(workspaceId: string, actorId: string) {
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
    const review = this.getReviewForWorkspace(workspaceId);
    if (!workspace || workspace.status !== "provisioning" || review?.status !== "approved") throw new Error("Workspace must have an approved provisioning review and be in provisioning state");
    const assessment = this.assessWorkspace(workspaceId);
    if (assessment.blockers.length) throw new Error(assessment.blockers.join(" "));
    if (!assessment.attachedProjectIds.length) throw new Error("Attach at least one eligible Digital project before activation");
    if (!assessment.attachedServiceIds.length) throw new Error("Attach at least one eligible service before activation");
    const timestamp = new Date().toISOString();
    websitePlatformStore.transitionWorkspace(workspaceId, "active", "Provisioning scope completed and activation approved.", timestamp);
    const completed: WorkspaceProvisioningReview = { ...review, status: "completed", completedAt: timestamp, updatedAt: timestamp };
    write(KEYS.reviews, [completed, ...this.getReviews().filter((row) => row.workspaceId !== workspaceId)]);
    addActivity("workspace", workspaceId, "workspace.activated", actorId, `Workspace activated with ${assessment.attachedProjectIds.length} project(s), ${assessment.attachedServiceIds.length} service(s), and ${assessment.connectedSiteIds.length} connected site(s). Membership invitations remain explicit.`);
    platformStore.addAudit("Admin", "Customer workspace activated", workspace.name, "NEXT F Digital", "Provisioning completed. Customer membership invitations remain explicit and separate from workspace activation.", "info");
    return websitePlatformStore.getWorkspaces().find((row) => row.id === workspaceId);
  },

  provisionDemoEnvironment(demoRequestId: string, actorId: string, durationDays = 14) {
    const request = websitePlatformStore.getDemoRequests().find((row) => row.id === demoRequestId);
    if (!request || request.status !== "approved") throw new Error("Demo request must be approved before an isolated environment is provisioned");
    const existing = this.getDemoEnvironments().find((row) => row.demoRequestId === demoRequestId && !["expired", "revoked"].includes(row.status));
    if (existing) return existing;
    const timestamp = new Date().toISOString();
    const keyBase = slug(request.company || request.name || "prospect") || "prospect";
    const row: DemoEnvironmentRecord = {
      id: uid("demo_environment"),
      demoRequestId,
      environmentKey: `demo-${keyBase}-${Math.random().toString(36).slice(2, 7)}`,
      templateVersion: "demo-v1",
      dataPolicy: "synthetic_only",
      status: "provisioning",
      restrictions: ["synthetic-data-only", "no-production-integrations", "no-production-publishing", "no-secret-access", "no-real-customer-data"],
      expiresAt: new Date(Date.now() + Math.max(1, durationDays) * 86_400_000).toISOString(),
      resetCount: 0,
      provisionedBy: actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    write(KEYS.demoEnvironments, [row, ...this.getDemoEnvironments()]);
    websitePlatformStore.linkDemoEnvironment(demoRequestId, row.id);
    addActivity("demo", demoRequestId, "demo.environment_provisioned", actorId, `Isolated environment ${row.environmentKey} created from ${row.templateVersion}; data policy ${row.dataPolicy}.`);
    platformStore.addAudit("Admin", "Demo environment provisioned", request.email, "NEXT F Digital", `Environment ${row.environmentKey} is isolated and synthetic-only; no production workspace was created.`, "info");
    return row;
  },

  activateDemoEnvironment(environmentId: string, actorId: string) {
    const rows = this.getDemoEnvironments();
    const target = rows.find((row) => row.id === environmentId);
    if (!target || target.status !== "provisioning") throw new Error("Demo environment is not awaiting activation");
    const timestamp = new Date().toISOString();
    const updated = { ...target, status: "active" as const, activatedAt: timestamp, updatedAt: timestamp };
    write(KEYS.demoEnvironments, rows.map((row) => row.id === environmentId ? updated : row));
    websitePlatformStore.activateDemoAccess(target.demoRequestId, target.expiresAt);
    addActivity("demo", target.demoRequestId, "demo.activated", actorId, `Demo environment ${target.environmentKey} activated until ${target.expiresAt}.`);
    return updated;
  },

  extendDemoEnvironment(environmentId: string, actorId: string, days = 7) {
    const rows = this.getDemoEnvironments();
    const target = rows.find((row) => row.id === environmentId);
    if (!target || target.status !== "active") throw new Error("Only an active demo environment can be extended");
    const timestamp = new Date().toISOString();
    const base = Math.max(Date.now(), new Date(target.expiresAt).getTime());
    const expiresAt = new Date(base + Math.max(1, days) * 86_400_000).toISOString();
    const updated = { ...target, expiresAt, updatedAt: timestamp };
    write(KEYS.demoEnvironments, rows.map((row) => row.id === environmentId ? updated : row));
    websitePlatformStore.extendDemoAccess(target.demoRequestId, expiresAt);
    addActivity("demo", target.demoRequestId, "demo.extended", actorId, `Demo access extended by ${Math.max(1, days)} day(s) to ${expiresAt}.`);
    return updated;
  },

  resetDemoEnvironment(environmentId: string, actorId: string) {
    const rows = this.getDemoEnvironments();
    const target = rows.find((row) => row.id === environmentId);
    if (!target || target.status !== "active") throw new Error("Only an active demo environment can be reset");
    const updated = { ...target, resetCount: target.resetCount + 1, updatedAt: new Date().toISOString() };
    write(KEYS.demoEnvironments, rows.map((row) => row.id === environmentId ? updated : row));
    addActivity("demo", target.demoRequestId, "demo.reset", actorId, `Synthetic demonstration dataset reset. Reset count: ${updated.resetCount}.`);
    return updated;
  },

  revokeDemoEnvironment(environmentId: string, actorId: string, reason = "Revoked by NEXT F staff") {
    const rows = this.getDemoEnvironments();
    const target = rows.find((row) => row.id === environmentId);
    if (!target || ["revoked", "expired"].includes(target.status)) return target;
    const timestamp = new Date().toISOString();
    const updated = { ...target, status: "revoked" as const, revokedAt: timestamp, updatedAt: timestamp };
    write(KEYS.demoEnvironments, rows.map((row) => row.id === environmentId ? updated : row));
    websitePlatformStore.revokeDemoAccess(target.demoRequestId, reason);
    addActivity("demo", target.demoRequestId, "demo.revoked", actorId, reason);
    return updated;
  },
};

import { customerAccessStore } from "../../platform/customer-access/customerAccessStore";
import { platformStore } from "../../platform/services/platformStore";
import { customerCapabilityPolicyStore, type ResourceStateAuthorization } from "./customerCapabilityPolicyStore";
import { websitePlatformStore } from "./websitePlatformStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type ChangeRequestStatus = "submitted" | "in_review" | "changes_requested" | "approved" | "rejected" | "conflict" | "applied" | "cancelled";
export type PublishRequestStatus = "submitted" | "in_review" | "changes_requested" | "approved" | "authorized" | "rejected" | "conflict" | "published" | "cancelled";
export type ReviewDecision = "submitted" | "review_started" | "changes_requested" | "approved" | "rejected" | "conflict" | "applied" | "authorized" | "published" | "cancelled";
export type PublishReviewMode = "staff_approval" | "direct_authorized";

export type ProposedFieldChange = {
  fieldPath: string;
  proposedValue: unknown;
};

export type ManagedResourceRevisionEvidenceRecord = {
  id: string;
  siteConnectionId: string;
  capabilityId: string;
  resourceId: string;
  externalRevisionId: string;
  contentHash: string;
  validationEvidenceId: string;
  source: "site_observation" | "approved_change_application" | "direct_customer_mutation";
  sourceReference?: string;
  observedBy: string;
  observedAt: string;
};

export type ManagedResourceHeadRecord = {
  id: string;
  resourceKey: string;
  siteConnectionId: string;
  capabilityId: string;
  resourceId: string;
  revisionEvidenceId: string;
  externalRevisionId: string;
  contentHash: string;
  updatedAt: string;
};

export type CustomerChangeRequestRecord = {
  id: string;
  membershipId: string;
  workspaceId: string;
  accountId: string;
  siteConnectionId: string;
  capabilityId: string;
  resourceId: string;
  validationEvidenceId: string;
  baseRevisionId: string;
  baseContentHash: string;
  proposedChanges: ProposedFieldChange[];
  status: ChangeRequestStatus;
  submittedAt: string;
  updatedAt: string;
  reviewerId?: string;
  reviewStartedAt?: string;
  approvedAt?: string;
  appliedAt?: string;
  resultingRevisionId?: string;
  supersedesRequestId?: string;
  supersededByRequestId?: string;
};

export type ChangeReviewEventRecord = {
  id: string;
  changeRequestId: string;
  decision: ReviewDecision;
  actorType: "customer" | "staff" | "system";
  actorId: string;
  note?: string;
  baseRevisionId: string;
  currentRevisionId?: string;
  resultingRevisionId?: string;
  createdAt: string;
};

export type ChangeApplicationReceiptRecord = {
  id: string;
  changeRequestId: string;
  adapterReceiptId: string;
  siteConnectionId: string;
  resourceId: string;
  expectedBaseRevisionId: string;
  resultingRevisionId: string;
  resultingContentHash: string;
  appliedBy: string;
  appliedAt: string;
};

export type CustomerPublishRequestRecord = {
  id: string;
  membershipId: string;
  workspaceId: string;
  accountId: string;
  siteConnectionId: string;
  capabilityId: string;
  resourceId: string;
  validationEvidenceId: string;
  targetRevisionId: string;
  targetContentHash: string;
  reviewMode: PublishReviewMode;
  status: PublishRequestStatus;
  submittedAt: string;
  updatedAt: string;
  reviewerId?: string;
  reviewStartedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
  supersedesRequestId?: string;
  supersededByRequestId?: string;
};

export type PublishReviewEventRecord = {
  id: string;
  publishRequestId: string;
  decision: ReviewDecision;
  actorType: "customer" | "staff" | "system";
  actorId: string;
  note?: string;
  targetRevisionId: string;
  currentRevisionId?: string;
  createdAt: string;
};

export type PublishingReceiptRecord = {
  id: string;
  publishRequestId: string;
  adapterReceiptId: string;
  publicationReference: string;
  siteConnectionId: string;
  resourceId: string;
  publishedRevisionId: string;
  publishedContentHash: string;
  publishedBy: string;
  publishedAt: string;
};

const KEYS = {
  revisionEvidence: "nextf.v0.17.website-platform.managed-resource-revision-evidence",
  resourceHeads: "nextf.v0.17.website-platform.managed-resource-heads",
  changeRequests: "nextf.v0.17.website-platform.change-requests",
  changeReviews: "nextf.v0.17.website-platform.change-review-events",
  applicationReceipts: "nextf.v0.17.website-platform.change-application-receipts",
  publishRequests: "nextf.v0.17.website-platform.publish-requests",
  publishReviews: "nextf.v0.17.website-platform.publish-review-events",
  publishingReceipts: "nextf.v0.17.website-platform.publishing-receipts",
};

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:website-platform", { detail: key }));
  return result;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const resourceKey = (siteConnectionId: string, capabilityId: string, resourceId: string) => `${siteConnectionId}::${capabilityId}::${resourceId}`;

function requireConnectedSite(siteConnectionId: string) {
  const connection = websitePlatformStore.getSiteConnections().find((row) => row.id === siteConnectionId);
  if (!connection || connection.status !== "connected" || connection.manifestStatus !== "valid" || !connection.validationEvidenceId) {
    throw new Error("Connected managed Site with current valid Contract evidence is required");
  }
  return connection;
}

function requireCurrentCapability(siteConnectionId: string, capabilityId: string) {
  const connection = requireConnectedSite(siteConnectionId);
  const projection = customerCapabilityPolicyStore.getCanonicalAccessProjections().find((row) => row.siteConnectionId === siteConnectionId && row.validationEvidenceId === connection.validationEvidenceId);
  if (!projection) throw new Error("Current canonical Customer Capability Access projection is required");
  if (!projection.capabilities.some((row) => row.capabilityId === capabilityId)) throw new Error("Capability is not present in the current canonical Customer Capability Access projection");
  return { connection, projection };
}

function requireMembership(membershipId: string, workspaceId: string) {
  const membership = customerAccessStore.getMemberships().find((row) => row.id === membershipId && row.workspaceId === workspaceId);
  if (!membership || membership.status !== "active" || membership.invitationState !== "accepted") throw new Error("Active accepted Customer Workspace membership is required");
  return membership;
}

function requireResourceHead(siteConnectionId: string, capabilityId: string, resourceId: string) {
  const connection = requireConnectedSite(siteConnectionId);
  const head = changeApprovalPublishingStore.getResourceHeads().find((row) => row.resourceKey === resourceKey(siteConnectionId, capabilityId, resourceId));
  if (!head) throw new Error("Authoritative managed-resource revision has not been observed yet");
  const evidence = changeApprovalPublishingStore.getRevisionEvidence().find((row) => row.id === head.revisionEvidenceId);
  if (!evidence || evidence.validationEvidenceId !== connection.validationEvidenceId) throw new Error("Managed-resource revision evidence is stale for the current Site Contract/Manifest validation cycle; re-observe the authoritative resource before customer mutation or publishing");
  return head;
}

function assertExternalRevisionIntegrity(siteConnectionId: string, capabilityId: string, resourceId: string, externalRevisionId: string, contentHash: string) {
  const prior = changeApprovalPublishingStore.getRevisionEvidence().find((row) => row.siteConnectionId === siteConnectionId && row.capabilityId === capabilityId && row.resourceId === resourceId && row.externalRevisionId === externalRevisionId);
  if (prior && prior.contentHash !== contentHash) throw new Error("External revision immutability violation: the same revision ID was observed with a different content hash");
  return prior;
}

function requireRequestValidationCurrent(siteConnectionId: string, validationEvidenceId: string) {
  const connection = requireConnectedSite(siteConnectionId);
  if (connection.validationEvidenceId !== validationEvidenceId) throw new Error("Request was created under an older Site Contract/Manifest validation cycle and must be reviewed/recreated against current evidence");
  return connection;
}

function recordChangeReview(input: Omit<ChangeReviewEventRecord, "id" | "createdAt">) {
  const row: ChangeReviewEventRecord = { id: uid("change_review"), ...input, createdAt: now() };
  write(KEYS.changeReviews, [row, ...changeApprovalPublishingStore.getChangeReviewEvents()]);
  return row;
}

function recordPublishReview(input: Omit<PublishReviewEventRecord, "id" | "createdAt">) {
  const row: PublishReviewEventRecord = { id: uid("publish_review"), ...input, createdAt: now() };
  write(KEYS.publishReviews, [row, ...changeApprovalPublishingStore.getPublishReviewEvents()]);
  return row;
}

function markConflictsForHead(head: ManagedResourceHeadRecord, ignoreChangeRequestId?: string, ignorePublishRequestId?: string) {
  const changeRows = changeApprovalPublishingStore.getChangeRequests();
  let changeChanged = false;
  const nextChanges = changeRows.map((row) => {
    if (row.id === ignoreChangeRequestId || row.siteConnectionId !== head.siteConnectionId || row.capabilityId !== head.capabilityId || row.resourceId !== head.resourceId) return row;
    if (!["submitted", "in_review", "changes_requested", "approved"].includes(row.status) || row.baseRevisionId === head.externalRevisionId) return row;
    changeChanged = true;
    recordChangeReview({ changeRequestId: row.id, decision: "conflict", actorType: "system", actorId: "system", note: "Authoritative resource revision changed after this proposal was created.", baseRevisionId: row.baseRevisionId, currentRevisionId: head.externalRevisionId });
    platformStore.addAudit("System", "Website change request conflicted", row.resourceId, "NEXT F Digital", `Change request ${row.id}: base ${row.baseRevisionId}, current ${head.externalRevisionId}.`, "warning");
    return { ...row, status: "conflict" as const, updatedAt: now() };
  });
  if (changeChanged) write(KEYS.changeRequests, nextChanges);

  const publishRows = changeApprovalPublishingStore.getPublishRequests();
  let publishChanged = false;
  const nextPublishes = publishRows.map((row) => {
    if (row.id === ignorePublishRequestId || row.siteConnectionId !== head.siteConnectionId || row.capabilityId !== head.capabilityId || row.resourceId !== head.resourceId) return row;
    if (!["submitted", "in_review", "changes_requested", "approved", "authorized"].includes(row.status) || row.targetRevisionId === head.externalRevisionId) return row;
    publishChanged = true;
    recordPublishReview({ publishRequestId: row.id, decision: "conflict", actorType: "system", actorId: "system", note: "Authoritative resource revision changed before publication completed.", targetRevisionId: row.targetRevisionId, currentRevisionId: head.externalRevisionId });
    platformStore.addAudit("System", "Website publication request conflicted", row.resourceId, "NEXT F Digital", `Publish request ${row.id}: target ${row.targetRevisionId}, current ${head.externalRevisionId}.`, "warning");
    return { ...row, status: "conflict" as const, updatedAt: now() };
  });
  if (publishChanged) write(KEYS.publishRequests, nextPublishes);
}

function normalizeContractStaleChanges(rows: CustomerChangeRequestRecord[]) {
  let changed = false;
  const normalized = rows.map((row) => {
    if (!["submitted", "in_review", "changes_requested", "approved"].includes(row.status)) return row;
    const connection = websitePlatformStore.getSiteConnections().find((item) => item.id === row.siteConnectionId);
    if (connection?.validationEvidenceId === row.validationEvidenceId) return row;
    changed = true;
    const updatedAt = now();
    recordChangeReview({ changeRequestId: row.id, decision: "conflict", actorType: "system", actorId: "system", note: "Site Contract/Manifest validation evidence changed after this proposal was created.", baseRevisionId: row.baseRevisionId, currentRevisionId: changeApprovalPublishingStore.getResourceHeads().find((head) => head.resourceKey === resourceKey(row.siteConnectionId, row.capabilityId, row.resourceId))?.externalRevisionId });
    platformStore.addAudit("System", "Website change request conflicted", row.resourceId, "NEXT F Digital", `Change request ${row.id} was created under Site validation ${row.validationEvidenceId}; current validation is ${connection?.validationEvidenceId ?? "unavailable"}.`, "warning");
    return { ...row, status: "conflict" as const, updatedAt };
  });
  if (changed) write(KEYS.changeRequests, normalized);
  return normalized;
}

function normalizeContractStalePublishes(rows: CustomerPublishRequestRecord[]) {
  let changed = false;
  const normalized = rows.map((row) => {
    if (!["submitted", "in_review", "changes_requested", "approved", "authorized"].includes(row.status)) return row;
    const connection = websitePlatformStore.getSiteConnections().find((item) => item.id === row.siteConnectionId);
    if (connection?.validationEvidenceId === row.validationEvidenceId) return row;
    changed = true;
    const updatedAt = now();
    recordPublishReview({ publishRequestId: row.id, decision: "conflict", actorType: "system", actorId: "system", note: "Site Contract/Manifest validation evidence changed before publication completed.", targetRevisionId: row.targetRevisionId, currentRevisionId: changeApprovalPublishingStore.getResourceHeads().find((head) => head.resourceKey === resourceKey(row.siteConnectionId, row.capabilityId, row.resourceId))?.externalRevisionId });
    platformStore.addAudit("System", "Website publication request conflicted", row.resourceId, "NEXT F Digital", `Publish request ${row.id} was created under Site validation ${row.validationEvidenceId}; current validation is ${connection?.validationEvidenceId ?? "unavailable"}.`, "warning");
    return { ...row, status: "conflict" as const, updatedAt };
  });
  if (changed) write(KEYS.publishRequests, normalized);
  return normalized;
}

export const changeApprovalPublishingStore = {
  getRevisionEvidence: () => read<ManagedResourceRevisionEvidenceRecord[]>(KEYS.revisionEvidence, []),
  getResourceHeads: () => read<ManagedResourceHeadRecord[]>(KEYS.resourceHeads, []),
  getChangeRequests: () => normalizeContractStaleChanges(read<CustomerChangeRequestRecord[]>(KEYS.changeRequests, [])),
  getChangeReviewEvents: () => read<ChangeReviewEventRecord[]>(KEYS.changeReviews, []),
  getApplicationReceipts: () => read<ChangeApplicationReceiptRecord[]>(KEYS.applicationReceipts, []),
  getPublishRequests: () => normalizeContractStalePublishes(read<CustomerPublishRequestRecord[]>(KEYS.publishRequests, [])),
  getPublishReviewEvents: () => read<PublishReviewEventRecord[]>(KEYS.publishReviews, []),
  getPublishingReceipts: () => read<PublishingReceiptRecord[]>(KEYS.publishingReceipts, []),

  observeAuthoritativeRevision(input: { siteConnectionId: string; capabilityId: string; resourceId: string; externalRevisionId: string; contentHash: string; observedBy: string; sourceReference?: string }) {
    const { connection } = requireCurrentCapability(input.siteConnectionId, input.capabilityId);
    if (!input.resourceId.trim() || !input.externalRevisionId.trim() || !input.contentHash.trim()) throw new Error("Resource ID, external revision ID, and content hash are required");
    assertExternalRevisionIntegrity(input.siteConnectionId, input.capabilityId, input.resourceId.trim(), input.externalRevisionId.trim(), input.contentHash.trim());
    const observedAt = now();
    const evidence: ManagedResourceRevisionEvidenceRecord = {
      id: uid("resource_revision"),
      siteConnectionId: input.siteConnectionId,
      capabilityId: input.capabilityId,
      resourceId: input.resourceId.trim(),
      externalRevisionId: input.externalRevisionId.trim(),
      contentHash: input.contentHash.trim(),
      validationEvidenceId: connection.validationEvidenceId!,
      source: "site_observation",
      sourceReference: input.sourceReference?.trim() || undefined,
      observedBy: input.observedBy,
      observedAt,
    };
    write(KEYS.revisionEvidence, [evidence, ...this.getRevisionEvidence()]);
    const key = resourceKey(evidence.siteConnectionId, evidence.capabilityId, evidence.resourceId);
    const priorHeads = this.getResourceHeads();
    const head: ManagedResourceHeadRecord = { id: priorHeads.find((row) => row.resourceKey === key)?.id ?? uid("resource_head"), resourceKey: key, siteConnectionId: evidence.siteConnectionId, capabilityId: evidence.capabilityId, resourceId: evidence.resourceId, revisionEvidenceId: evidence.id, externalRevisionId: evidence.externalRevisionId, contentHash: evidence.contentHash, updatedAt: observedAt };
    write(KEYS.resourceHeads, [head, ...priorHeads.filter((row) => row.resourceKey !== key)]);
    markConflictsForHead(head);
    platformStore.addAudit("System", "Managed website resource revision observed", evidence.resourceId, "NEXT F Digital", `Capability ${evidence.capabilityId}; revision ${evidence.externalRevisionId}. Revision evidence is an audit/reference projection, not a second authoritative content store.`, "info");
    return head;
  },

  submitChangeRequest(input: { membershipId: string; siteConnectionId: string; capabilityId: string; resourceId: string; baseRevisionId: string; proposedChanges: ProposedFieldChange[]; resourceState: ResourceStateAuthorization; supersedesRequestId?: string }) {
    const { connection } = requireCurrentCapability(input.siteConnectionId, input.capabilityId);
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === connection.workspaceId);
    if (!workspace) throw new Error("Customer Workspace not found");
    const membership = requireMembership(input.membershipId, workspace.id);
    const head = requireResourceHead(input.siteConnectionId, input.capabilityId, input.resourceId);
    if (head.externalRevisionId !== input.baseRevisionId) throw new Error("Change request base revision is stale; refresh the authoritative resource before proposing changes");
    if (!input.proposedChanges.length) throw new Error("At least one proposed field change is required");
    const seen = new Set<string>();
    for (const change of input.proposedChanges) {
      if (!change.fieldPath.trim()) throw new Error("Every proposed change requires a canonical field path");
      if (seen.has(change.fieldPath)) throw new Error(`Duplicate proposed field path: ${change.fieldPath}`);
      seen.add(change.fieldPath);
      const decision = customerCapabilityPolicyStore.evaluate({ membershipId: input.membershipId, siteConnectionId: input.siteConnectionId, capabilityId: input.capabilityId, operation: "edit", fieldPath: change.fieldPath, resourceState: input.resourceState });
      if (!decision.allowed || decision.executionPath !== "change_request") throw new Error(`Field ${change.fieldPath} is not authorized for approval-required customer editing`);
    }
    if (input.supersedesRequestId) {
      const prior = this.getChangeRequests().find((row) => row.id === input.supersedesRequestId && row.membershipId === input.membershipId && row.status === "changes_requested");
      if (!prior) throw new Error("Superseded change request must be a changes-requested proposal from the same membership");
    }
    const submittedAt = now();
    const row: CustomerChangeRequestRecord = { id: uid("change_request"), membershipId: membership.id, workspaceId: workspace.id, accountId: membership.accountId, siteConnectionId: input.siteConnectionId, capabilityId: input.capabilityId, resourceId: input.resourceId, validationEvidenceId: connection.validationEvidenceId!, baseRevisionId: head.externalRevisionId, baseContentHash: head.contentHash, proposedChanges: input.proposedChanges.map((change) => ({ ...change, fieldPath: change.fieldPath.trim() })), status: "submitted", submittedAt, updatedAt: submittedAt, supersedesRequestId: input.supersedesRequestId };
    let priorRequests = this.getChangeRequests();
    if (input.supersedesRequestId) {
      priorRequests = priorRequests.map((prior) => prior.id === input.supersedesRequestId ? { ...prior, status: "cancelled" as const, supersededByRequestId: row.id, updatedAt: submittedAt } : prior);
      const superseded = this.getChangeRequests().find((prior) => prior.id === input.supersedesRequestId)!;
      recordChangeReview({ changeRequestId: superseded.id, decision: "cancelled", actorType: "customer", actorId: membership.accountId, note: `Superseded by ${row.id}.`, baseRevisionId: superseded.baseRevisionId, currentRevisionId: head.externalRevisionId });
    }
    write(KEYS.changeRequests, [row, ...priorRequests]);
    recordChangeReview({ changeRequestId: row.id, decision: "submitted", actorType: "customer", actorId: membership.accountId, note: "Customer proposal submitted against an explicit authoritative base revision.", baseRevisionId: row.baseRevisionId, currentRevisionId: head.externalRevisionId });
    platformStore.addAudit("Customer", "Website change request submitted", row.resourceId, "NEXT F Digital", `Change request ${row.id}; capability ${row.capabilityId}; base revision ${row.baseRevisionId}; ${row.proposedChanges.length} proposed field change(s). Published/authoritative state was not replaced.`, "info");
    return row;
  },

  startChangeReview(id: string, staffActorId: string) {
    const current = this.getChangeRequests().find((row) => row.id === id);
    if (!current || current.status !== "submitted") throw new Error("Only a newly submitted proposal can enter staff review; changes-requested proposals require a new superseding submission");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    const head = requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId);
    if (head.externalRevisionId !== current.baseRevisionId) {
      const rows = this.getChangeRequests().map((row) => row.id === id ? { ...row, status: "conflict" as const, updatedAt: now() } : row);
      write(KEYS.changeRequests, rows);
      recordChangeReview({ changeRequestId: id, decision: "conflict", actorType: "system", actorId: "system", note: "Proposal became stale before review started.", baseRevisionId: current.baseRevisionId, currentRevisionId: head.externalRevisionId });
      throw new Error("Change request is stale because the authoritative resource revision changed");
    }
    const rows = this.getChangeRequests().map((row) => row.id === id ? { ...row, status: "in_review" as const, reviewerId: staffActorId, reviewStartedAt: now(), updatedAt: now() } : row);
    write(KEYS.changeRequests, rows);
    recordChangeReview({ changeRequestId: id, decision: "review_started", actorType: "staff", actorId: staffActorId, baseRevisionId: current.baseRevisionId, currentRevisionId: head.externalRevisionId });
    return rows.find((row) => row.id === id)!;
  },

  requestChanges(id: string, staffActorId: string, note: string) {
    const current = this.getChangeRequests().find((row) => row.id === id);
    if (!current || current.status !== "in_review") throw new Error("Only an in-review proposal can be returned for changes");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    if (!note.trim()) throw new Error("Requesting changes requires a reviewer note");
    const rows = this.getChangeRequests().map((row) => row.id === id ? { ...row, status: "changes_requested" as const, updatedAt: now() } : row);
    write(KEYS.changeRequests, rows);
    recordChangeReview({ changeRequestId: id, decision: "changes_requested", actorType: "staff", actorId: staffActorId, note: note.trim(), baseRevisionId: current.baseRevisionId, currentRevisionId: requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId).externalRevisionId });
    platformStore.addAudit("Admin", "Website change request returned for changes", current.resourceId, "NEXT F Digital", `Change request ${id}: ${note.trim()}`, "warning");
    return rows.find((row) => row.id === id)!;
  },

  approveChange(id: string, staffActorId: string, note?: string) {
    const current = this.getChangeRequests().find((row) => row.id === id);
    if (!current || current.status !== "in_review") throw new Error("Only an in-review proposal can be approved");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    const head = requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId);
    if (head.externalRevisionId !== current.baseRevisionId) {
      const rows = this.getChangeRequests().map((row) => row.id === id ? { ...row, status: "conflict" as const, updatedAt: now() } : row);
      write(KEYS.changeRequests, rows);
      recordChangeReview({ changeRequestId: id, decision: "conflict", actorType: "system", actorId: "system", note: "Authoritative resource changed during review; approval blocked.", baseRevisionId: current.baseRevisionId, currentRevisionId: head.externalRevisionId });
      throw new Error("Approval blocked because the proposal base revision is stale");
    }
    const approvedAt = now();
    const rows = this.getChangeRequests().map((row) => row.id === id ? { ...row, status: "approved" as const, approvedAt, updatedAt: approvedAt } : row);
    write(KEYS.changeRequests, rows);
    recordChangeReview({ changeRequestId: id, decision: "approved", actorType: "staff", actorId: staffActorId, note: note?.trim() || "Approved for application. Approval does not apply or publish the change.", baseRevisionId: current.baseRevisionId, currentRevisionId: head.externalRevisionId });
    platformStore.addAudit("Admin", "Website change request approved", current.resourceId, "NEXT F Digital", `Change request ${id} approved against revision ${current.baseRevisionId}. Approval does not mutate the website and does not publish.`, "info");
    return rows.find((row) => row.id === id)!;
  },

  rejectChange(id: string, staffActorId: string, note: string) {
    const current = this.getChangeRequests().find((row) => row.id === id);
    if (!current || !["submitted", "in_review", "changes_requested"].includes(current.status)) throw new Error("Change request cannot be rejected from its current state");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    if (!note.trim()) throw new Error("Rejecting a change request requires a reviewer note");
    const updatedAt = now();
    const rows = this.getChangeRequests().map((row) => row.id === id ? { ...row, status: "rejected" as const, updatedAt } : row);
    write(KEYS.changeRequests, rows);
    recordChangeReview({ changeRequestId: id, decision: "rejected", actorType: "staff", actorId: staffActorId, note: note.trim(), baseRevisionId: current.baseRevisionId, currentRevisionId: requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId).externalRevisionId });
    platformStore.addAudit("Admin", "Website change request rejected", current.resourceId, "NEXT F Digital", `Change request ${id}: ${note.trim()}`, "warning");
    return rows.find((row) => row.id === id)!;
  },

  recordApplicationReceipt(id: string, input: { adapterReceiptId: string; expectedBaseRevisionId: string; resultingRevisionId: string; resultingContentHash: string; appliedBy: string }) {
    const current = this.getChangeRequests().find((row) => row.id === id);
    if (!current || current.status !== "approved") throw new Error("Only an approved change request can receive an application receipt");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    const { connection } = requireCurrentCapability(current.siteConnectionId, current.capabilityId);
    const head = requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId);
    if (input.expectedBaseRevisionId !== current.baseRevisionId || head.externalRevisionId !== current.baseRevisionId) throw new Error("Application receipt rejected because optimistic concurrency base revision no longer matches");
    if (!input.adapterReceiptId.trim() || !input.resultingRevisionId.trim() || !input.resultingContentHash.trim()) throw new Error("Application adapter receipt, resulting revision ID, and content hash are required");
    assertExternalRevisionIntegrity(current.siteConnectionId, current.capabilityId, current.resourceId, input.resultingRevisionId.trim(), input.resultingContentHash.trim());
    const appliedAt = now();
    const evidence: ManagedResourceRevisionEvidenceRecord = { id: uid("resource_revision"), siteConnectionId: current.siteConnectionId, capabilityId: current.capabilityId, resourceId: current.resourceId, externalRevisionId: input.resultingRevisionId.trim(), contentHash: input.resultingContentHash.trim(), validationEvidenceId: connection.validationEvidenceId!, source: "approved_change_application", sourceReference: input.adapterReceiptId.trim(), observedBy: input.appliedBy, observedAt: appliedAt };
    write(KEYS.revisionEvidence, [evidence, ...this.getRevisionEvidence()]);
    const headRecord: ManagedResourceHeadRecord = { ...head, revisionEvidenceId: evidence.id, externalRevisionId: evidence.externalRevisionId, contentHash: evidence.contentHash, updatedAt: appliedAt };
    write(KEYS.resourceHeads, [headRecord, ...this.getResourceHeads().filter((row) => row.resourceKey !== head.resourceKey)]);
    const receipt: ChangeApplicationReceiptRecord = { id: uid("change_application_receipt"), changeRequestId: id, adapterReceiptId: input.adapterReceiptId.trim(), siteConnectionId: current.siteConnectionId, resourceId: current.resourceId, expectedBaseRevisionId: current.baseRevisionId, resultingRevisionId: evidence.externalRevisionId, resultingContentHash: evidence.contentHash, appliedBy: input.appliedBy, appliedAt };
    write(KEYS.applicationReceipts, [receipt, ...this.getApplicationReceipts()]);
    const rows = this.getChangeRequests().map((row) => row.id === id ? { ...row, status: "applied" as const, appliedAt, resultingRevisionId: evidence.externalRevisionId, updatedAt: appliedAt } : row);
    write(KEYS.changeRequests, rows);
    recordChangeReview({ changeRequestId: id, decision: "applied", actorType: "system", actorId: input.appliedBy, note: `Application adapter receipt ${receipt.adapterReceiptId}.`, baseRevisionId: current.baseRevisionId, currentRevisionId: evidence.externalRevisionId, resultingRevisionId: evidence.externalRevisionId });
    markConflictsForHead(headRecord, id);
    platformStore.addAudit("System", "Approved website change applied", current.resourceId, "NEXT F Digital", `Change request ${id}; ${current.baseRevisionId} → ${evidence.externalRevisionId}; adapter receipt ${receipt.adapterReceiptId}. Publication remains a separate governed action.`, "info");
    return receipt;
  },

  submitPublishRequest(input: { membershipId: string; siteConnectionId: string; capabilityId: string; resourceId: string; targetRevisionId: string; resourceState: ResourceStateAuthorization; supersedesRequestId?: string }) {
    const { connection } = requireCurrentCapability(input.siteConnectionId, input.capabilityId);
    const workspace = websitePlatformStore.getWorkspaces().find((row) => row.id === connection.workspaceId);
    if (!workspace) throw new Error("Customer Workspace not found");
    const membership = requireMembership(input.membershipId, workspace.id);
    const head = requireResourceHead(input.siteConnectionId, input.capabilityId, input.resourceId);
    if (head.externalRevisionId !== input.targetRevisionId) throw new Error("Publication target revision is stale; refresh before requesting publication");
    const decision = customerCapabilityPolicyStore.evaluate({ membershipId: input.membershipId, siteConnectionId: input.siteConnectionId, capabilityId: input.capabilityId, operation: "publish", resourceState: input.resourceState });
    if (!decision.allowed || !["publish_request", "direct_publish"].includes(decision.executionPath)) throw new Error("Customer publishing is not authorized for this capability and resource state");
    if (input.supersedesRequestId) {
      const prior = this.getPublishRequests().find((row) => row.id === input.supersedesRequestId && row.membershipId === input.membershipId && row.status === "changes_requested");
      if (!prior) throw new Error("Superseded publication request must be changes-requested and belong to the same membership");
    }
    const submittedAt = now();
    const direct = decision.executionPath === "direct_publish";
    const row: CustomerPublishRequestRecord = { id: uid("publish_request"), membershipId: membership.id, workspaceId: workspace.id, accountId: membership.accountId, siteConnectionId: input.siteConnectionId, capabilityId: input.capabilityId, resourceId: input.resourceId, validationEvidenceId: connection.validationEvidenceId!, targetRevisionId: head.externalRevisionId, targetContentHash: head.contentHash, reviewMode: direct ? "direct_authorized" : "staff_approval", status: direct ? "authorized" : "submitted", submittedAt, updatedAt: submittedAt, approvedAt: direct ? submittedAt : undefined, supersedesRequestId: input.supersedesRequestId };
    let priorPublishes = this.getPublishRequests();
    if (input.supersedesRequestId) {
      priorPublishes = priorPublishes.map((prior) => prior.id === input.supersedesRequestId ? { ...prior, status: "cancelled" as const, supersededByRequestId: row.id, updatedAt: submittedAt } : prior);
      const superseded = this.getPublishRequests().find((prior) => prior.id === input.supersedesRequestId)!;
      recordPublishReview({ publishRequestId: superseded.id, decision: "cancelled", actorType: "customer", actorId: membership.accountId, note: `Superseded by ${row.id}.`, targetRevisionId: superseded.targetRevisionId, currentRevisionId: head.externalRevisionId });
    }
    write(KEYS.publishRequests, [row, ...priorPublishes]);
    recordPublishReview({ publishRequestId: row.id, decision: direct ? "authorized" : "submitted", actorType: "customer", actorId: membership.accountId, note: direct ? "Policy authorizes direct publication, but adapter execution and receipt remain separate." : "Customer requested publication; staff approval is required before execution.", targetRevisionId: row.targetRevisionId, currentRevisionId: head.externalRevisionId });
    platformStore.addAudit("Customer", direct ? "Website direct publication authorized" : "Website publication requested", row.resourceId, "NEXT F Digital", `Publish request ${row.id}; revision ${row.targetRevisionId}; mode ${row.reviewMode}. Authorization/approval does not equal publication.`, "info");
    return row;
  },

  startPublishReview(id: string, staffActorId: string) {
    const current = this.getPublishRequests().find((row) => row.id === id);
    if (!current || current.reviewMode !== "staff_approval" || current.status !== "submitted") throw new Error("Only a newly submitted staff-approval publication request can enter review; changes-requested publication requires a new superseding request");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    const head = requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId);
    if (head.externalRevisionId !== current.targetRevisionId) {
      const rows = this.getPublishRequests().map((row) => row.id === id ? { ...row, status: "conflict" as const, updatedAt: now() } : row);
      write(KEYS.publishRequests, rows);
      recordPublishReview({ publishRequestId: id, decision: "conflict", actorType: "system", actorId: "system", note: "Publication target is no longer the authoritative head revision.", targetRevisionId: current.targetRevisionId, currentRevisionId: head.externalRevisionId });
      throw new Error("Publication request is stale because the authoritative resource revision changed");
    }
    const rows = this.getPublishRequests().map((row) => row.id === id ? { ...row, status: "in_review" as const, reviewerId: staffActorId, reviewStartedAt: now(), updatedAt: now() } : row);
    write(KEYS.publishRequests, rows);
    recordPublishReview({ publishRequestId: id, decision: "review_started", actorType: "staff", actorId: staffActorId, targetRevisionId: current.targetRevisionId, currentRevisionId: head.externalRevisionId });
    return rows.find((row) => row.id === id)!;
  },

  approvePublishRequest(id: string, staffActorId: string, note?: string) {
    const current = this.getPublishRequests().find((row) => row.id === id);
    if (!current || current.reviewMode !== "staff_approval" || current.status !== "in_review") throw new Error("Only an in-review staff-approval publication request can be approved");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    const head = requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId);
    if (head.externalRevisionId !== current.targetRevisionId) throw new Error("Publication approval blocked because target revision is stale");
    const approvedAt = now();
    const rows = this.getPublishRequests().map((row) => row.id === id ? { ...row, status: "approved" as const, approvedAt, updatedAt: approvedAt } : row);
    write(KEYS.publishRequests, rows);
    recordPublishReview({ publishRequestId: id, decision: "approved", actorType: "staff", actorId: staffActorId, note: note?.trim() || "Approved for publication execution. Approval does not itself publish.", targetRevisionId: current.targetRevisionId, currentRevisionId: head.externalRevisionId });
    platformStore.addAudit("Admin", "Website publication request approved", current.resourceId, "NEXT F Digital", `Publish request ${id}; revision ${current.targetRevisionId}. Publishing still requires a separate adapter execution receipt.`, "info");
    return rows.find((row) => row.id === id)!;
  },

  requestPublishChanges(id: string, staffActorId: string, note: string) {
    const current = this.getPublishRequests().find((row) => row.id === id);
    if (!current || current.reviewMode !== "staff_approval" || current.status !== "in_review") throw new Error("Only an in-review publication request can be returned for changes");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    if (!note.trim()) throw new Error("Requesting publication changes requires a reviewer note");
    const rows = this.getPublishRequests().map((row) => row.id === id ? { ...row, status: "changes_requested" as const, updatedAt: now() } : row);
    write(KEYS.publishRequests, rows);
    recordPublishReview({ publishRequestId: id, decision: "changes_requested", actorType: "staff", actorId: staffActorId, note: note.trim(), targetRevisionId: current.targetRevisionId, currentRevisionId: requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId).externalRevisionId });
    platformStore.addAudit("Admin", "Website publication request returned for changes", current.resourceId, "NEXT F Digital", `Publish request ${id}: ${note.trim()}`, "warning");
    return rows.find((row) => row.id === id)!;
  },

  rejectPublishRequest(id: string, staffActorId: string, note: string) {
    const current = this.getPublishRequests().find((row) => row.id === id);
    if (!current || current.reviewMode !== "staff_approval" || !["submitted", "in_review", "changes_requested"].includes(current.status)) throw new Error("Publication request cannot be rejected from its current state");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    if (!note.trim()) throw new Error("Rejecting a publication request requires a reviewer note");
    const updatedAt = now();
    const rows = this.getPublishRequests().map((row) => row.id === id ? { ...row, status: "rejected" as const, updatedAt } : row);
    write(KEYS.publishRequests, rows);
    recordPublishReview({ publishRequestId: id, decision: "rejected", actorType: "staff", actorId: staffActorId, note: note.trim(), targetRevisionId: current.targetRevisionId, currentRevisionId: requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId).externalRevisionId });
    platformStore.addAudit("Admin", "Website publication request rejected", current.resourceId, "NEXT F Digital", `Publish request ${id}: ${note.trim()}`, "warning");
    return rows.find((row) => row.id === id)!;
  },

  recordPublishingReceipt(id: string, input: { adapterReceiptId: string; publicationReference: string; publishedRevisionId: string; publishedContentHash: string; publishedBy: string }) {
    const current = this.getPublishRequests().find((row) => row.id === id);
    if (!current || !["approved", "authorized"].includes(current.status)) throw new Error("Publication execution requires either staff approval or direct-publish authorization");
    requireRequestValidationCurrent(current.siteConnectionId, current.validationEvidenceId);
    const head = requireResourceHead(current.siteConnectionId, current.capabilityId, current.resourceId);
    if (head.externalRevisionId !== current.targetRevisionId || input.publishedRevisionId !== current.targetRevisionId || input.publishedContentHash !== current.targetContentHash) throw new Error("Publishing receipt rejected because target revision/hash no longer matches the authoritative resource head");
    if (!input.adapterReceiptId.trim() || !input.publicationReference.trim()) throw new Error("Publishing adapter receipt and publication reference are required");
    const publishedAt = now();
    const receipt: PublishingReceiptRecord = { id: uid("publishing_receipt"), publishRequestId: id, adapterReceiptId: input.adapterReceiptId.trim(), publicationReference: input.publicationReference.trim(), siteConnectionId: current.siteConnectionId, resourceId: current.resourceId, publishedRevisionId: current.targetRevisionId, publishedContentHash: current.targetContentHash, publishedBy: input.publishedBy, publishedAt };
    write(KEYS.publishingReceipts, [receipt, ...this.getPublishingReceipts()]);
    const rows = this.getPublishRequests().map((row) => row.id === id ? { ...row, status: "published" as const, publishedAt, updatedAt: publishedAt } : row);
    write(KEYS.publishRequests, rows);
    recordPublishReview({ publishRequestId: id, decision: "published", actorType: "system", actorId: input.publishedBy, note: `Publishing adapter receipt ${receipt.adapterReceiptId}; publication ${receipt.publicationReference}.`, targetRevisionId: current.targetRevisionId, currentRevisionId: head.externalRevisionId });
    platformStore.addAudit("System", "Website revision published", current.resourceId, "NEXT F Digital", `Publish request ${id}; revision ${current.targetRevisionId}; publication ${receipt.publicationReference}; adapter receipt ${receipt.adapterReceiptId}.`, "info");
    return receipt;
  },
};

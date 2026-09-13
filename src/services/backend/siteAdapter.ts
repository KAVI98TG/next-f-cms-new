export type ManagedSiteAdapterContext = {
  siteConnectionId: string;
  validationEvidenceId: string;
  correlationId: string;
  credentialReference: string;
};

export type ManagedSiteResourceRevision = {
  capabilityId: string;
  resourceId: string;
  externalRevisionId: string;
  contentHash: string;
  observedAt: string;
};

export type ApplyApprovedChangeInput = ManagedSiteAdapterContext & {
  changeRequestId: string;
  capabilityId: string;
  resourceId: string;
  expectedBaseRevisionId: string;
  expectedBaseContentHash: string;
  changes: Array<{ fieldPath: string; proposedValue: unknown }>;
};

export type ApplyApprovedChangeResult = {
  adapterReceiptId: string;
  resultingRevisionId: string;
  resultingContentHash: string;
  appliedAt: string;
};

export type PublishManagedRevisionInput = ManagedSiteAdapterContext & {
  publishRequestId: string;
  capabilityId: string;
  resourceId: string;
  targetRevisionId: string;
  targetContentHash: string;
};

export type PublishManagedRevisionResult = {
  adapterReceiptId: string;
  publicationReference: string;
  publishedRevisionId: string;
  publishedContentHash: string;
  publishedAt: string;
};

export type ManagedSiteHealthResult = {
  reachable: boolean;
  contractVersion?: string;
  manifestHash?: string;
  checkedAt: string;
  detail: string;
};

export interface ManagedSiteAdapter {
  observeResource(context: ManagedSiteAdapterContext, capabilityId: string, resourceId: string): Promise<ManagedSiteResourceRevision>;
  applyApprovedChange(input: ApplyApprovedChangeInput): Promise<ApplyApprovedChangeResult>;
  publishRevision(input: PublishManagedRevisionInput): Promise<PublishManagedRevisionResult>;
  checkHealth(context: ManagedSiteAdapterContext): Promise<ManagedSiteHealthResult>;
}

export interface ManagedSiteAdapterRegistry {
  resolve(siteConnectionId: string): Promise<{ adapter: ManagedSiteAdapter; credentialReference: string } | undefined>;
}

export const MANAGED_SITE_ADAPTER_RULES = [
  "Adapter credentials are server-side references; secrets must never be returned to either frontend.",
  "Every mutation pins the current Site Contract/Manifest validation evidence.",
  "Apply uses optimistic concurrency against the expected base revision and content hash.",
  "Publishing is a separate adapter operation and must return an immutable receipt.",
  "Adapter failures do not mutate workflow state into success without a valid receipt.",
] as const;

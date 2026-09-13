import { platformStore } from "../../platform/services/platformStore";
import { SITE_MANIFEST_FILENAME, WEBSITE_CONTRACT_VERSION, websitePlatformStore, type SiteConnectionRecord } from "./websitePlatformStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export const CONTRACT_REGISTRY_HUB = "https://contracts.nextf.lk/";

export type RegistrySnapshotStatus = "staged" | "trusted" | "rejected";
export type RegistryVerificationAuthority = "registry_cli" | "immutable_registry_api";
export type RegistrySourceKind = "local_snapshot" | "immutable_registry_api";
export type CompatibilityStatus = "unknown" | "compatible" | "incompatible";
export type ManifestEvidenceStatus = "received" | "validating" | "valid" | "invalid" | "incompatible";

export type RegistrySnapshotRecord = {
  id: string;
  contractVersion: string;
  sourceKind: RegistrySourceKind;
  sourceReference: string;
  immutableReference?: string;
  contentHash?: string;
  status: RegistrySnapshotStatus;
  verificationAuthority?: RegistryVerificationAuthority;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type ManifestEvidenceRecord = {
  id: string;
  siteConnectionId: string;
  filename: string;
  rawJson: string;
  receivedAt: string;
  receivedBy: string;
  status: ManifestEvidenceStatus;
  registrySnapshotId?: string;
  compatibilityStatus: CompatibilityStatus;
  issues: string[];
  lastValidatedAt?: string;
  validationEvidenceId?: string;
  updatedAt: string;
};

export type CanonicalResolutionSummary = {
  moduleIds: string[];
  capabilityIds: string[];
  apiOperationIds: string[];
  permissionIds: string[];
  eventIds: string[];
  webhookIds: string[];
  integrationIds: string[];
  adminProfileIds: string[];
  customerCmsProfileIds: string[];
};

export type ContractValidationEvidenceRecord = {
  id: string;
  siteConnectionId: string;
  manifestEvidenceId: string;
  registrySnapshotId: string;
  contractVersion: string;
  schemaValid: boolean;
  manifestContractVersion: string;
  compatibilityStatus: Exclude<CompatibilityStatus, "unknown">;
  unknownModuleIds: string[];
  unknownCapabilityIds: string[];
  issues: string[];
  resolution: CanonicalResolutionSummary;
  verificationAuthority: RegistryVerificationAuthority;
  verifiedAt: string;
  verifiedBy: string;
};

export type ContractValidationResultInput = Omit<ContractValidationEvidenceRecord, "id" | "verifiedAt">;

const KEYS = {
  snapshots: "nextf.v0.15.contract-registry.snapshots",
  manifests: "nextf.v0.15.contract-registry.manifests",
  validationEvidence: "nextf.v0.15.contract-registry.validation-evidence",
};

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:website-platform", { detail: key }));
  return result;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const timestamp = () => new Date().toISOString();

function requireSiteConnection(id: string): SiteConnectionRecord {
  const connection = websitePlatformStore.getSiteConnections().find((row) => row.id === id);
  if (!connection) throw new Error("Managed Site Connection not found");
  return connection;
}

function emptyResolution(): CanonicalResolutionSummary {
  return {
    moduleIds: [],
    capabilityIds: [],
    apiOperationIds: [],
    permissionIds: [],
    eventIds: [],
    webhookIds: [],
    integrationIds: [],
    adminProfileIds: [],
    customerCmsProfileIds: [],
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeResolution(input: CanonicalResolutionSummary): CanonicalResolutionSummary {
  return {
    moduleIds: unique(input.moduleIds),
    capabilityIds: unique(input.capabilityIds),
    apiOperationIds: unique(input.apiOperationIds),
    permissionIds: unique(input.permissionIds),
    eventIds: unique(input.eventIds),
    webhookIds: unique(input.webhookIds),
    integrationIds: unique(input.integrationIds),
    adminProfileIds: unique(input.adminProfileIds),
    customerCmsProfileIds: unique(input.customerCmsProfileIds),
  };
}

export const contractRegistryStore = {
  getSnapshots: () => read<RegistrySnapshotRecord[]>(KEYS.snapshots, []),
  getManifestEvidence: () => read<ManifestEvidenceRecord[]>(KEYS.manifests, []),
  getValidationEvidence: () => read<ContractValidationEvidenceRecord[]>(KEYS.validationEvidence, []),

  getTrustedSnapshot(contractVersion = WEBSITE_CONTRACT_VERSION) {
    return this.getSnapshots().find((row) => row.contractVersion === contractVersion && row.status === "trusted");
  },

  getRegistryReadiness(contractVersion = WEBSITE_CONTRACT_VERSION) {
    const trusted = this.getTrustedSnapshot(contractVersion);
    return {
      contractVersion,
      ready: Boolean(trusted),
      snapshot: trusted,
      reason: trusted
        ? `Trusted immutable Registry evidence is available from ${trusted.verificationAuthority}.`
        : `Contract Registry ${contractVersion} is not available to this development environment. Canonical mapping remains fail-closed.`,
    };
  },

  stageRegistrySnapshot(input: { contractVersion: string; sourceKind: RegistrySourceKind; sourceReference: string; immutableReference?: string; contentHash?: string }) {
    if (input.contractVersion !== WEBSITE_CONTRACT_VERSION) throw new Error(`Only exact Contract Version ${WEBSITE_CONTRACT_VERSION} is accepted by this CMS release`);
    if (!input.sourceReference.trim()) throw new Error("Registry source reference is required");
    const now = timestamp();
    const row: RegistrySnapshotRecord = {
      id: uid("registry_snapshot"),
      contractVersion: input.contractVersion,
      sourceKind: input.sourceKind,
      sourceReference: input.sourceReference.trim(),
      immutableReference: input.immutableReference?.trim() || undefined,
      contentHash: input.contentHash?.trim() || undefined,
      status: "staged",
      createdAt: now,
      updatedAt: now,
    };
    write(KEYS.snapshots, [row, ...this.getSnapshots()]);
    platformStore.addAudit("System", "Contract Registry snapshot staged", row.contractVersion, "NEXT F Digital", "Registry evidence was staged only; it is not trusted until verified by the official Registry CLI or immutable Registry API.", "info");
    return row;
  },

  trustRegistrySnapshot(id: string, input: { verificationAuthority: RegistryVerificationAuthority; verifiedBy: string; immutableReference: string; contentHash: string }) {
    const current = this.getSnapshots().find((row) => row.id === id);
    if (!current) throw new Error("Registry snapshot evidence not found");
    if (current.contractVersion !== WEBSITE_CONTRACT_VERSION) throw new Error("Registry snapshot version does not match this CMS release");
    if (!input.immutableReference.trim() || !input.contentHash.trim()) throw new Error("Trusted Registry evidence requires an immutable reference and content hash");
    if (!input.verifiedBy.trim()) throw new Error("Trusted Registry evidence requires verifier identity");
    const conflictingTrusted = this.getSnapshots().find((row) => row.id !== id && row.contractVersion === current.contractVersion && row.status === "trusted" && row.contentHash && row.contentHash !== input.contentHash.trim());
    if (conflictingTrusted) throw new Error(`Immutable Contract Registry drift detected for ${current.contractVersion}; a different trusted content hash already exists`);
    const now = timestamp();
    const rows = this.getSnapshots().map((row) => row.id === id ? {
      ...row,
      status: "trusted" as const,
      verificationAuthority: input.verificationAuthority,
      verifiedAt: now,
      verifiedBy: input.verifiedBy,
      immutableReference: input.immutableReference.trim(),
      contentHash: input.contentHash.trim(),
      rejectionReason: undefined,
      updatedAt: now,
    } : row);
    write(KEYS.snapshots, rows);
    const updated = rows.find((row) => row.id === id)!;
    platformStore.addAudit("System", "Contract Registry snapshot trusted", updated.contractVersion, "NEXT F Digital", `Verified by ${input.verificationAuthority}; immutable Registry evidence recorded.`, "info");
    return updated;
  },

  rejectRegistrySnapshot(id: string, reason: string) {
    const current = this.getSnapshots().find((row) => row.id === id);
    if (!current) throw new Error("Registry snapshot evidence not found");
    const now = timestamp();
    const rows = this.getSnapshots().map((row) => row.id === id ? { ...row, status: "rejected" as const, rejectionReason: reason.trim() || "Registry verification failed.", updatedAt: now } : row);
    write(KEYS.snapshots, rows);
    const updated = rows.find((row) => row.id === id)!;
    platformStore.addAudit("System", "Contract Registry snapshot rejected", updated.contractVersion, "NEXT F Digital", updated.rejectionReason ?? "Registry verification failed.", "warning");
    return updated;
  },

  receiveManifest(siteConnectionId: string, rawJson: string, receivedBy: string) {
    const connection = requireSiteConnection(siteConnectionId);
    if (connection.status === "revoked") throw new Error("Manifest evidence cannot be received for a revoked Site Connection");
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error(`${SITE_MANIFEST_FILENAME} must contain valid JSON before it can be staged`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${SITE_MANIFEST_FILENAME} root must be a JSON object`);
    const now = timestamp();
    const row: ManifestEvidenceRecord = {
      id: uid("manifest_evidence"),
      siteConnectionId,
      filename: SITE_MANIFEST_FILENAME,
      rawJson,
      receivedAt: now,
      receivedBy,
      status: "received",
      compatibilityStatus: "unknown",
      issues: ["JSON syntax accepted. Canonical schema/version/modules/capabilities remain untrusted until validated against a trusted Contract Registry snapshot."],
      updatedAt: now,
    };
    write(KEYS.manifests, [row, ...this.getManifestEvidence()]);
    websitePlatformStore.transitionSiteConnection(siteConnectionId, "manifest_received", { manifestStatus: "received", lastValidatedAt: undefined });
    platformStore.addAudit("Admin", "Site Manifest evidence received", connection.siteId, "NEXT F Digital", `${SITE_MANIFEST_FILENAME} JSON was staged. Canonical validation has not yet succeeded.`, "info");
    return row;
  },

  beginValidation(siteConnectionId: string, actorId: string) {
    const connection = requireSiteConnection(siteConnectionId);
    const manifest = this.getManifestEvidence().find((row) => row.siteConnectionId === siteConnectionId);
    if (!manifest) throw new Error(`Receive ${SITE_MANIFEST_FILENAME} before validation`);
    const snapshot = this.getTrustedSnapshot(connection.contractVersion);
    if (!snapshot) throw new Error(`A trusted immutable Contract Registry ${connection.contractVersion} snapshot is required before validation`);
    if (connection.status !== "manifest_received" && connection.status !== "incompatible") throw new Error(`Site Connection cannot enter validation from ${connection.status}`);
    const now = timestamp();
    const rows = this.getManifestEvidence().map((row) => row.id === manifest.id ? { ...row, status: "validating" as const, registrySnapshotId: snapshot.id, issues: [], updatedAt: now } : row);
    write(KEYS.manifests, rows);
    websitePlatformStore.transitionSiteConnection(siteConnectionId, "validating", { manifestStatus: "validating" });
    platformStore.addAudit("Admin", "Site Manifest validation started", connection.siteId, "NEXT F Digital", `Validation started against trusted Contract Registry ${snapshot.contractVersion} evidence ${snapshot.id}. Actor ${actorId}.`, "info");
    return rows.find((row) => row.id === manifest.id)!;
  },

  applyValidationResult(input: ContractValidationResultInput) {
    const connection = requireSiteConnection(input.siteConnectionId);
    const manifest = this.getManifestEvidence().find((row) => row.id === input.manifestEvidenceId && row.siteConnectionId === input.siteConnectionId);
    const snapshot = this.getSnapshots().find((row) => row.id === input.registrySnapshotId);
    if (!manifest) throw new Error("Manifest evidence does not match the Site Connection");
    if (!snapshot || snapshot.status !== "trusted") throw new Error("Validation result must reference a trusted Registry snapshot");
    if (connection.status !== "validating" || manifest.status !== "validating") throw new Error("Canonical validation results are accepted only for the Site Connection and Manifest currently in validating state");
    if (manifest.registrySnapshotId !== snapshot.id) throw new Error("Validation result Registry snapshot does not match the snapshot bound when validation started");
    if (snapshot.contractVersion !== connection.contractVersion || input.contractVersion !== connection.contractVersion) throw new Error("Validation evidence contract version does not match the Site Connection pin");
    if (input.verificationAuthority !== snapshot.verificationAuthority) throw new Error("Validation evidence authority does not match trusted Registry evidence");

    const normalizedResolution = normalizeResolution(input.resolution ?? emptyResolution());
    const issues = unique([
      ...input.issues,
      ...(!input.schemaValid ? ["Canonical Site Manifest schema validation failed."] : []),
    ]);
    const unknownModules = unique(input.unknownModuleIds);
    const unknownCapabilities = unique(input.unknownCapabilityIds);
    const exactVersion = input.manifestContractVersion === connection.contractVersion;
    const valid = input.schemaValid && exactVersion && input.compatibilityStatus === "compatible" && unknownModules.length === 0 && unknownCapabilities.length === 0 && issues.length === 0;
    const now = timestamp();
    const evidence: ContractValidationEvidenceRecord = {
      ...input,
      id: uid("contract_validation"),
      resolution: normalizedResolution,
      unknownModuleIds: unknownModules,
      unknownCapabilityIds: unknownCapabilities,
      issues,
      verifiedAt: now,
    };
    write(KEYS.validationEvidence, [evidence, ...this.getValidationEvidence()]);

    const nextManifestStatus: ManifestEvidenceStatus = valid ? "valid" : input.compatibilityStatus === "incompatible" || !exactVersion ? "incompatible" : "invalid";
    const manifestRows = this.getManifestEvidence().map((row) => row.id === manifest.id ? {
      ...row,
      status: nextManifestStatus,
      compatibilityStatus: input.compatibilityStatus,
      issues: valid ? [] : unique([
        ...issues,
        ...(!exactVersion ? [`Manifest Contract Version ${input.manifestContractVersion} does not match ${connection.contractVersion}.`] : []),
        ...(unknownModules.length ? [`Unknown Module IDs: ${unknownModules.join(", ")}`] : []),
        ...(unknownCapabilities.length ? [`Unknown Capability IDs: ${unknownCapabilities.join(", ")}`] : []),
      ]),
      registrySnapshotId: snapshot.id,
      validationEvidenceId: evidence.id,
      lastValidatedAt: now,
      updatedAt: now,
    } : row);
    write(KEYS.manifests, manifestRows);

    if (valid) websitePlatformStore.transitionSiteConnection(connection.id, "ready", { manifestStatus: "valid", lastValidatedAt: now, registrySnapshotId: snapshot.id, validationEvidenceId: evidence.id });
    else websitePlatformStore.transitionSiteConnection(connection.id, "incompatible", { manifestStatus: nextManifestStatus === "invalid" ? "invalid" : "incompatible", lastValidatedAt: now, registrySnapshotId: snapshot.id, validationEvidenceId: evidence.id });

    platformStore.addAudit("System", valid ? "Site Manifest validation passed" : "Site Manifest validation blocked", connection.siteId, "NEXT F Digital", valid ? `Canonical Contract ${connection.contractVersion} resolution is ready; ${normalizedResolution.moduleIds.length} module(s) and ${normalizedResolution.capabilityIds.length} capability(s) resolved.` : "Site connection remains fail-closed because canonical validation did not pass.", valid ? "info" : "warning");
    return evidence;
  },

  connectReadySite(siteConnectionId: string, actorId: string) {
    const connection = requireSiteConnection(siteConnectionId);
    if (connection.status !== "ready" || connection.manifestStatus !== "valid") throw new Error("Only a canonically validated ready Site Connection can be connected");
    const updated = websitePlatformStore.transitionSiteConnection(siteConnectionId, "connected", {});
    platformStore.addAudit("Admin", "Managed Site connected", connection.siteId, "NEXT F Digital", `Connection activated after canonical Contract ${connection.contractVersion} validation. Actor ${actorId}.`, "info");
    return updated;
  },

  suspendSite(siteConnectionId: string, actorId: string, reason = "Site connection suspended for review.") {
    const connection = requireSiteConnection(siteConnectionId);
    if (!["ready", "connected", "incompatible"].includes(connection.status)) throw new Error(`Site Connection cannot be suspended from ${connection.status}`);
    const updated = websitePlatformStore.transitionSiteConnection(siteConnectionId, "suspended", {});
    platformStore.addAudit("Admin", "Managed Site connection suspended", connection.siteId, "NEXT F Digital", `${reason} Actor ${actorId}.`, "warning");
    return updated;
  },

  revokeSite(siteConnectionId: string, actorId: string, reason = "Managed Site connection revoked.") {
    const connection = requireSiteConnection(siteConnectionId);
    if (connection.status === "revoked") return connection;
    const updated = websitePlatformStore.transitionSiteConnection(siteConnectionId, "revoked", {});
    platformStore.addAudit("Admin", "Managed Site connection revoked", connection.siteId, "NEXT F Digital", `${reason} Actor ${actorId}.`, "warning");
    return updated;
  },
};

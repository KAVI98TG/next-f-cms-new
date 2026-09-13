import { useMemo, useState } from "react";
import { Activity, ArrowRight, BadgeCheck, Boxes, Building2, FileCheck2, FlaskConical, Globe2, KeyRound, Link2, Plus, RefreshCcw, ShieldAlert, ShieldCheck, SlidersHorizontal, UserCheck, UsersRound, Wrench } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, MetricCard, Modal, PageToolbar, SectionHeader, SelectInput, TextInput, type DataTableColumn } from "../../shared/components";
import { useToast } from "../../shared/feedback/ToastProvider";
import { useSession } from "../../app/auth/SessionProvider";
import { customerAccessStore, type CustomerMembershipRecord, type CustomerRoleRecord } from "../../platform/customer-access/customerAccessStore";
import { useCustomerAccessStore } from "../../platform/customer-access/useCustomerAccessStore";
import { identityStore } from "../../platform/identity/identityStore";
import { useIdentityStore } from "../../platform/identity/useIdentityStore";
import { platformOperationsStore } from "../../platform/services/platformOperationsStore";
import { usePlatformOperations } from "../../platform/shared/usePlatformOperations";
import { digitalStore } from "../data/digitalStore";
import { useDigitalStore } from "../shared/useDigitalStore";
import { WEBSITE_CONTRACT_VERSION, SITE_MANIFEST_FILENAME, websitePlatformStore, type CustomerOrganizationLinkRecord, type CustomerWorkspaceRecord, type DemoAccessRequestRecord, type LegacyPortalMigrationAssessment, type SiteConnectionRecord } from "./websitePlatformStore";
import { CONTRACT_REGISTRY_HUB, contractRegistryStore, type ContractValidationEvidenceRecord, type ManifestEvidenceRecord, type RegistrySnapshotRecord } from "./contractRegistryStore";
import { useWebsitePlatformStore } from "./useWebsitePlatformStore";
import { workspaceProvisioningStore, type DemoEnvironmentRecord, type ProvisioningActivityRecord, type WorkspaceAttachmentRecord, type WorkspaceProvisioningReview } from "./workspaceProvisioningStore";
import { customerCapabilityPolicyStore, type CustomerCapabilityPolicyRecord, type CustomerPublishingMode, type CustomerExposureMode, type CustomerRolePermissionGrantRecord, type ServiceCapabilityEntitlementRecord } from "./customerCapabilityPolicyStore";
import { changeApprovalPublishingStore, type CustomerChangeRequestRecord, type CustomerPublishRequestRecord } from "./changeApprovalPublishingStore";
import { NEXTF_PUBLIC_HOST, PUBLIC_CONVERSION_EVENTS, publicSiteIntegrationStore, type PublicProjectionPublicationRecord, type PublicRouteBindingRecord } from "./publicSiteIntegrationStore";
import { PRODUCTION_ACCEPTANCE_GATES, lifecycleGovernanceStore } from "./lifecycleGovernanceStore";
import { BACKEND_API_OPERATIONS, MANAGED_SITE_ADAPTER_RULES, PROJECTION_RULES, PUBLIC_PROJECTION_RULES, getBackendBoundaryReadiness, type ApiOperationDefinition } from "../../services/backend";

const workspaceTone = (status: CustomerWorkspaceRecord["status"]) => status === "active" ? "success" : status === "requested" || status === "provisioning" || status === "read_only" ? "warning" : status === "closed" ? "neutral" : "danger";
const demoTone = (status: DemoAccessRequestRecord["status"]) => status === "active" || status === "approved" || status === "extended" ? "success" : status === "submitted" || status === "under_review" ? "warning" : status === "rejected" || status === "revoked" ? "danger" : "neutral";
const manifestTone = (status: SiteConnectionRecord["manifestStatus"]) => status === "valid" ? "success" : status === "invalid" || status === "incompatible" ? "danger" : "warning";
const connectionTone = (status: SiteConnectionRecord["status"]) => status === "connected" || status === "ready" ? "success" : status === "revoked" || status === "incompatible" ? "danger" : status === "suspended" ? "neutral" : "warning";
const migrationTone = (status: LegacyPortalMigrationAssessment["state"]) => status === "ready_for_review" ? "success" : "warning";
const reviewTone = (status: WorkspaceProvisioningReview["status"]) => status === "completed" || status === "approved" ? "success" : status === "blocked" ? "danger" : "warning";
const environmentTone = (status: DemoEnvironmentRecord["status"]) => status === "active" ? "success" : status === "provisioning" ? "warning" : status === "revoked" ? "danger" : "neutral";

type ViewKey = "overview" | "workspaces" | "contracts" | "access-policy" | "approvals-publishing" | "backend-api" | "public-site" | "lifecycle" | "memberships" | "demo-requests" | "demo-environments" | "activity";
type AttachType = "project" | "service" | "site";

export function WebsitePlatformPage() {
  const clients = useDigitalStore(digitalStore.getClients);
  const projects = useDigitalStore(digitalStore.getProjects);
  const services = useDigitalStore(digitalStore.getServices);
  const sites = useDigitalStore(digitalStore.getSites);
  const organizations = usePlatformOperations(platformOperationsStore.getOrganizations);
  const accounts = useIdentityStore(identityStore.getAccounts);
  const organizationLinks = useWebsitePlatformStore(websitePlatformStore.getOrganizationLinks);
  const workspaces = useWebsitePlatformStore(() => websitePlatformStore.getWorkspaces());
  const siteConnections = useWebsitePlatformStore(websitePlatformStore.getSiteConnections);
  const demoRequests = useWebsitePlatformStore(websitePlatformStore.getDemoRequests);
  const registrySnapshots = useWebsitePlatformStore(contractRegistryStore.getSnapshots);
  const manifestEvidence = useWebsitePlatformStore(contractRegistryStore.getManifestEvidence);
  const validationEvidence = useWebsitePlatformStore(contractRegistryStore.getValidationEvidence);
  const registryReadiness = useWebsitePlatformStore(() => contractRegistryStore.getRegistryReadiness());
  const canonicalAccessProjections = useWebsitePlatformStore(customerCapabilityPolicyStore.getCanonicalAccessProjections);
  const serviceEntitlements = useWebsitePlatformStore(customerCapabilityPolicyStore.getServiceEntitlements);
  const capabilityPolicies = useWebsitePlatformStore(customerCapabilityPolicyStore.getCapabilityPolicies);
  const fieldPolicies = useWebsitePlatformStore(customerCapabilityPolicyStore.getFieldPolicies);
  const rolePermissionGrants = useWebsitePlatformStore(customerCapabilityPolicyStore.getRolePermissionGrants);
  const securityRestrictions = useWebsitePlatformStore(customerCapabilityPolicyStore.getSecurityRestrictions);
  const managedResourceHeads = useWebsitePlatformStore(changeApprovalPublishingStore.getResourceHeads);
  const changeRequests = useWebsitePlatformStore(changeApprovalPublishingStore.getChangeRequests);
  const changeReviewEvents = useWebsitePlatformStore(changeApprovalPublishingStore.getChangeReviewEvents);
  const applicationReceipts = useWebsitePlatformStore(changeApprovalPublishingStore.getApplicationReceipts);
  const publishRequests = useWebsitePlatformStore(changeApprovalPublishingStore.getPublishRequests);
  const publishReviewEvents = useWebsitePlatformStore(changeApprovalPublishingStore.getPublishReviewEvents);
  const publishingReceipts = useWebsitePlatformStore(changeApprovalPublishingStore.getPublishingReceipts);
  const provisioningReviews = useWebsitePlatformStore(workspaceProvisioningStore.getReviews);
  const attachments = useWebsitePlatformStore(workspaceProvisioningStore.getAttachments);
  const demoEnvironments = useWebsitePlatformStore(workspaceProvisioningStore.getDemoEnvironments);
  const provisioningActivity = useWebsitePlatformStore(workspaceProvisioningStore.getActivity);
  const memberships = useCustomerAccessStore(customerAccessStore.getMemberships);
  const customerRoles = useCustomerAccessStore(customerAccessStore.getRoles);
  const migrationAssessments = websitePlatformStore.getLegacyPortalMigrationAssessments();
  const backendReadiness = getBackendBoundaryReadiness();
  const publicSitePublications = useWebsitePlatformStore(publicSiteIntegrationStore.getPublications);
  const publicRouteBindings = useWebsitePlatformStore(publicSiteIntegrationStore.getRouteBindings);
  const publicConversionReceipts = useWebsitePlatformStore(publicSiteIntegrationStore.getConversionReceipts);
  const publicSiteReadiness = useWebsitePlatformStore(() => publicSiteIntegrationStore.getReadiness());
  const offboardingPlans = useWebsitePlatformStore(lifecycleGovernanceStore.getOffboardingPlans);
  const dataExports = useWebsitePlatformStore(lifecycleGovernanceStore.getDataExports);
  const assetOwnership = useWebsitePlatformStore(lifecycleGovernanceStore.getAssetOwnership);
  const contractMigrations = useWebsitePlatformStore(lifecycleGovernanceStore.getContractMigrations);
  const productionAcceptance = useWebsitePlatformStore(lifecycleGovernanceStore.getProductionAcceptance);
  const productionAcceptanceSummary = useWebsitePlatformStore(() => lifecycleGovernanceStore.getProductionAcceptanceSummary());
  const { user } = useSession();
  const { notify } = useToast();

  const [view, setView] = useState<ViewKey>("overview");
  const [query, setQuery] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [manifestConnectionId, setManifestConnectionId] = useState(siteConnections[0]?.id ?? "");
  const [manifestJson, setManifestJson] = useState("");
  const [linkClientId, setLinkClientId] = useState(clients.find((client) => !organizationLinks.some((link) => link.clientId === client.id && link.status === "active"))?.id ?? clients[0]?.id ?? "");
  const customerOrganizations = organizations.filter((organization) => organization.kind === "customer" && organization.status === "active");
  const [linkOrganizationId, setLinkOrganizationId] = useState(customerOrganizations.find((organization) => !organizationLinks.some((link) => link.organizationId === organization.id && link.status === "active"))?.id ?? customerOrganizations[0]?.id ?? "");
  const activeOrganizationLinks = organizationLinks.filter((link) => link.status === "active");
  const [workspaceLinkId, setWorkspaceLinkId] = useState(activeOrganizationLinks[0]?.id ?? "");
  const [workspaceName, setWorkspaceName] = useState("");
  const eligibleAccounts = accounts.filter((account) => account.state === "active" && account.verificationState === "verified");
  const activeWorkspaces = workspaces.filter((workspace) => workspace.status === "active");
  const requestedWorkspaces = workspaces.filter((workspace) => workspace.status === "requested");
  const provisioningWorkspaces = workspaces.filter((workspace) => workspace.status === "provisioning");
  const activeRoles = customerRoles.filter((role) => role.status === "active");
  const [memberAccountId, setMemberAccountId] = useState(eligibleAccounts[0]?.id ?? "");
  const [memberWorkspaceId, setMemberWorkspaceId] = useState(activeWorkspaces[0]?.id ?? "");
  const [memberRoleId, setMemberRoleId] = useState(activeRoles[0]?.id ?? "");
  const [reviewWorkspaceId, setReviewWorkspaceId] = useState(requestedWorkspaces[0]?.id ?? "");
  const [reviewAccountId, setReviewAccountId] = useState(eligibleAccounts.find((account) => !account.primaryEmail.endsWith("@nextf.dev"))?.id ?? eligibleAccounts[0]?.id ?? "");
  const [reviewNote, setReviewNote] = useState("");
  const [attachWorkspaceId, setAttachWorkspaceId] = useState(provisioningWorkspaces[0]?.id ?? "");
  const [attachType, setAttachType] = useState<AttachType>("project");
  const [attachResourceId, setAttachResourceId] = useState("");
  const [entitlementOpen, setEntitlementOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [rolePermissionOpen, setRolePermissionOpen] = useState(false);
  const [fieldPolicyOpen, setFieldPolicyOpen] = useState(false);
  const [securityRestrictionOpen, setSecurityRestrictionOpen] = useState(false);
  const policyConnections = siteConnections.filter((row) => ["ready", "connected"].includes(row.status) && Boolean(row.validationEvidenceId) && canonicalAccessProjections.some((projection) => projection.siteConnectionId === row.id && projection.validationEvidenceId === row.validationEvidenceId));
  const [policyConnectionId, setPolicyConnectionId] = useState(policyConnections[0]?.id ?? "");
  const selectedPolicyConnectionEvidenceId = siteConnections.find((row) => row.id === policyConnectionId)?.validationEvidenceId;
  const selectedProjection = canonicalAccessProjections.find((row) => row.siteConnectionId === policyConnectionId && row.validationEvidenceId === selectedPolicyConnectionEvidenceId);
  const [policyCapabilityId, setPolicyCapabilityId] = useState(selectedProjection?.capabilities[0]?.capabilityId ?? "");
  const [policyServiceId, setPolicyServiceId] = useState("");
  const [policyExposureMode, setPolicyExposureMode] = useState<CustomerExposureMode>("read_only");
  const [policyPublishingMode, setPolicyPublishingMode] = useState<CustomerPublishingMode>("staff_only");
  const [rolePermissionRoleId, setRolePermissionRoleId] = useState(activeRoles[0]?.id ?? "");
  const [rolePermissionId, setRolePermissionId] = useState("");
  const [fieldPolicyPath, setFieldPolicyPath] = useState("");
  const [fieldPolicyExposureMode, setFieldPolicyExposureMode] = useState<CustomerExposureMode>("read_only");
  const [securityRestrictionMode, setSecurityRestrictionMode] = useState<"hidden" | "read_only">("read_only");
  const [securityRestrictionReason, setSecurityRestrictionReason] = useState("");
  const [changeDetailId, setChangeDetailId] = useState("");
  const [reviewNoteOpen, setReviewNoteOpen] = useState(false);
  const [reviewNoteTargetId, setReviewNoteTargetId] = useState("");
  const [reviewNoteAction, setReviewNoteAction] = useState<"change_changes" | "change_reject" | "publish_changes" | "publish_reject">("change_changes");
  const [reviewDecisionNote, setReviewDecisionNote] = useState("");

  const filteredWorkspaces = useMemo(() => workspaces.filter((workspace) => {
    const client = clients.find((item) => item.id === workspace.clientId);
    const organization = organizations.find((item) => item.id === workspace.organizationId);
    return `${workspace.name} ${workspace.key} ${client?.company ?? ""} ${client?.name ?? ""} ${organization?.name ?? ""}`.toLowerCase().includes(query.toLowerCase());
  }), [workspaces, clients, organizations, query]);

  const selectedPolicyConnection = siteConnections.find((row) => row.id === policyConnectionId);
  const selectedPolicyWorkspace = workspaces.find((row) => row.id === selectedPolicyConnection?.workspaceId);
  const selectedPolicyCapability = selectedProjection?.capabilities.find((row) => row.capabilityId === policyCapabilityId);
  const selectedChangeDetail = changeRequests.find((row) => row.id === changeDetailId);
  const attachedServiceIdsForPolicy = new Set(attachments.filter((row) => row.workspaceId === selectedPolicyWorkspace?.id && row.type === "service").map((row) => row.resourceId));
  const entitlementServiceOptions = services.filter((row) => attachedServiceIdsForPolicy.has(row.id) && row.active);
  const canonicalPermissionOptions = selectedPolicyCapability ? [...new Set([
    ...selectedPolicyCapability.readPermissions.allOf,
    ...selectedPolicyCapability.readPermissions.anyOf,
    ...selectedPolicyCapability.editPermissions.allOf,
    ...selectedPolicyCapability.editPermissions.anyOf,
    ...selectedPolicyCapability.publishPermissions.allOf,
    ...selectedPolicyCapability.publishPermissions.anyOf,
    ...selectedPolicyCapability.fields.flatMap((field) => [...field.readPermissions.allOf, ...field.readPermissions.anyOf, ...field.editPermissions.allOf, ...field.editPermissions.anyOf]),
  ])] : [];
  const canonicalFieldOptions = selectedPolicyCapability?.fields ?? [];

  const attachAssessment = attachWorkspaceId ? workspaceProvisioningStore.assessWorkspace(attachWorkspaceId) : undefined;
  const attachOptions = attachType === "project"
    ? projects.filter((row) => attachAssessment?.eligibleProjectIds.includes(row.id)).map((row) => ({ id: row.id, label: row.name }))
    : attachType === "service"
      ? services.filter((row) => attachAssessment?.eligibleServiceIds.includes(row.id)).map((row) => ({ id: row.id, label: row.name }))
      : sites.filter((row) => attachAssessment?.eligibleSiteIds.includes(row.id)).map((row) => ({ id: row.id, label: `${row.name} · ${row.domain}` }));

  const workspaceColumns: DataTableColumn<CustomerWorkspaceRecord>[] = [
    { key: "workspace", header: "Customer workspace", render: (row) => <div className="entity-cell"><strong>{row.name}</strong><small>{row.key}</small></div> },
    { key: "organization", header: "Customer organization", render: (row) => <span>{organizations.find((organization) => organization.id === row.organizationId)?.name ?? <Badge tone="danger">Unresolved</Badge>}</span> },
    { key: "client", header: "Digital client", render: (row) => <span>{clients.find((client) => client.id === row.clientId)?.company ?? "Unknown client"}</span> },
    { key: "scope", header: "Provisioned scope", render: (row) => { const assessment = workspaceProvisioningStore.assessWorkspace(row.id); return <div className="entity-cell"><strong>{assessment.attachedProjectIds.length} project · {assessment.attachedServiceIds.length} service</strong><small>{assessment.connectedSiteIds.length} site connection(s)</small></div>; } },
    { key: "status", header: "Provisioning", render: (row) => <Badge tone={workspaceTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "actions", header: "Actions", render: (row) => <div className="table-actions">{row.status === "requested" && <Button variant="ghost" onClick={() => { setReviewWorkspaceId(row.id); setReviewOpen(true); }}>Start review</Button>}{row.status === "provisioning" && <Button variant="ghost" onClick={() => { setAttachWorkspaceId(row.id); setAttachOpen(true); }}>Attach scope</Button>}{row.status === "provisioning" && <Button onClick={() => activateWorkspace(row.id)}>Activate</Button>}</div> },
  ];

  const reviewColumns: DataTableColumn<WorkspaceProvisioningReview>[] = [
    { key: "workspace", header: "Workspace", render: (row) => <div className="entity-cell"><strong>{workspaces.find((item) => item.id === row.workspaceId)?.name ?? row.workspaceId}</strong><small>{accounts.find((item) => item.id === row.primaryAccountId)?.primaryEmail ?? "Primary identity unresolved"}</small></div> },
    { key: "eligibility", header: "Eligibility", render: (row) => { const assessment = workspaceProvisioningStore.assessWorkspace(row.workspaceId); return assessment.blockers.length ? <div className="entity-cell"><Badge tone="danger">{assessment.blockers.length} blocker(s)</Badge><small>{assessment.blockers[0]}</small></div> : <Badge tone="success">Eligible</Badge>; } },
    { key: "status", header: "Review", render: (row) => <Badge tone={reviewTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "actions", header: "Actions", render: (row) => <div className="table-actions">{["in_review", "blocked"].includes(row.status) && <Button onClick={() => approveReview(row.workspaceId)}>Approve review</Button>}{row.status === "approved" && <Button variant="ghost" onClick={() => { setAttachWorkspaceId(row.workspaceId); setAttachOpen(true); }}>Attach scope</Button>}</div> },
  ];

  const attachmentColumns: DataTableColumn<WorkspaceAttachmentRecord>[] = [
    { key: "workspace", header: "Workspace", render: (row) => <span>{workspaces.find((item) => item.id === row.workspaceId)?.name ?? row.workspaceId}</span> },
    { key: "type", header: "Scope type", render: (row) => <Badge tone="info">{row.type}</Badge> },
    { key: "resource", header: "Authoritative resource", render: (row) => <span>{row.type === "project" ? projects.find((item) => item.id === row.resourceId)?.name ?? row.resourceId : services.find((item) => item.id === row.resourceId)?.name ?? row.resourceId}</span> },
    { key: "attached", header: "Attached", render: (row) => <small>{new Date(row.attachedAt).toLocaleString("en-LK")}</small> },
  ];

  const linkColumns: DataTableColumn<CustomerOrganizationLinkRecord>[] = [
    { key: "client", header: "Digital client", render: (row) => <div className="entity-cell"><strong>{clients.find((client) => client.id === row.clientId)?.company ?? "Unknown client"}</strong><small>{row.clientId}</small></div> },
    { key: "organization", header: "Customer organization", render: (row) => <div className="entity-cell"><strong>{organizations.find((organization) => organization.id === row.organizationId)?.name ?? "Unknown organization"}</strong><small>{row.organizationId}</small></div> },
    { key: "status", header: "Link", render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> },
  ];

  const membershipColumns: DataTableColumn<CustomerMembershipRecord>[] = [
    { key: "account", header: "NEXT F Account", render: (row) => { const account = accounts.find((item) => item.id === row.accountId); return <div className="entity-cell"><strong>{account?.displayName ?? "Unknown account"}</strong><small>{account?.primaryEmail ?? row.accountId}</small></div>; } },
    { key: "workspace", header: "Workspace", render: (row) => <span>{workspaces.find((item) => item.id === row.workspaceId)?.name ?? "Unknown workspace"}</span> },
    { key: "role", header: "Customer role", render: (row) => <span>{customerRoles.find((item) => item.id === row.customerRoleId)?.name ?? "Unknown role"}</span> },
    { key: "status", header: "Membership", render: (row) => <div className="entity-cell"><Badge tone={row.status === "active" ? "success" : row.status === "invited" ? "warning" : row.status === "revoked" ? "danger" : "neutral"}>{row.status}</Badge><small>invite: {row.invitationState}{row.invitationExpiresAt ? ` · expires ${new Date(row.invitationExpiresAt).toLocaleDateString("en-LK")}` : ""}</small></div> },
    { key: "actions", header: "Actions", render: (row) => <div className="table-actions">{row.status === "invited" && ["pending", "expired"].includes(row.invitationState) && <Button variant="ghost" onClick={() => runAction(() => customerAccessStore.resendInvitation(row.id, user.id), "Invitation resent")}>Resend</Button>}{row.status === "invited" && row.invitationState === "pending" && <Button variant="ghost" onClick={() => runAction(() => customerAccessStore.expireInvitation(row.id, user.id), "Invitation expired")}>Expire</Button>}{row.status === "active" && <Button variant="ghost" onClick={() => customerAccessStore.suspendMembership(row.id)}>Suspend</Button>}{row.status !== "revoked" && <Button variant="ghost" onClick={() => customerAccessStore.revokeMembership(row.id)}>Revoke</Button>}</div> },
  ];

  const roleColumns: DataTableColumn<CustomerRoleRecord>[] = [
    { key: "role", header: "Customer role", render: (row) => <div className="entity-cell"><strong>{row.name}</strong><small>{row.description}</small></div> },
    { key: "bindings", header: "Contract permission bindings", render: (row) => row.contractPermissionBindings.length ? <strong>{row.contractPermissionBindings.length}</strong> : <Badge tone="warning">Unresolved</Badge> },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> },
  ];

  const connectionColumns: DataTableColumn<SiteConnectionRecord>[] = [
    { key: "site", header: "Site", render: (row) => { const site = sites.find((item) => item.id === row.siteId); return <div className="entity-cell"><strong>{site?.name ?? "Unknown site"}</strong><small>{site?.domain ?? row.siteId}</small></div>; } },
    { key: "workspace", header: "Workspace", render: (row) => <span>{workspaces.find((item) => item.id === row.workspaceId)?.name ?? "Unknown workspace"}</span> },
    { key: "contract", header: "Contract", render: (row) => <div className="entity-cell"><strong>{row.contractVersion}</strong><small>{row.registrySnapshotId ? `snapshot ${row.registrySnapshotId}` : "registry unresolved"}</small></div> },
    { key: "manifest", header: "Site Manifest", render: (row) => <div className="entity-cell"><strong>{row.manifestFilename}</strong><small><Badge tone={manifestTone(row.manifestStatus)}>{row.manifestStatus}</Badge></small></div> },
    { key: "connection", header: "Lifecycle", render: (row) => <Badge tone={connectionTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "actions", header: "Contract actions", render: (row) => <div className="table-actions">{["registered", "identity_pending", "manifest_received", "incompatible"].includes(row.status) && <Button variant="ghost" onClick={() => { setManifestConnectionId(row.id); setManifestJson(manifestEvidence.find((item) => item.siteConnectionId === row.id)?.rawJson ?? ""); setManifestOpen(true); }}>Receive manifest</Button>}{row.status === "ready" && <Button onClick={() => runAction(() => contractRegistryStore.connectReadySite(row.id, user.id), "Managed Site connected")}>Connect</Button>}{["ready", "connected", "incompatible"].includes(row.status) && <Button variant="ghost" onClick={() => runAction(() => contractRegistryStore.suspendSite(row.id, user.id), "Site connection suspended")}>Suspend</Button>}{row.status !== "revoked" && <Button variant="ghost" onClick={() => runAction(() => contractRegistryStore.revokeSite(row.id, user.id), "Site connection revoked")}>Revoke</Button>}</div> },
  ];

  const registryColumns: DataTableColumn<RegistrySnapshotRecord>[] = [
    { key: "version", header: "Contract", render: (row) => <div className="entity-cell"><strong>{row.contractVersion}</strong><small>{row.sourceKind.replaceAll("_", " ")}</small></div> },
    { key: "source", header: "Source evidence", render: (row) => <div className="entity-cell"><strong>{row.sourceReference}</strong><small>{row.immutableReference ?? "immutable reference not verified"}</small></div> },
    { key: "status", header: "Trust", render: (row) => <Badge tone={row.status === "trusted" ? "success" : row.status === "rejected" ? "danger" : "warning"}>{row.status}</Badge> },
    { key: "authority", header: "Verification", render: (row) => <span>{row.verificationAuthority ?? "Not verified"}</span> },
  ];

  const manifestColumns: DataTableColumn<ManifestEvidenceRecord>[] = [
    { key: "site", header: "Site connection", render: (row) => { const connection = siteConnections.find((item) => item.id === row.siteConnectionId); const site = sites.find((item) => item.id === connection?.siteId); return <div className="entity-cell"><strong>{site?.name ?? row.siteConnectionId}</strong><small>{site?.domain ?? connection?.siteId ?? row.siteConnectionId}</small></div>; } },
    { key: "manifest", header: "Manifest evidence", render: (row) => <div className="entity-cell"><strong>{row.filename}</strong><small>received {new Date(row.receivedAt).toLocaleString("en-LK")}</small></div> },
    { key: "status", header: "Validation", render: (row) => <Badge tone={row.status === "valid" ? "success" : row.status === "invalid" || row.status === "incompatible" ? "danger" : "warning"}>{row.status}</Badge> },
    { key: "compatibility", header: "Compatibility", render: (row) => <Badge tone={row.compatibilityStatus === "compatible" ? "success" : row.compatibilityStatus === "incompatible" ? "danger" : "neutral"}>{row.compatibilityStatus}</Badge> },
    { key: "issues", header: "Evidence", render: (row) => <span className="muted-cell">{row.issues[0] ?? (row.validationEvidenceId ? `validation ${row.validationEvidenceId}` : "Awaiting canonical resolver")}</span> },
  ];

  const validationColumns: DataTableColumn<ContractValidationEvidenceRecord>[] = [
    { key: "validation", header: "Validation evidence", render: (row) => <div className="entity-cell"><strong>{row.id}</strong><small>{new Date(row.verifiedAt).toLocaleString("en-LK")}</small></div> },
    { key: "contract", header: "Version", render: (row) => <div className="entity-cell"><strong>{row.contractVersion}</strong><small>manifest {row.manifestContractVersion}</small></div> },
    { key: "resolution", header: "Resolved canonical IDs", render: (row) => <div className="entity-cell"><strong>{row.resolution.moduleIds.length} modules · {row.resolution.capabilityIds.length} capabilities</strong><small>{row.resolution.permissionIds.length} permissions · {row.resolution.apiOperationIds.length} API operations</small></div> },
    { key: "compatibility", header: "Compatibility", render: (row) => <Badge tone={row.compatibilityStatus === "compatible" && row.schemaValid ? "success" : "danger"}>{row.schemaValid ? row.compatibilityStatus : "schema invalid"}</Badge> },
    { key: "authority", header: "Authority", render: (row) => <span>{row.verificationAuthority}</span> },
  ];

  const entitlementColumns: DataTableColumn<ServiceCapabilityEntitlementRecord>[] = [
    { key: "site", header: "Managed site", render: (row) => { const connection = siteConnections.find((item) => item.id === row.siteConnectionId); const site = sites.find((item) => item.id === connection?.siteId); return <div className="entity-cell"><strong>{site?.name ?? row.siteConnectionId}</strong><small>{site?.domain ?? connection?.siteId ?? "Site"}</small></div>; } },
    { key: "service", header: "Entitling service", render: (row) => <div className="entity-cell"><strong>{services.find((item) => item.id === row.serviceId)?.name ?? row.serviceId}</strong><small>{row.serviceId}</small></div> },
    { key: "capability", header: "Canonical capability", render: (row) => <code className="inline-code">{row.capabilityId}</code> },
    { key: "status", header: "Entitlement", render: (row) => <Badge tone={row.status === "active" ? "success" : row.status === "revoked" ? "danger" : "warning"}>{row.status}</Badge> },
    { key: "actions", header: "Actions", render: (row) => <div className="table-actions">{row.status === "active" && <Button variant="ghost" onClick={() => runAction(() => customerCapabilityPolicyStore.setEntitlementStatus(row.id, "suspended", user.id), "Service entitlement suspended")}>Suspend</Button>}{row.status === "suspended" && <Button variant="ghost" onClick={() => runAction(() => customerCapabilityPolicyStore.setEntitlementStatus(row.id, "active", user.id), "Service entitlement restored")}>Restore</Button>}{row.status !== "revoked" && <Button variant="ghost" onClick={() => runAction(() => customerCapabilityPolicyStore.setEntitlementStatus(row.id, "revoked", user.id), "Service entitlement revoked")}>Revoke</Button>}</div> },
  ];

  const capabilityPolicyColumns: DataTableColumn<CustomerCapabilityPolicyRecord>[] = [
    { key: "site", header: "Site", render: (row) => { const connection = siteConnections.find((item) => item.id === row.siteConnectionId); const site = sites.find((item) => item.id === connection?.siteId); return <div className="entity-cell"><strong>{site?.name ?? row.siteConnectionId}</strong><small>{site?.domain ?? row.siteConnectionId}</small></div>; } },
    { key: "capability", header: "Canonical capability", render: (row) => <code className="inline-code">{row.capabilityId}</code> },
    { key: "exposure", header: "Customer exposure", render: (row) => <Badge tone={row.exposureMode === "hidden" ? "neutral" : row.exposureMode === "direct_edit" ? "success" : "warning"}>{row.exposureMode.replaceAll("_", " ")}</Badge> },
    { key: "publishing", header: "Publishing", render: (row) => <Badge tone={row.publishingMode === "direct_publish" ? "success" : row.publishingMode === "staff_only" || row.publishingMode === "not_applicable" ? "neutral" : "warning"}>{row.publishingMode.replaceAll("_", " ")}</Badge> },
    { key: "fields", header: "Field restrictions", render: (row) => <span>{fieldPolicies.filter((field) => field.siteConnectionId === row.siteConnectionId && field.capabilityId === row.capabilityId).length} field override(s)</span> },
    { key: "security", header: "Privacy/security", render: (row) => <span>{securityRestrictions.filter((restriction) => restriction.active && restriction.siteConnectionId === row.siteConnectionId && restriction.capabilityId === row.capabilityId).length} restriction(s)</span> },
    { key: "actions", header: "Restrictions", render: (row) => <div className="table-actions"><Button variant="ghost" onClick={() => { setPolicyConnectionId(row.siteConnectionId); setPolicyCapabilityId(row.capabilityId); setFieldPolicyPath(""); setFieldPolicyOpen(true); }}>Field policy</Button><Button variant="ghost" onClick={() => { setPolicyConnectionId(row.siteConnectionId); setPolicyCapabilityId(row.capabilityId); setFieldPolicyPath(""); setSecurityRestrictionReason(""); setSecurityRestrictionOpen(true); }}>Security restriction</Button></div> },
  ];

  const rolePermissionColumns: DataTableColumn<CustomerRolePermissionGrantRecord>[] = [
    { key: "role", header: "Customer role", render: (row) => <strong>{customerRoles.find((role) => role.id === row.customerRoleId)?.name ?? row.customerRoleId}</strong> },
    { key: "site", header: "Site scope", render: (row) => { const connection = siteConnections.find((item) => item.id === row.siteConnectionId); const site = sites.find((item) => item.id === connection?.siteId); return <span>{site?.name ?? row.siteConnectionId}</span>; } },
    { key: "permission", header: "Exact canonical permission", render: (row) => <code className="inline-code">{row.permissionId}</code> },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> },
    { key: "action", header: "", render: (row) => row.status === "active" ? <Button variant="ghost" onClick={() => runAction(() => customerCapabilityPolicyStore.revokeRolePermission(row.id, user.id), "Role permission revoked")}>Revoke</Button> : <span className="muted-cell">Revoked</span> },
  ];

  const changeRequestColumns: DataTableColumn<CustomerChangeRequestRecord>[] = [
    { key: "request", header: "Change request", render: (row) => <div className="entity-cell"><strong>{row.resourceId}</strong><small>{row.id} · {row.capabilityId}</small></div> },
    { key: "revision", header: "Base revision", render: (row) => <div className="entity-cell"><code className="inline-code">{row.baseRevisionId}</code><small>{row.proposedChanges.length} field change(s)</small></div> },
    { key: "status", header: "Workflow", render: (row) => <Badge tone={row.status === "applied" ? "success" : row.status === "conflict" || row.status === "rejected" ? "danger" : row.status === "approved" ? "info" : "warning"}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "history", header: "Evidence", render: (row) => <div className="entity-cell"><strong>{changeReviewEvents.filter((event) => event.changeRequestId === row.id).length} review event(s)</strong><small>{applicationReceipts.find((receipt) => receipt.changeRequestId === row.id)?.adapterReceiptId ?? "No application receipt"}</small></div> },
    { key: "actions", header: "Staff review", render: (row) => <div className="table-actions"><Button variant="ghost" onClick={() => setChangeDetailId(row.id)}>Details</Button>{row.status === "submitted" && <Button variant="ghost" onClick={() => runAction(() => changeApprovalPublishingStore.startChangeReview(row.id, user.id), "Change review started")}>Review</Button>}{row.status === "in_review" && <Button onClick={() => runAction(() => changeApprovalPublishingStore.approveChange(row.id, user.id), "Change request approved")}>Approve</Button>}{row.status === "in_review" && <Button variant="ghost" onClick={() => { setReviewNoteTargetId(row.id); setReviewNoteAction("change_changes"); setReviewDecisionNote(""); setReviewNoteOpen(true); }}>Request changes</Button>}{["submitted", "in_review", "changes_requested"].includes(row.status) && <Button variant="ghost" onClick={() => { setReviewNoteTargetId(row.id); setReviewNoteAction("change_reject"); setReviewDecisionNote(""); setReviewNoteOpen(true); }}>Reject</Button>}{row.status === "changes_requested" && <span className="muted-cell">Awaiting superseding customer proposal</span>}</div> },
  ];

  const publishRequestColumns: DataTableColumn<CustomerPublishRequestRecord>[] = [
    { key: "request", header: "Publication", render: (row) => <div className="entity-cell"><strong>{row.resourceId}</strong><small>{row.id} · {row.capabilityId}</small></div> },
    { key: "revision", header: "Target revision", render: (row) => <code className="inline-code">{row.targetRevisionId}</code> },
    { key: "mode", header: "Governance", render: (row) => <Badge tone={row.reviewMode === "direct_authorized" ? "success" : "warning"}>{row.reviewMode.replaceAll("_", " ")}</Badge> },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "published" ? "success" : row.status === "conflict" || row.status === "rejected" ? "danger" : row.status === "approved" || row.status === "authorized" ? "info" : "warning"}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "evidence", header: "Evidence", render: (row) => <div className="entity-cell"><strong>{publishReviewEvents.filter((event) => event.publishRequestId === row.id).length} review event(s)</strong><small>{publishingReceipts.find((receipt) => receipt.publishRequestId === row.id)?.publicationReference ?? "Not published"}</small></div> },
    { key: "actions", header: "Staff review", render: (row) => <div className="table-actions">{row.reviewMode === "staff_approval" && row.status === "submitted" && <Button variant="ghost" onClick={() => runAction(() => changeApprovalPublishingStore.startPublishReview(row.id, user.id), "Publication review started")}>Review</Button>}{row.reviewMode === "staff_approval" && row.status === "in_review" && <Button onClick={() => runAction(() => changeApprovalPublishingStore.approvePublishRequest(row.id, user.id), "Publication approved")}>Approve</Button>}{row.reviewMode === "staff_approval" && row.status === "in_review" && <Button variant="ghost" onClick={() => { setReviewNoteTargetId(row.id); setReviewNoteAction("publish_changes"); setReviewDecisionNote(""); setReviewNoteOpen(true); }}>Request changes</Button>}{row.reviewMode === "staff_approval" && ["submitted", "in_review", "changes_requested"].includes(row.status) && <Button variant="ghost" onClick={() => { setReviewNoteTargetId(row.id); setReviewNoteAction("publish_reject"); setReviewDecisionNote(""); setReviewNoteOpen(true); }}>Reject</Button>}{row.status === "changes_requested" && <span className="muted-cell">Awaiting a new publication request</span>}{["approved", "authorized"].includes(row.status) && <span className="muted-cell">Awaiting publishing adapter receipt</span>}</div> },
  ];

  const demoColumns: DataTableColumn<DemoAccessRequestRecord>[] = [
    { key: "request", header: "Prospect", render: (row) => <div className="entity-cell"><strong>{row.name}</strong><small>{row.email}</small></div> },
    { key: "company", header: "Company", render: (row) => <span>{row.company}</span> },
    { key: "status", header: "Lifecycle", render: (row) => <Badge tone={demoTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "environment", header: "Environment", render: (row) => row.demoEnvironmentId ? <span>{demoEnvironments.find((item) => item.id === row.demoEnvironmentId)?.environmentKey ?? row.demoEnvironmentId}</span> : <Badge tone="neutral">None</Badge> },
    { key: "action", header: "Review / provision", render: (row) => <div className="table-actions">{row.status === "submitted" && <Button variant="ghost" onClick={() => runAction(() => websitePlatformStore.startDemoReview(row.id, user.id), "Demo review started")}>Review</Button>}{["submitted", "under_review"].includes(row.status) && <Button variant="ghost" onClick={() => runAction(() => websitePlatformStore.rejectDemoRequest(row.id, user.id), "Demo request rejected")}>Reject</Button>}{row.status === "under_review" && <Button onClick={() => runAction(() => websitePlatformStore.approveDemoRequest(row.id, user.id), "Demo request approved")}>Approve</Button>}{row.status === "approved" && <Button onClick={() => runAction(() => workspaceProvisioningStore.provisionDemoEnvironment(row.id, user.id), "Isolated demo environment provisioned")}>Provision demo</Button>}</div> },
  ];

  const environmentColumns: DataTableColumn<DemoEnvironmentRecord>[] = [
    { key: "environment", header: "Demo environment", render: (row) => <div className="entity-cell"><strong>{row.environmentKey}</strong><small>{row.templateVersion} · {row.dataPolicy.replaceAll("_", " ")}</small></div> },
    { key: "prospect", header: "Prospect", render: (row) => { const request = demoRequests.find((item) => item.id === row.demoRequestId); return <div className="entity-cell"><strong>{request?.company || request?.name || row.demoRequestId}</strong><small>{request?.email ?? row.demoRequestId}</small></div>; } },
    { key: "restrictions", header: "Isolation", render: (row) => <div className="entity-cell"><Badge tone="success">synthetic only</Badge><small>{row.restrictions.length} enforced restriction(s)</small></div> },
    { key: "expiry", header: "Expiry", render: (row) => <div className="entity-cell"><Badge tone={environmentTone(row.status)}>{row.status}</Badge><small>{new Date(row.expiresAt).toLocaleString("en-LK")}</small></div> },
    { key: "actions", header: "Actions", render: (row) => <div className="table-actions">{row.status === "provisioning" && <Button onClick={() => runAction(() => workspaceProvisioningStore.activateDemoEnvironment(row.id, user.id), "Demo environment activated")}>Activate</Button>}{row.status === "active" && <Button variant="ghost" onClick={() => runAction(() => workspaceProvisioningStore.resetDemoEnvironment(row.id, user.id), "Synthetic demo data reset")}>Reset</Button>}{row.status === "active" && <Button variant="ghost" onClick={() => runAction(() => workspaceProvisioningStore.extendDemoEnvironment(row.id, user.id, 7), "Demo extended by 7 days")}>Extend 7d</Button>}{row.status === "active" && <Button variant="ghost" onClick={() => runAction(() => workspaceProvisioningStore.revokeDemoEnvironment(row.id, user.id), "Demo access revoked")}>Revoke</Button>}</div> },
  ];

  const migrationColumns: DataTableColumn<LegacyPortalMigrationAssessment>[] = [
    { key: "legacy", header: "Legacy PortalAccess", render: (row) => <div className="entity-cell"><strong>{row.email}</strong><small>{row.portalAccessId} · legacy {row.legacyStatus}</small></div> },
    { key: "resolution", header: "Resolution", render: (row) => <Badge tone={migrationTone(row.state)}>{row.state.replaceAll("_", " ")}</Badge> },
    { key: "reason", header: "Migration safety", render: (row) => <span className="muted-cell">{row.reason}</span> },
  ];

  const activityColumns: DataTableColumn<ProvisioningActivityRecord>[] = [
    { key: "action", header: "Action", render: (row) => <div className="entity-cell"><strong>{row.action}</strong><small>{row.targetType} · {row.targetId}</small></div> },
    { key: "detail", header: "Detail", render: (row) => <span className="muted-cell">{row.detail}</span> },
    { key: "actor", header: "Actor", render: (row) => <span>{row.actorId}</span> },
    { key: "time", header: "Time", render: (row) => <small>{new Date(row.createdAt).toLocaleString("en-LK")}</small> },
  ];

  const backendOperationColumns: DataTableColumn<ApiOperationDefinition>[] = [
    { key: "operation", header: "V1 operation", render: (row) => <div className="entity-cell"><strong>{row.name}</strong><small>{row.description}</small></div> },
    { key: "kind", header: "Type", render: (row) => <Badge tone={row.kind === "command" ? "warning" : "neutral"}>{row.kind}</Badge> },
    { key: "principals", header: "Allowed principals", render: (row) => <span>{row.allowedPrincipals.join(", ")}</span> },
    { key: "scope", header: "Scope", render: (row) => <span>{row.workspaceScoped ? "workspace-bound" : "explicit non-workspace"}</span> },
    { key: "idempotency", header: "Idempotency", render: (row) => <Badge tone={row.idempotency === "required" ? "success" : "neutral"}>{row.idempotency}</Badge> },
  ];

  const publicProjectionColumns: DataTableColumn<PublicProjectionPublicationRecord>[] = [
    { key: "projection", header: "Public projection", render: (row) => <div className="entity-cell"><strong>{row.publicId}</strong><small>{row.kind.replaceAll("_", " ")} · /{row.slug}</small></div> },
    { key: "source", header: "Authoritative source", render: (row) => <code className="inline-code">{row.sourceId}</code> },
    { key: "fields", header: "Allowlisted fields", render: (row) => <span className="muted-cell">{row.publicFields.join(", ")}</span> },
    { key: "status", header: "Delivery", render: (row) => <Badge tone={row.status === "published" ? "success" : row.status === "withdrawn" ? "danger" : "warning"}>{row.status}</Badge> },
    { key: "action", header: "Action", render: (row) => <div className="table-actions">{row.status === "draft" && <Button onClick={() => runAction(() => publicSiteIntegrationStore.publishProjection(row.id, user.id), "Public projection published")}>Publish</Button>}{row.status === "published" && <Button variant="ghost" onClick={() => runAction(() => publicSiteIntegrationStore.withdrawProjection(row.id, user.id), "Public projection withdrawn")}>Withdraw</Button>}</div> },
  ];

  const publicRouteColumns: DataTableColumn<PublicRouteBindingRecord>[] = [
    { key: "surface", header: "Logical surface", render: (row) => <strong>{row.surface.replaceAll("_", " ")}</strong> },
    { key: "route", header: "Verified route/component", render: (row) => row.status === "verified" ? <div className="entity-cell"><strong>{row.route}</strong><small>{row.componentEvidence}</small></div> : <span className="muted-cell">Awaiting real nextf.lk source/crawl evidence</span> },
    { key: "status", header: "Inventory", render: (row) => <Badge tone={row.status === "verified" ? "success" : row.status === "retired" ? "neutral" : "warning"}>{row.status}</Badge> },
  ];

  const runAction = <T,>(action: () => T, title: string) => {
    try {
      action();
      notify({ title, description: "The lifecycle change was recorded and audited.", tone: "success" });
    } catch (error) {
      notify({ title: "Action blocked", description: error instanceof Error ? error.message : "The requested lifecycle transition is not valid.", tone: "danger" });
    }
  };

  const requestWorkspace = () => {
    const link = activeOrganizationLinks.find((item) => item.id === workspaceLinkId);
    if (!link) return notify({ title: "Select an organization link", description: "A Customer Workspace requires an explicit Digital client → customer organization relationship.", tone: "danger" });
    try {
      const row = websitePlatformStore.requestWorkspace(link.clientId, link.organizationId, workspaceName);
      notify({ title: "Workspace provisioning requested", description: `${row.name} was created in requested state. No customer access was granted.`, tone: "success" });
      setWorkspaceOpen(false); setWorkspaceName(""); setReviewWorkspaceId(row.id);
    } catch (error) { notify({ title: "Workspace not requested", description: error instanceof Error ? error.message : "Check the relationship.", tone: "danger" }); }
  };

  const linkOrganization = () => {
    try {
      const row = websitePlatformStore.linkCustomerOrganization(linkClientId, linkOrganizationId);
      notify({ title: "Customer organization linked", description: `${row.clientId} → ${row.organizationId}`, tone: "success" });
      setLinkOpen(false); setWorkspaceLinkId(row.id);
    } catch (error) { notify({ title: "Organization not linked", description: error instanceof Error ? error.message : "Check the relationship.", tone: "danger" }); }
  };

  const startReview = () => {
    try {
      workspaceProvisioningStore.startReview(reviewWorkspaceId, reviewAccountId, user.id, reviewNote);
      notify({ title: "Provisioning review started", description: "Identity and business eligibility are now reviewed separately from workspace activation.", tone: "success" });
      setReviewOpen(false); setReviewNote("");
    } catch (error) { notify({ title: "Review not started", description: error instanceof Error ? error.message : "Check the workspace and account.", tone: "danger" }); }
  };

  const approveReview = (workspaceId: string) => runAction(() => workspaceProvisioningStore.approveReview(workspaceId, user.id), "Provisioning review approved");
  const activateWorkspace = (workspaceId: string) => runAction(() => workspaceProvisioningStore.activateWorkspace(workspaceId, user.id), "Customer Workspace activated");

  const attachResource = () => {
    try {
      if (!attachResourceId) throw new Error("Select an eligible resource to attach");
      if (attachType === "project") workspaceProvisioningStore.attachProject(attachWorkspaceId, attachResourceId, user.id);
      else if (attachType === "service") workspaceProvisioningStore.attachService(attachWorkspaceId, attachResourceId, user.id);
      else workspaceProvisioningStore.attachSite(attachWorkspaceId, attachResourceId, user.id);
      notify({ title: `${attachType} attached`, description: "The authoritative Digital resource was linked explicitly to the Customer Workspace.", tone: "success" });
      setAttachResourceId("");
    } catch (error) { notify({ title: "Resource not attached", description: error instanceof Error ? error.message : "Check workspace eligibility.", tone: "danger" }); }
  };

  const inviteMember = () => {
    try {
      const row = customerAccessStore.inviteMembership({ accountId: memberAccountId, workspaceId: memberWorkspaceId, customerRoleId: memberRoleId, createdBy: user.id });
      notify({ title: "Membership invitation staged", description: `${row.id} is pending acceptance. Workspace activation and invitation acceptance remain separate.`, tone: "success" });
      setMembershipOpen(false);
    } catch (error) { notify({ title: "Membership not invited", description: error instanceof Error ? error.message : "Check the account and workspace state.", tone: "danger" }); }
  };

  const grantEntitlement = () => {
    try {
      if (!selectedPolicyConnection || !selectedPolicyWorkspace || !policyServiceId || !policyCapabilityId) throw new Error("Select a validated Site Connection, attached service, and canonical capability");
      customerCapabilityPolicyStore.grantServiceEntitlement({ workspaceId: selectedPolicyWorkspace.id, siteConnectionId: selectedPolicyConnection.id, serviceId: policyServiceId, capabilityId: policyCapabilityId, createdBy: user.id });
      notify({ title: "Service entitlement granted", description: "The entitlement narrows customer eligibility; it does not grant access without policy, role permission and every other authorization layer.", tone: "success" });
      setEntitlementOpen(false);
    } catch (error) { notify({ title: "Entitlement not granted", description: error instanceof Error ? error.message : "Check the Site, service and canonical capability.", tone: "danger" }); }
  };

  const setCapabilityPolicy = () => {
    try {
      if (!policyConnectionId || !policyCapabilityId) throw new Error("Select a canonical Site capability");
      customerCapabilityPolicyStore.setCapabilityPolicy({ siteConnectionId: policyConnectionId, capabilityId: policyCapabilityId, exposureMode: policyExposureMode, publishingMode: policyPublishingMode, createdBy: user.id });
      notify({ title: "Customer Capability Access Policy saved", description: "The policy cannot exceed canonical Contract limits and missing policy remains fail-closed.", tone: "success" });
      setPolicyOpen(false);
    } catch (error) { notify({ title: "Policy not saved", description: error instanceof Error ? error.message : "Check the canonical capability maximum.", tone: "danger" }); }
  };

  const setFieldPolicy = () => {
    try {
      if (!policyConnectionId || !policyCapabilityId || !fieldPolicyPath) throw new Error("Select a canonical field from the trusted access projection");
      customerCapabilityPolicyStore.setFieldPolicy({ siteConnectionId: policyConnectionId, capabilityId: policyCapabilityId, fieldPath: fieldPolicyPath, exposureMode: fieldPolicyExposureMode, createdBy: user.id });
      notify({ title: "Customer field policy saved", description: "The field rule can only reduce the canonical field maximum and parent capability policy.", tone: "success" });
      setFieldPolicyOpen(false);
    } catch (error) { notify({ title: "Field policy not saved", description: error instanceof Error ? error.message : "Check the canonical field and parent policy.", tone: "danger" }); }
  };

  const addSecurityRestriction = () => {
    try {
      if (!policyConnectionId || !policyCapabilityId) throw new Error("Select a canonical Site capability");
      customerCapabilityPolicyStore.addSecurityRestriction({ siteConnectionId: policyConnectionId, capabilityId: policyCapabilityId, fieldPath: fieldPolicyPath || undefined, mode: securityRestrictionMode, reason: securityRestrictionReason, createdBy: user.id });
      notify({ title: "Privacy/security restriction added", description: "Security restrictions can only reduce effective customer exposure.", tone: "success" });
      setSecurityRestrictionOpen(false); setSecurityRestrictionReason("");
    } catch (error) { notify({ title: "Restriction not added", description: error instanceof Error ? error.message : "Check the canonical capability/field and reason.", tone: "danger" }); }
  };

  const grantRolePermission = () => {
    try {
      if (!policyConnectionId || !rolePermissionRoleId || !rolePermissionId) throw new Error("Select a Site, customer role and exact canonical permission");
      customerCapabilityPolicyStore.grantRolePermission({ siteConnectionId: policyConnectionId, customerRoleId: rolePermissionRoleId, permissionId: rolePermissionId, createdBy: user.id });
      notify({ title: "Canonical role permission granted", description: "This permission remains constrained by Site Manifest support, service entitlement, customer policy, resource state, fields and security restrictions.", tone: "success" });
      setRolePermissionOpen(false);
    } catch (error) { notify({ title: "Permission not granted", description: error instanceof Error ? error.message : "Check the canonical permission mapping.", tone: "danger" }); }
  };

  const submitReviewDecisionNote = () => {
    try {
      if (!reviewDecisionNote.trim()) throw new Error("A reviewer note is required for this decision");
      if (reviewNoteAction === "change_changes") changeApprovalPublishingStore.requestChanges(reviewNoteTargetId, user.id, reviewDecisionNote);
      else if (reviewNoteAction === "change_reject") changeApprovalPublishingStore.rejectChange(reviewNoteTargetId, user.id, reviewDecisionNote);
      else if (reviewNoteAction === "publish_changes") changeApprovalPublishingStore.requestPublishChanges(reviewNoteTargetId, user.id, reviewDecisionNote);
      else changeApprovalPublishingStore.rejectPublishRequest(reviewNoteTargetId, user.id, reviewDecisionNote);
      notify({ title: reviewNoteAction.includes("changes") ? "Changes requested" : "Request rejected", description: "The reviewer note and workflow decision were recorded as audit evidence.", tone: "success" });
      setReviewNoteOpen(false); setReviewDecisionNote(""); setReviewNoteTargetId("");
    } catch (error) { notify({ title: "Review decision blocked", description: error instanceof Error ? error.message : "Provide a valid review note.", tone: "danger" }); }
  };

  const receiveManifest = () => {
    try {
      if (!manifestConnectionId) throw new Error("Select a managed Site Connection");
      contractRegistryStore.receiveManifest(manifestConnectionId, manifestJson, user.id);
      notify({ title: "Site Manifest received", description: "JSON syntax was accepted. Canonical validation remains blocked until a trusted Registry snapshot is available.", tone: "success" });
      setManifestOpen(false);
    } catch (error) { notify({ title: "Manifest not received", description: error instanceof Error ? error.message : "Check the Site Manifest JSON.", tone: "danger" }); }
  };

  const viewGroups: Array<{ label: string; items: Array<{ key: ViewKey; label: string }> }> = [
    {
      label: "Operations",
      items: [
        { key: "overview", label: "Overview" },
        { key: "workspaces", label: "Workspaces" },
        { key: "memberships", label: "Memberships" },
        { key: "demo-requests", label: "Demo requests" },
        { key: "demo-environments", label: "Demo environments" },
        { key: "activity", label: "Activity" },
      ],
    },
    {
      label: "Customer controls",
      items: [
        { key: "contracts", label: "Contracts" },
        { key: "access-policy", label: "Access policy" },
        { key: "approvals-publishing", label: "Approvals & publishing" },
      ],
    },
    {
      label: "Platform governance",
      items: [
        { key: "public-site", label: "nextf.lk" },
        { key: "backend-api", label: "Backend / API" },
        { key: "lifecycle", label: "Lifecycle & acceptance" },
      ],
    },
  ];

  return <div className="page website-platform-page">
    <SectionHeader eyebrow="NEXT F Digital" title="Website Platform" description="Operate customer workspaces, managed websites, customer access and publishing governance from one control surface." action={<div className="table-actions"><Button onClick={() => setLinkOpen(true)}><Link2 size={15}/>Link organization</Button><Button variant="primary" onClick={() => setWorkspaceOpen(true)}><Plus size={15}/>Request workspace</Button></div>} />

    <div className="compact-metrics website-platform-metrics">
      <MetricCard label="Customer workspaces" value={String(workspaces.length)} detail={`${workspaces.filter((item) => item.status === "active").length} active · ${workspaces.filter((item) => item.status === "provisioning").length} provisioning`} icon={Building2} />
      <MetricCard label="Memberships" value={String(memberships.filter((item) => item.status !== "revoked").length)} detail={`${memberships.filter((item) => item.status === "invited").length} awaiting customer lifecycle`} icon={BadgeCheck} />
      <MetricCard label="Managed sites" value={String(siteConnections.length)} detail={`${siteConnections.filter((item) => item.status === "connected").length} connected · ${siteConnections.filter((item) => item.status === "ready").length} ready`} icon={Globe2} />
      <MetricCard label="Contract" value={WEBSITE_CONTRACT_VERSION} detail={registryReadiness.ready ? "Registry authority trusted" : `${SITE_MANIFEST_FILENAME} · resolver pending`} icon={FileCheck2} />
    </div>

    <Card className="website-platform-nav" aria-label="Website Platform sections">
      {viewGroups.map((group) => <div className="website-platform-nav__group" key={group.label}>
        <span className="website-platform-nav__label">{group.label}</span>
        <div className="website-platform-nav__items">
          {group.items.map((item) => <button type="button" className={`website-platform-nav__item${view === item.key ? " is-active" : ""}`} key={item.key} onClick={() => setView(item.key)}>{item.label}</button>)}
        </div>
      </div>)}
    </Card>

    {view === "overview" && <>
      <div className="website-platform-overview-grid">
        <Card className="website-platform-readiness">
          <div className="card-section-heading">
            <div><strong>Operational readiness</strong><p>Live status across tenancy, contracts, managed-site delivery and production acceptance.</p></div>
            <Badge tone={productionAcceptanceSummary.productionReleaseAllowed ? "success" : "warning"}>{productionAcceptanceSummary.productionReleaseAllowed ? "Release ready" : `${productionAcceptanceSummary.criticalPending.length} gates open`}</Badge>
          </div>
          <div className="website-platform-status-list">
            <button type="button" className="website-platform-status-row" onClick={() => setView("workspaces")}><span><Building2 size={16}/><span><strong>Customer tenancy</strong><small>{workspaces.filter((item) => item.status === "active").length} active workspaces · {organizationLinks.filter((item) => item.status === "active").length} organization links</small></span></span><Badge tone={workspaces.some((item) => item.status === "active") ? "success" : "neutral"}>{workspaces.some((item) => item.status === "active") ? "Active" : "No tenants"}</Badge></button>
            <button type="button" className="website-platform-status-row" onClick={() => setView("contracts")}><span><FileCheck2 size={16}/><span><strong>Contract authority</strong><small>{registryReadiness.ready ? "Official Registry evidence is trusted" : "Canonical capability resolution remains fail-closed"}</small></span></span><Badge tone={registryReadiness.ready ? "success" : "warning"}>{registryReadiness.ready ? "Trusted" : "Pending"}</Badge></button>
            <button type="button" className="website-platform-status-row" onClick={() => setView("approvals-publishing")}><span><Globe2 size={16}/><span><strong>Managed-site delivery</strong><small>{siteConnections.filter((item) => item.status === "connected").length} connected sites · {applicationReceipts.length + publishingReceipts.length} execution receipts</small></span></span><Badge tone={siteConnections.some((item) => item.status === "connected") ? "success" : "neutral"}>{siteConnections.some((item) => item.status === "connected") ? "Connected" : "No connections"}</Badge></button>
            <button type="button" className="website-platform-status-row" onClick={() => setView("lifecycle")}><span><ShieldCheck size={16}/><span><strong>Production acceptance</strong><small>Evidence-gated release, lifecycle, retention and recovery controls</small></span></span><Badge tone={productionAcceptanceSummary.productionReleaseAllowed ? "success" : "warning"}>{productionAcceptanceSummary.productionReleaseAllowed ? "Passed" : "In progress"}</Badge></button>
          </div>
        </Card>

        <Card className="website-platform-quick-actions">
          <div className="card-section-heading"><div><strong>Operate the platform</strong><p>Jump directly to the workflows staff use most often.</p></div></div>
          <div className="website-platform-action-grid">
            <button type="button" onClick={() => setView("workspaces")}><span className="website-platform-action-grid__icon"><Building2 size={17}/></span><span><strong>Provision workspace</strong><small>Review eligibility, attach scope and activate tenancy.</small></span><ArrowRight size={16}/></button>
            <button type="button" onClick={() => setView("memberships")}><span className="website-platform-action-grid__icon"><UsersRound size={17}/></span><span><strong>Manage members</strong><small>Invite, suspend or revoke Customer Workspace access.</small></span><ArrowRight size={16}/></button>
            <button type="button" onClick={() => setView("contracts")}><span className="website-platform-action-grid__icon"><FileCheck2 size={17}/></span><span><strong>Validate contracts</strong><small>Review Registry, Site Manifest and canonical evidence.</small></span><ArrowRight size={16}/></button>
            <button type="button" onClick={() => setView("approvals-publishing")}><span className="website-platform-action-grid__icon"><BadgeCheck size={17}/></span><span><strong>Review changes</strong><small>Govern customer proposals, application and publication.</small></span><ArrowRight size={16}/></button>
          </div>
        </Card>
      </div>

      <Card className="website-platform-governance">
        <div className="card-section-heading"><div><strong>Governance guardrails</strong><p>Core rules stay visible without taking over the operational workspace.</p></div><Badge tone="info">Architecture</Badge></div>
        <div className="website-platform-guardrail-grid">
          <div><ShieldCheck size={16}/><span><strong>Provisioning is authorization</strong><small>Verified account, client, organization and eligible service/project relationships are prerequisites.</small></span></div>
          <div><FlaskConical size={16}/><span><strong>Demo is isolated</strong><small>Synthetic demo lifecycle cannot become a production customer workspace by status change.</small></span></div>
          <div><Boxes size={16}/><span><strong>Contracts stay fail-closed</strong><small>Only official Registry and Site Manifest evidence can resolve canonical capabilities and permissions.</small></span></div>
          <div><ShieldAlert size={16}/><span><strong>Customer access is an intersection</strong><small>The most restrictive contract, entitlement, role, resource, field and security rule wins.</small></span></div>
          <div><FileCheck2 size={16}/><span><strong>Approval is not publication</strong><small>Proposal, application and publication are separate auditable events with revision evidence.</small></span></div>
          <div><ShieldCheck size={16}/><span><strong>One authoritative backend</strong><small>Admin CMS and Customer Workspace use server-side principals and the same governed API boundary.</small></span></div>
          <div><Globe2 size={16}/><span><strong>nextf.lk stays first-party public</strong><small>Public projections and low-trust ingress never receive Customer Workspace tenancy or internal DB access.</small></span></div>
        </div>
      </Card>
    </>}

    {view === "workspaces" && <>
      <div className="website-platform-section-intro"><div><span>Tenancy operations</span><h3>Customer workspace provisioning</h3><p>Build the tenant relationship deliberately, review eligibility, then attach only authoritative Digital resources.</p></div><Badge tone="neutral">{workspaces.length} workspaces</Badge></div>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Digital client → Customer Organization</strong><p>Explicit commercial-to-tenancy relationship. A client profile is not itself the tenant.</p></div></div><DataTable rows={organizationLinks} columns={linkColumns} getKey={(row) => row.id} empty="No customer organization links."/></Card>
      <Card><PageToolbar query={query} onQueryChange={setQuery} placeholder="Search customer workspaces…"/><DataTable rows={filteredWorkspaces} columns={workspaceColumns} getKey={(row) => row.id} empty="No customer workspaces match this search." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Provisioning reviews</strong><p>Eligibility checks must be approved before workspace scope is attached and activation is allowed.</p></div><Button onClick={() => setReviewOpen(true)}><UserCheck size={15}/>Start review</Button></div><DataTable rows={provisioningReviews} columns={reviewColumns} getKey={(row) => row.id} empty="No provisioning reviews." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Explicit project & service scope</strong><p>These are references to existing NEXT F Digital records, not duplicated project/service copies.</p></div><Button onClick={() => setAttachOpen(true)}><Wrench size={15}/>Attach scope</Button></div><DataTable rows={attachments} columns={attachmentColumns} getKey={(row) => row.id} empty="No project or service scope attached." /></Card>
      <div className="website-platform-section-intro website-platform-section-intro--compact"><div><span>Website delivery</span><h3>Managed sites & migration</h3><p>Connect validated websites to active workspaces and keep legacy migration diagnostic-only.</p></div></div>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Managed site connections</strong><p>Each connection moves through explicit registration, manifest, validation, readiness, connection, suspension and revocation states.</p></div></div><DataTable rows={siteConnections} columns={connectionColumns} getKey={(row) => row.id} empty="No sites are connected to Customer Workspaces." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Legacy PortalAccess migration review</strong><p>Diagnostic only. No email-only conversion, legacy state copy or automatic production membership activation occurs.</p></div></div><DataTable rows={migrationAssessments} columns={migrationColumns} getKey={(row) => row.portalAccessId} empty="No legacy portal records." /></Card>
    </>}

    {view === "contracts" && <>
      <div className="compact-metrics">
        <MetricCard label="Contract pin" value={WEBSITE_CONTRACT_VERSION} detail={SITE_MANIFEST_FILENAME} icon={FileCheck2} />
        <MetricCard label="Registry source" value={registryReadiness.ready ? "Trusted" : "Unavailable"} detail={registryReadiness.ready ? registryReadiness.snapshot?.verificationAuthority ?? "verified" : "Canonical mapping blocked"} icon={ShieldCheck} />
        <MetricCard label="Manifest evidence" value={String(manifestEvidence.length)} detail={`${manifestEvidence.filter((item) => item.status === "valid").length} canonically valid`} icon={Boxes} />
        <MetricCard label="Validation evidence" value={String(validationEvidence.length)} detail="Immutable audit trail" icon={BadgeCheck} />
      </div>
      <Card className="architecture-callout"><strong><ShieldCheck size={16}/> Registry source gate</strong><p>{registryReadiness.reason} Public authority: {CONTRACT_REGISTRY_HUB} No manual UI action can mark a snapshot trusted; a production adapter must provide official CLI/API verification evidence.</p></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Contract Registry evidence</strong><p>Staged snapshots are not authoritative. Only an exact {WEBSITE_CONTRACT_VERSION} snapshot verified by the official Registry CLI or immutable Registry API can drive canonical resolution.</p></div></div><DataTable rows={registrySnapshots} columns={registryColumns} getKey={(row) => row.id} empty="No Contract Registry snapshot is available in this development environment." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Site Manifest evidence</strong><p>JSON receipt is not validation. Schema, exact version, Modules, Capabilities, Admin/Customer CMS metadata, API operations, permissions, scopes, events, webhooks and integrations remain fail-closed until the trusted resolver passes.</p></div></div><DataTable rows={manifestEvidence} columns={manifestColumns} getKey={(row) => row.id} empty={`No ${SITE_MANIFEST_FILENAME} evidence has been received.`} /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Canonical validation evidence</strong><p>Produced only by a trusted Registry adapter. Canonical IDs are stored exactly as resolved; the CMS does not invent or translate missing identifiers.</p></div></div><DataTable rows={validationEvidence} columns={validationColumns} getKey={(row) => row.id} empty="No canonical Contract validation has completed." /></Card>
    </>}

    {view === "access-policy" && <>
      <Card className="architecture-callout"><strong><SlidersHorizontal size={16}/> No canonical projection means no customer capability configuration</strong><p>The Admin CMS can only configure service entitlements, customer exposure, publishing, field policy and role permissions after official Contract resolver evidence has produced a canonical customer access projection for that exact validated Site Manifest. This release seeds no invented Module, Capability, field or Permission IDs.</p></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Canonical customer access projections</strong><p>Immutable resolver-derived maximums. Staff may restrict these further but cannot expand them.</p></div><MetricCard label="Resolved sites" value={String(canonicalAccessProjections.length)} detail="Official resolver projection only" icon={ShieldCheck}/></div><DataTable rows={canonicalAccessProjections} columns={[
        { key: "site", header: "Site", render: (row) => { const connection = siteConnections.find((item) => item.id === row.siteConnectionId); const site = sites.find((item) => item.id === connection?.siteId); return <div className="entity-cell"><strong>{site?.name ?? row.siteConnectionId}</strong><small>{site?.domain ?? row.siteConnectionId}</small></div>; } },
        { key: "contract", header: "Contract evidence", render: (row) => <div className="entity-cell"><strong>{row.contractVersion}</strong><small>{row.validationEvidenceId}</small></div> },
        { key: "capabilities", header: "Customer access metadata", render: (row) => <strong>{row.capabilities.length} capability(s)</strong> },
        { key: "authority", header: "Authority", render: (row) => <span>{row.verificationAuthority}</span> },
      ]} getKey={(row) => row.id} empty="No canonical customer access projection is available. Import it only from the official Contract resolver after V0.15 validation evidence exists." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Service capability entitlements</strong><p>An attached NEXT F Digital service can enable eligibility for a canonical capability, but entitlement can only restrict access further; it never overrides Contract or authorization.</p></div><Button onClick={() => setEntitlementOpen(true)} disabled={!policyConnections.length}><Plus size={15}/>Grant entitlement</Button></div><DataTable rows={serviceEntitlements} columns={entitlementColumns} getKey={(row) => row.id} empty="No service capability entitlements." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Customer Capability Access Policy</strong><p>Business exposure modes: hidden, read only, approval required, direct edit. Editing and publishing are independent.</p></div><Button onClick={() => setPolicyOpen(true)} disabled={!policyConnections.length}><SlidersHorizontal size={15}/>Set capability policy</Button></div><DataTable rows={capabilityPolicies} columns={capabilityPolicyColumns} getKey={(row) => row.id} empty="No customer capability policies. Missing policy intentionally fails closed." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Field-level customer restrictions</strong><p>Field policy references only canonical fields from the resolver projection. Internal, sensitive or hidden fields can never be made more permissive than the Contract maximum.</p></div></div><DataTable rows={fieldPolicies} columns={[
        { key: "capability", header: "Capability", render: (row) => <code className="inline-code">{row.capabilityId}</code> },
        { key: "field", header: "Canonical field", render: (row) => <code className="inline-code">{row.fieldPath}</code> },
        { key: "exposure", header: "Maximum customer exposure", render: (row) => <Badge tone={row.exposureMode === "hidden" ? "neutral" : row.exposureMode === "direct_edit" ? "success" : "warning"}>{row.exposureMode.replaceAll("_", " ")}</Badge> },
      ]} getKey={(row) => row.id} empty="No field-level customer policy overrides. Canonical field maximums and capability policy still apply." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Privacy & security restrictions</strong><p>These are deny/reduction overlays only. They cannot grant access or increase exposure.</p></div></div><DataTable rows={securityRestrictions} columns={[
        { key: "target", header: "Target", render: (row) => <div className="entity-cell"><strong>{row.capabilityId}</strong><small>{row.fieldPath ?? "Entire capability"}</small></div> },
        { key: "mode", header: "Restriction", render: (row) => <Badge tone={row.active ? "warning" : "neutral"}>{row.active ? row.mode.replaceAll("_", " ") : "disabled"}</Badge> },
        { key: "reason", header: "Reason", render: (row) => <span className="muted-cell">{row.reason}</span> },
        { key: "action", header: "", render: (row) => row.active ? <Button variant="ghost" onClick={() => runAction(() => customerCapabilityPolicyStore.disableSecurityRestriction(row.id, user.id), "Security restriction disabled")}>Disable</Button> : <span className="muted-cell">Disabled</span> },
      ]} getKey={(row) => row.id} empty="No additional privacy/security restrictions." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Customer role → exact canonical permission</strong><p>Customer business roles remain separate from Platform staff roles. Grants are Site-scoped and must reference Permission IDs resolved by the exact validated Contract.</p></div><Button onClick={() => setRolePermissionOpen(true)} disabled={!policyConnections.length}><KeyRound size={15}/>Grant role permission</Button></div><DataTable rows={rolePermissionGrants} columns={rolePermissionColumns} getKey={(row) => row.id} empty="No canonical customer role permission grants." /></Card>
    </>}

    {view === "approvals-publishing" && <>
      <div className="compact-metrics">
        <MetricCard label="Observed resource heads" value={String(managedResourceHeads.length)} detail="Revision references only — website stays authoritative" icon={RefreshCcw} />
        <MetricCard label="Open change requests" value={String(changeRequests.filter((row) => !["applied", "rejected", "cancelled"].includes(row.status)).length)} detail={`${changeRequests.filter((row) => row.status === "conflict").length} conflict(s)`} icon={FileCheck2} />
        <MetricCard label="Open publish requests" value={String(publishRequests.filter((row) => !["published", "rejected", "cancelled"].includes(row.status)).length)} detail={`${publishRequests.filter((row) => row.status === "conflict").length} conflict(s)`} icon={Globe2} />
        <MetricCard label="Execution receipts" value={String(applicationReceipts.length + publishingReceipts.length)} detail="Apply + publish adapter evidence" icon={BadgeCheck} />
      </div>
      <Card className="architecture-callout"><strong><ShieldCheck size={16}/> Optimistic concurrency is mandatory</strong><p>Every approval-required proposal references the external revision it was based on. If the connected website reports a newer authoritative revision before review, application or publication completes, the request moves to conflict and must be reviewed against the newer state.</p></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Customer change requests</strong><p>Proposal data remains separate from authoritative website state. Review decisions are immutable audit events; approval only authorizes a later adapter application.</p></div></div><DataTable rows={changeRequests} columns={changeRequestColumns} getKey={(row) => row.id} empty="No customer website change requests. Customer Workspace APIs will create these only when V0.16 resolves edit → change_request." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Publication governance</strong><p>Publishing is independent from editing and change approval. Staff-approval and direct-publish policies both require a separate execution receipt before the system records a revision as published.</p></div></div><DataTable rows={publishRequests} columns={publishRequestColumns} getKey={(row) => row.id} empty="No customer publication requests. Publishing requests are created only when the V0.16 evaluator authorizes publish_request or direct_publish." /></Card>
    </>}

    {view === "backend-api" && <>
      <div className="compact-metrics">
        <MetricCard label="V1 API operations" value={String(backendReadiness.operationCount)} detail={`${backendReadiness.queryCount} queries · ${backendReadiness.commandCount} commands`} icon={Boxes} />
        <MetricCard label="Idempotent mutations" value={`${backendReadiness.idempotentCommandCount}/${backendReadiness.commandCount}`} detail="Every registered mutation requires Idempotency-Key" icon={ShieldCheck} />
        <MetricCard label="Customer operations" value={String(backendReadiness.customerOperationCount)} detail="Workspace scope comes from authenticated membership" icon={UserCheck} />
        <MetricCard label="Production transport" value={backendReadiness.productionTransportConnected ? "Connected" : "Not connected"} detail="D1 staff state transport is source-connected; deployment remains pending" icon={Wrench} />
      </div>
      <Card className="architecture-callout"><strong><ShieldAlert size={16}/> V0.18 is a backend contract boundary, not a fake production server</strong><p>{backendReadiness.note}</p></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Shared V1 operation registry</strong><p>Both Admin CMS and Customer Workspace clients must call registered queries/commands. Mutating commands are idempotent, audited and authorized server-side.</p></div><Badge tone="success">Fail closed</Badge></div><DataTable rows={BACKEND_API_OPERATIONS} columns={backendOperationColumns} getKey={(row) => row.name} empty="No backend operations registered." /></Card>
      <div className="form-grid form-grid--two">
        <Card><div className="card-section-heading"><div><strong>Projection boundary</strong><p>Read models do not duplicate the system of record.</p></div></div><div className="settings-rows">{PROJECTION_RULES.map((rule) => <div className="settings-row" key={rule}><div><strong>{rule}</strong></div></div>)}</div></Card>
        <Card><div className="card-section-heading"><div><strong>Managed-site adapter rules</strong><p>Server-side bridge between governed workflow and connected websites.</p></div></div><div className="settings-rows">{MANAGED_SITE_ADAPTER_RULES.map((rule) => <div className="settings-row" key={rule}><div><strong>{rule}</strong></div></div>)}</div></Card>
      </div>
      <Card><div className="card-section-heading"><div><strong>Production adapter readiness</strong><p>Production mode now uses the D1-backed staff durable-state API; identity deployment and managed-site adapters remain separate production responsibilities.</p></div></div><div className="settings-rows">
        <div className="settings-row"><div><strong>Production identity/session provider</strong><small>Staff and customer authentication must mint trusted server principals.</small></div><Badge tone="warning">Pending adapter</Badge></div>
        <div className="settings-row"><div><strong>API transport</strong><small>Cloudflare Worker staff query/command router with D1 durable-state handlers.</small></div><Badge tone="success">Source connected</Badge></div>
        <div className="settings-row"><div><strong>Durable idempotency repository</strong><small>D1-backed command claims bind principal, operation and request hash before mutation.</small></div><Badge tone="success">Source connected</Badge></div>
        <div className="settings-row"><div><strong>Managed Site Adapter registry</strong><small>Server-side credential references and per-site adapters; secrets never enter either frontend.</small></div><Badge tone="warning">Pending adapter</Badge></div>
      </div></Card>
    </>}

    {view === "public-site" && <>
      <div className="compact-metrics">
        <MetricCard label="First-party host" value={NEXTF_PUBLIC_HOST} detail="NEXT F Digital public acquisition/delivery surface" icon={Globe2} />
        <MetricCard label="Published services" value={String(publicSiteReadiness.publishedServiceCount)} detail="Explicit safe projections only" icon={Boxes} />
        <MetricCard label="Verified route surfaces" value={`${publicSiteReadiness.verifiedRouteCount}/${publicSiteReadiness.totalRouteSurfaceCount}`} detail="No guessed route/component mapping" icon={Link2} />
        <MetricCard label="Conversion receipts" value={String(publicConversionReceipts.length)} detail="PII-free allowlisted event payloads" icon={Activity} />
      </div>
      <Card className="architecture-callout"><strong><ShieldCheck size={16}/> First-party does not mean trusted browser</strong><p><code className="inline-code">nextf.lk</code> is owned by NEXT F, but browser submissions remain low-trust. Lead/Demo writes require the shared backend boundary, idempotency and edge abuse protection. Public reads use safe projections; neither direction exposes internal stores.</p></Card>
      {!publicSiteReadiness.liveRouteWiringComplete && <Card className="architecture-callout"><strong><ShieldAlert size={16}/> Exact live-site wiring intentionally blocked</strong><p>{publicSiteReadiness.blocker} The CMS records logical surfaces now, but a route may only be marked verified with real source/component evidence.</p></Card>}
      <Card className="table-card"><div className="card-section-heading"><div><strong>Public projection inventory</strong><p>Publication is explicit. Source records remain authoritative; withdrawal removes public delivery without deleting the Digital/Help Center record.</p></div><Badge tone="success">No direct DB reads</Badge></div><DataTable rows={publicSitePublications} columns={publicProjectionColumns} getKey={(row) => row.id} empty="No resources are deliberately exposed to nextf.lk." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Live route/component inventory</strong><p>Logical integration surfaces are registered, but route paths and component evidence must come from the actual nextf.lk source or a verifiable live crawl.</p></div><Badge tone={publicSiteReadiness.sourceInventoryEvidenceCaptured ? "success" : "warning"}>{publicSiteReadiness.sourceInventoryEvidenceCaptured ? "Evidence captured" : "Source required"}</Badge></div><DataTable rows={publicRouteBindings} columns={publicRouteColumns} getKey={(row) => row.id} empty="No nextf.lk integration surfaces registered." /></Card>
      <div className="form-grid form-grid--two">
        <Card><div className="card-section-heading"><div><strong>Public projection rules</strong><p>These rules define what nextf.lk may consume.</p></div></div><div className="settings-rows">{PUBLIC_PROJECTION_RULES.map((rule) => <div className="settings-row" key={rule}><div><strong>{rule}</strong></div></div>)}</div></Card>
        <Card><div className="card-section-heading"><div><strong>First-party conversion event registry</strong><p>Business telemetry is allowlisted and forbids direct PII fields.</p></div></div><div className="settings-rows">{PUBLIC_CONVERSION_EVENTS.map((event) => <div className="settings-row" key={event.key}><div><strong>{event.key}</strong><small>{event.purpose} · payload: {event.allowedPayloadKeys.join(", ") || "none"}</small></div><Badge tone={event.enabled ? "success" : "neutral"}>{event.enabled ? "Enabled" : "Disabled"}</Badge></div>)}</div></Card>
      </div>
      <Card><div className="card-section-heading"><div><strong>Public API surfaces registered in V1</strong><p>Read projections and low-trust writes are separate from Customer Workspace APIs.</p></div></div><div className="settings-rows">{BACKEND_API_OPERATIONS.filter((operation) => operation.allowedPrincipals.includes("public")).map((operation) => <div className="settings-row" key={operation.name}><div><strong>{operation.name}</strong><small>{operation.description}</small></div><Badge tone={operation.kind === "command" ? "warning" : "neutral"}>{operation.kind}</Badge></div>)}</div></Card>
    </>}


    {view === "lifecycle" && <>
      <Card className="architecture-callout"><strong><ShieldAlert size={16}/> Billing state never automatically shuts down a managed website</strong><p>Offboarding is an explicit staff-governed workflow. Overdue invoices or past-due subscriptions can restrict service/workspace operations according to policy, but site suspension/revocation remains a separate deliberate action with audit evidence.</p></Card>
      <div className="compact-metrics">
        <MetricCard label="Offboarding plans" value={String(offboardingPlans.length)} detail={`${offboardingPlans.filter((row) => !["completed","cancelled"].includes(row.status)).length} open`} icon={Wrench} />
        <MetricCard label="Data exports" value={String(dataExports.length)} detail={`${dataExports.filter((row) => row.status === "ready").length} ready`} icon={FileCheck2} />
        <MetricCard label="Ownership records" value={String(assetOwnership.length)} detail="Explicit; never inferred" icon={KeyRound} />
        <MetricCard label="Contract migrations" value={String(contractMigrations.length)} detail="Official validation required" icon={RefreshCcw} />
      </div>
      <Card><div className="card-section-heading"><div><strong>Production acceptance ledger</strong><p>Source implementation does not equal production acceptance. Every critical gate must have concrete deployment/runtime evidence before the internal CMS may be released as V1.0.</p></div><Badge tone={productionAcceptanceSummary.productionReleaseAllowed ? "success" : "warning"}>{productionAcceptanceSummary.productionReleaseAllowed ? "Release allowed" : `${productionAcceptanceSummary.criticalPending.length} critical gates open`}</Badge></div><div className="settings-rows">
        {PRODUCTION_ACCEPTANCE_GATES.map((gate) => { const evidence = productionAcceptance.find((row) => row.gateId === gate.id); return <div className="settings-row" key={gate.id}><span>{gate.label}</span><strong>{(evidence?.status ?? gate.defaultStatus).replaceAll("_", " ")}</strong></div>; })}
      </div></Card>
      <Card><div className="card-section-heading"><div><strong>Lifecycle principles</strong><p>These policies govern customer exit, portability and contract evolution.</p></div></div><div className="settings-rows">
        <div className="settings-row"><span>Workspace offboarding</span><strong>review → restrict → export → site disposition → revoke memberships → close</strong></div>
        <div className="settings-row"><span>Data portability</span><strong>customer-visible/owned data only; internal notes, security, credentials and other-tenant data excluded</strong></div>
        <div className="settings-row"><span>Asset ownership</span><strong>must be explicitly confirmed from agreement/evidence; technical connection does not determine legal ownership</strong></div>
        <div className="settings-row"><span>Contract migration</span><strong>blocked until trusted target Registry + official compatibility validation</strong></div>
        <div className="settings-row"><span>Demo lifecycle</span><strong>synthetic-only expiry/reset/revocation remains separate from production customer tenancy</strong></div>
      </div></Card>
    </>}

    {view === "memberships" && <>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Customer Workspace memberships</strong><p>Invitation, acceptance, suspension and revocation are explicit lifecycle steps. Staff do not accept invitations on behalf of customers.</p></div><Button variant="primary" onClick={() => setMembershipOpen(true)}><UsersRound size={15}/>Invite member</Button></div><DataTable rows={memberships} columns={membershipColumns} getKey={(row) => row.id} empty="No Customer Workspace memberships." /></Card>
      <Card className="table-card"><div className="card-section-heading"><div><strong>Customer roles</strong><p>Business roles remain separate from Platform staff roles. Website permission bindings stay empty until Contracts are resolved.</p></div></div><DataTable rows={customerRoles} columns={roleColumns} getKey={(row) => row.id} empty="No customer roles." /></Card>
    </>}

    {view === "demo-requests" && <Card className="table-card"><div className="card-section-heading"><div><strong>Demo Access requests</strong><p>Submitted → review → approval/rejection → isolated environment provisioning. Approval alone grants no environment access.</p></div><div className="website-platform-header-stat"><span className="website-platform-header-stat__icon"><FlaskConical size={17}/></span><span><small>Open demo review</small><strong>{demoRequests.filter((item) => ["submitted", "under_review"].includes(item.status)).length}</strong><em>Independent lifecycle</em></span></div></div><DataTable rows={demoRequests} columns={demoColumns} getKey={(row) => row.id} empty="No demo access requests." /></Card>}

    {view === "demo-environments" && <Card className="table-card"><div className="card-section-heading"><div><strong>Isolated Demo Environments</strong><p>Synthetic sample data only. No real customer tenancy, production integrations, secrets, publishing path or production data.</p></div><RefreshCcw size={17}/></div><DataTable rows={demoEnvironments} columns={environmentColumns} getKey={(row) => row.id} empty="No isolated demo environments." /></Card>}

    {view === "activity" && <Card className="table-card"><div className="card-section-heading"><div><strong>Provisioning activity</strong><p>Dedicated lifecycle history supplements Platform Audit with workspace/demo provisioning context.</p></div><Activity size={17}/></div><DataTable rows={provisioningActivity} columns={activityColumns} getKey={(row) => row.id} empty="No provisioning activity." /></Card>}

    <Modal open={Boolean(selectedChangeDetail)} onClose={() => setChangeDetailId("")} title="Change request revision context" description="Proposal data is evidence only and remains separate from the authoritative connected-site resource until an approved application receipt is returned." footer={<Button onClick={() => setChangeDetailId("")}>Close</Button>}>
      {selectedChangeDetail && <div className="stack-list">
        <div className="entity-cell"><strong>Resource</strong><small>{selectedChangeDetail.resourceId} · {selectedChangeDetail.capabilityId}</small></div>
        <div className="entity-cell"><strong>Base revision</strong><small>{selectedChangeDetail.baseRevisionId} · hash {selectedChangeDetail.baseContentHash}</small></div>
        <div className="entity-cell"><strong>Contract validation evidence</strong><small>{selectedChangeDetail.validationEvidenceId}</small></div>
        <div className="entity-cell"><strong>Proposed field diff</strong><small>{selectedChangeDetail.proposedChanges.length} canonical field change(s)</small></div>
        {selectedChangeDetail.proposedChanges.map((change) => <div key={change.fieldPath} className="architecture-callout"><strong><code className="inline-code">{change.fieldPath}</code></strong><p>Proposed value: <code className="inline-code">{JSON.stringify(change.proposedValue)}</code></p></div>)}
      </div>}
    </Modal>

    <Modal open={reviewNoteOpen} onClose={() => setReviewNoteOpen(false)} title={reviewNoteAction.includes("changes") ? "Request changes" : "Reject request"} description="Reviewer decisions that return or reject customer work require an explicit audit note." footer={<><Button onClick={() => setReviewNoteOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitReviewDecisionNote}>Record decision</Button></>}><FormField label="Reviewer note" required><TextInput value={reviewDecisionNote} onChange={(event) => setReviewDecisionNote(event.target.value)} placeholder="Explain the required change or rejection reason"/></FormField></Modal>

    <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Link Digital client to customer organization" description="Creates an explicit business-profile → tenancy-owner relationship. It does not create an account, workspace, or membership." footer={<><Button onClick={() => setLinkOpen(false)}>Cancel</Button><Button variant="primary" onClick={linkOrganization}>Link organization</Button></>}><div className="form-grid form-grid--two"><FormField label="Digital client" required><SelectInput value={linkClientId} onChange={(event) => setLinkClientId(event.target.value)}><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company || client.name}</option>)}</SelectInput></FormField><FormField label="Customer organization" required><SelectInput value={linkOrganizationId} onChange={(event) => setLinkOrganizationId(event.target.value)}><option value="">Select customer organization</option>{customerOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</SelectInput></FormField></div></Modal>

    <Modal open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} title="Request customer workspace provisioning" description="Creates a requested tenancy record. Provisioning review, resource scope, workspace activation and membership invitation all remain separate later steps." footer={<><Button onClick={() => setWorkspaceOpen(false)}>Cancel</Button><Button variant="primary" onClick={requestWorkspace}>Create request</Button></>}><div className="form-grid form-grid--two"><FormField label="Client / customer organization link" required><SelectInput value={workspaceLinkId} onChange={(event) => setWorkspaceLinkId(event.target.value)}><option value="">Select relationship</option>{activeOrganizationLinks.map((link) => <option key={link.id} value={link.id}>{clients.find((client) => client.id === link.clientId)?.company ?? link.clientId} → {organizations.find((organization) => organization.id === link.organizationId)?.name ?? link.organizationId}</option>)}</SelectInput></FormField><FormField label="Workspace name"><TextInput value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Defaults to client company name"/></FormField></div></Modal>

    <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Start real-customer provisioning review" description="A verified NEXT F Account is selected for identity readiness. The review also evaluates the Digital client, customer organization link and eligible project/service relationship." footer={<><Button onClick={() => setReviewOpen(false)}>Cancel</Button><Button variant="primary" onClick={startReview}>Start review</Button></>}><div className="form-grid form-grid--two"><FormField label="Requested Customer Workspace" required><SelectInput value={reviewWorkspaceId} onChange={(event) => setReviewWorkspaceId(event.target.value)}><option value="">Select requested workspace</option>{requestedWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</SelectInput></FormField><FormField label="Primary verified NEXT F Account" required><SelectInput value={reviewAccountId} onChange={(event) => setReviewAccountId(event.target.value)}><option value="">Select verified account</option>{eligibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.displayName} · {account.primaryEmail}</option>)}</SelectInput></FormField><FormField label="Review note"><TextInput value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Eligibility or contract/service context"/></FormField></div></Modal>

    <Modal open={attachOpen} onClose={() => setAttachOpen(false)} title="Attach authoritative workspace scope" description="Projects and services remain NEXT F Digital records; sites remain Digital Sites plus Site Connection records. This action only creates explicit Customer Workspace relationships." footer={<><Button onClick={() => setAttachOpen(false)}>Close</Button><Button variant="primary" onClick={attachResource}>Attach selected resource</Button></>}><div className="form-grid form-grid--two"><FormField label="Provisioning workspace" required><SelectInput value={attachWorkspaceId} onChange={(event) => { setAttachWorkspaceId(event.target.value); setAttachResourceId(""); }}><option value="">Select provisioning workspace</option>{provisioningWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</SelectInput></FormField><FormField label="Resource type" required><SelectInput value={attachType} onChange={(event) => { setAttachType(event.target.value as AttachType); setAttachResourceId(""); }}><option value="project">Project</option><option value="service">Service</option><option value="site">Managed site</option></SelectInput></FormField><FormField label="Eligible authoritative resource" required><SelectInput value={attachResourceId} onChange={(event) => setAttachResourceId(event.target.value)}><option value="">Select eligible resource</option>{attachOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</SelectInput></FormField></div></Modal>

    <Modal open={manifestOpen} onClose={() => setManifestOpen(false)} title={`Receive ${SITE_MANIFEST_FILENAME}`} description="Stages the exact Site Manifest JSON as evidence. This does not make it valid or connected; canonical validation requires a trusted Contract Registry snapshot and official resolver output." footer={<><Button onClick={() => setManifestOpen(false)}>Cancel</Button><Button variant="primary" onClick={receiveManifest}>Receive manifest</Button></>}><div className="form-grid"><FormField label="Managed Site Connection" required><SelectInput value={manifestConnectionId} onChange={(event) => setManifestConnectionId(event.target.value)}><option value="">Select connection</option>{siteConnections.filter((row) => row.status !== "revoked").map((row) => { const site = sites.find((item) => item.id === row.siteId); return <option key={row.id} value={row.id}>{site?.name ?? row.siteId} · {site?.domain ?? row.id}</option>; })}</SelectInput></FormField><FormField label={`${SITE_MANIFEST_FILENAME} JSON`} required hint="Secrets, API keys and provider credentials must never be placed in the Site Manifest."><textarea className="text-input help-textarea" value={manifestJson} onChange={(event) => setManifestJson(event.target.value)} placeholder={`Paste the exact ${SITE_MANIFEST_FILENAME} JSON supplied by the managed website.`}/></FormField></div></Modal>

    <Modal open={entitlementOpen} onClose={() => setEntitlementOpen(false)} title="Grant service capability entitlement" description="Entitlement references an already-attached NEXT F Digital service and a canonical capability from the validated Site. It does not grant customer access by itself." footer={<><Button onClick={() => setEntitlementOpen(false)}>Cancel</Button><Button variant="primary" onClick={grantEntitlement}>Grant entitlement</Button></>}><div className="form-grid form-grid--two"><FormField label="Validated Site Connection" required><SelectInput value={policyConnectionId} onChange={(event) => { setPolicyConnectionId(event.target.value); setPolicyCapabilityId(""); setPolicyServiceId(""); }}><option value="">Select Site Connection</option>{policyConnections.map((connection) => { const site = sites.find((item) => item.id === connection.siteId); return <option key={connection.id} value={connection.id}>{site?.name ?? connection.siteId} · {site?.domain ?? connection.id}</option>; })}</SelectInput></FormField><FormField label="Attached NEXT F Digital service" required><SelectInput value={policyServiceId} onChange={(event) => setPolicyServiceId(event.target.value)}><option value="">Select attached service</option>{entitlementServiceOptions.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</SelectInput></FormField><FormField label="Canonical capability" required><SelectInput value={policyCapabilityId} onChange={(event) => setPolicyCapabilityId(event.target.value)}><option value="">Select canonical capability</option>{selectedProjection?.capabilities.map((capability) => <option key={capability.capabilityId} value={capability.capabilityId}>{capability.capabilityId}</option>)}</SelectInput></FormField></div></Modal>

    <Modal open={policyOpen} onClose={() => setPolicyOpen(false)} title="Set Customer Capability Access Policy" description="This business policy may only reduce the trusted canonical Contract maximum. Missing policy fails closed." footer={<><Button onClick={() => setPolicyOpen(false)}>Cancel</Button><Button variant="primary" onClick={setCapabilityPolicy}>Save policy</Button></>}><div className="form-grid form-grid--two"><FormField label="Validated Site Connection" required><SelectInput value={policyConnectionId} onChange={(event) => { setPolicyConnectionId(event.target.value); setPolicyCapabilityId(""); }}><option value="">Select Site Connection</option>{policyConnections.map((connection) => { const site = sites.find((item) => item.id === connection.siteId); return <option key={connection.id} value={connection.id}>{site?.name ?? connection.siteId}</option>; })}</SelectInput></FormField><FormField label="Canonical capability" required><SelectInput value={policyCapabilityId} onChange={(event) => setPolicyCapabilityId(event.target.value)}><option value="">Select capability</option>{selectedProjection?.capabilities.map((capability) => <option key={capability.capabilityId} value={capability.capabilityId}>{capability.capabilityId}</option>)}</SelectInput></FormField><FormField label="Customer exposure"><SelectInput value={policyExposureMode} onChange={(event) => setPolicyExposureMode(event.target.value as CustomerExposureMode)}>{["hidden","read_only","approval_required","direct_edit"].map((mode) => <option key={mode} value={mode}>{mode.replaceAll("_", " ")}</option>)}</SelectInput></FormField><FormField label="Customer publishing"><SelectInput value={policyPublishingMode} onChange={(event) => setPolicyPublishingMode(event.target.value as CustomerPublishingMode)}>{["not_applicable","staff_only","approval_required","direct_publish"].map((mode) => <option key={mode} value={mode}>{mode.replaceAll("_", " ")}</option>)}</SelectInput></FormField>{selectedPolicyCapability && <div className="field full"><span className="form-note">Canonical maximum: {selectedPolicyCapability.maximumExposure.replaceAll("_", " ")} · publishing {selectedPolicyCapability.maximumPublishing.replaceAll("_", " ")}. Staff policy cannot exceed these values.</span></div>}</div></Modal>

    <Modal open={fieldPolicyOpen} onClose={() => setFieldPolicyOpen(false)} title="Set field-level customer policy" description="Choose only a field resolved by the official Contract projection. The field rule may reduce access but cannot exceed the canonical field or capability maximum." footer={<><Button onClick={() => setFieldPolicyOpen(false)}>Cancel</Button><Button variant="primary" onClick={setFieldPolicy}>Save field policy</Button></>}><div className="form-grid form-grid--two"><FormField label="Canonical field" required><SelectInput value={fieldPolicyPath} onChange={(event) => setFieldPolicyPath(event.target.value)}><option value="">Select field</option>{canonicalFieldOptions.map((field) => <option key={field.fieldPath} value={field.fieldPath}>{field.fieldPath} · max {field.maximumExposure.replaceAll("_", " ")}</option>)}</SelectInput></FormField><FormField label="Customer exposure"><SelectInput value={fieldPolicyExposureMode} onChange={(event) => setFieldPolicyExposureMode(event.target.value as CustomerExposureMode)}>{["hidden","read_only","approval_required","direct_edit"].map((mode) => <option key={mode} value={mode}>{mode.replaceAll("_", " ")}</option>)}</SelectInput></FormField></div></Modal>

    <Modal open={securityRestrictionOpen} onClose={() => setSecurityRestrictionOpen(false)} title="Add privacy/security restriction" description="Restrictions are reduction-only overlays. Apply to the entire canonical capability or one resolved field." footer={<><Button onClick={() => setSecurityRestrictionOpen(false)}>Cancel</Button><Button variant="primary" onClick={addSecurityRestriction}>Add restriction</Button></>}><div className="form-grid form-grid--two"><FormField label="Field scope"><SelectInput value={fieldPolicyPath} onChange={(event) => setFieldPolicyPath(event.target.value)}><option value="">Entire capability</option>{canonicalFieldOptions.map((field) => <option key={field.fieldPath} value={field.fieldPath}>{field.fieldPath}</option>)}</SelectInput></FormField><FormField label="Restriction"><SelectInput value={securityRestrictionMode} onChange={(event) => setSecurityRestrictionMode(event.target.value as "hidden" | "read_only")}><option value="read_only">read only</option><option value="hidden">hidden</option></SelectInput></FormField><FormField label="Reason" required><TextInput value={securityRestrictionReason} onChange={(event) => setSecurityRestrictionReason(event.target.value)} placeholder="Privacy, security, contractual or operational reason"/></FormField></div></Modal>

    <Modal open={rolePermissionOpen} onClose={() => setRolePermissionOpen(false)} title="Grant exact canonical permission to customer role" description="The permission must be resolved by the validated Site Contract and referenced by its canonical customer access projection. Platform staff permissions are not involved." footer={<><Button onClick={() => setRolePermissionOpen(false)}>Cancel</Button><Button variant="primary" onClick={grantRolePermission}>Grant permission</Button></>}><div className="form-grid form-grid--two"><FormField label="Validated Site Connection" required><SelectInput value={policyConnectionId} onChange={(event) => { setPolicyConnectionId(event.target.value); setPolicyCapabilityId(""); setRolePermissionId(""); }}><option value="">Select Site Connection</option>{policyConnections.map((connection) => <option key={connection.id} value={connection.id}>{sites.find((item) => item.id === connection.siteId)?.name ?? connection.siteId}</option>)}</SelectInput></FormField><FormField label="Customer role" required><SelectInput value={rolePermissionRoleId} onChange={(event) => setRolePermissionRoleId(event.target.value)}>{activeRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectInput></FormField><FormField label="Capability context" required><SelectInput value={policyCapabilityId} onChange={(event) => { setPolicyCapabilityId(event.target.value); setRolePermissionId(""); }}><option value="">Select capability</option>{selectedProjection?.capabilities.map((capability) => <option key={capability.capabilityId} value={capability.capabilityId}>{capability.capabilityId}</option>)}</SelectInput></FormField><FormField label="Exact canonical Permission ID" required><SelectInput value={rolePermissionId} onChange={(event) => setRolePermissionId(event.target.value)}><option value="">Select Permission ID</option>{canonicalPermissionOptions.map((permissionId) => <option key={permissionId} value={permissionId}>{permissionId}</option>)}</SelectInput></FormField></div></Modal>

    <Modal open={membershipOpen} onClose={() => setMembershipOpen(false)} title="Invite Customer Workspace member" description="Requires a verified active NEXT F Account and an already-active Customer Workspace. Invitation is pending until accepted in the future Customer Workspace authentication flow." footer={<><Button onClick={() => setMembershipOpen(false)}>Cancel</Button><Button variant="primary" onClick={inviteMember}>Create invitation</Button></>}><div className="form-grid form-grid--two"><FormField label="NEXT F Account" required><SelectInput value={memberAccountId} onChange={(event) => setMemberAccountId(event.target.value)}><option value="">Select verified account</option>{eligibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.displayName} · {account.primaryEmail}</option>)}</SelectInput></FormField><FormField label="Customer Workspace" required><SelectInput value={memberWorkspaceId} onChange={(event) => setMemberWorkspaceId(event.target.value)}><option value="">Select active workspace</option>{activeWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</SelectInput></FormField><FormField label="Customer role" required><SelectInput value={memberRoleId} onChange={(event) => setMemberRoleId(event.target.value)}>{activeRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectInput></FormField></div></Modal>
  </div>;
}

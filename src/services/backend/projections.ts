export type StaffWorkspaceProjection = {
  workspaceId: string;
  workspaceName: string;
  workspaceStatus: string;
  organizationId: string;
  clientId: string;
  provisioningStatus?: string;
  attachedProjectIds: string[];
  attachedServiceIds: string[];
  connectedSiteIds: string[];
  membershipCounts: { active: number; invited: number; suspended: number };
  operationalFlags: string[];
};

export type CustomerWorkspaceProjection = {
  workspaceId: string;
  name: string;
  organizationId: string;
  status: "active" | "read_only";
  membership: { membershipId: string; customerRoleId: string };
  projectIds: string[];
  serviceIds: string[];
  sites: Array<{ siteConnectionId: string; siteId: string; lifecycle: string; contractVersion: string; customerCapabilitiesReady: boolean }>;
};

export type DemoWorkspaceProjection = {
  demoEnvironmentId: string;
  environmentKey: string;
  templateVersion: string;
  status: "active";
  expiresAt: string;
  dataPolicy: "synthetic_only";
  restrictions: string[];
};

export const PROJECTION_RULES = [
  "Staff and customer projections may originate from the same authoritative business entities but are different DTOs.",
  "Customer projections exclude staff notes, internal audit detail, credentials, secrets, infrastructure configuration and unrestricted operational metadata.",
  "Customer projections are always derived through authenticated workspace scope; a workspace ID supplied by the browser is never sufficient authorization.",
  "Demo projections contain synthetic-only resources and never join against real Customer Workspace records.",
  "A public/customer projection is not a second system of record; it is a safe read model over authoritative records.",
] as const;


export type PublicSiteBootstrapProjection = {
  host: "nextf.lk";
  siteKey: string;
  business: "next-f-digital";
  tenancy: "first_party";
  contentDeliveryMode: "safe-projection";
  accountRegistration: { status: "unmapped" | "verified"; href?: string };
  customerWorkspaceSignIn: { status: "unmapped" | "verified"; href?: string };
};

export const PUBLIC_PROJECTION_RULES = [
  "nextf.lk is a first-party NEXT F Digital surface, not a Customer Workspace tenant and not a fake Digital Client.",
  "Public reads are allowlisted projections over authoritative NEXT F Digital/Help Center records; publication is explicit and withdrawal does not delete the source record.",
  "Public projections never expose internal notes, client identifiers, project values, invoices, membership data, audit data, credentials, secrets or infrastructure configuration.",
  "Public lead and Demo Access writes enter dedicated backend commands; the website frontend never writes directly to internal stores or databases.",
  "Exact public routes/components remain unmapped until verified from the real nextf.lk source or a verifiable live crawl.",
] as const;

import { platformStore } from "../../platform/services/platformStore";
import { helpCenterStore } from "../../platform/help-center/data/helpCenterStore";
import { digitalStore } from "../data/digitalStore";
import { websitePlatformStore } from "./websitePlatformStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export const NEXTF_PUBLIC_HOST = "nextf.lk";
export const NEXTF_PUBLIC_SITE_KEY = "nextf-digital-main";

export type PublicProjectionKind = "service" | "case_study" | "help_article" | "help_faq";
export type PublicProjectionStatus = "draft" | "published" | "withdrawn";
export type PublicRouteSurface = "lead_form" | "demo_access" | "account_registration" | "customer_workspace_sign_in" | "services" | "case_studies" | "help_resources" | "conversion_events";
export type RouteInventoryStatus = "unmapped" | "verified" | "retired";

export type FirstPartySiteIntegrationRecord = {
  siteKey: string;
  host: typeof NEXTF_PUBLIC_HOST;
  business: "next-f-digital";
  ownerOrganizationId: "org_nextf";
  tenancy: "first_party";
  sourceInventoryStatus: "source_required" | "partial" | "verified";
  publicDeliveryMode: "projection_api";
  directInternalDatabaseAccess: false;
  updatedAt: string;
};

export type PublicProjectionPublicationRecord = {
  id: string;
  kind: PublicProjectionKind;
  sourceId: string;
  publicId: string;
  slug: string;
  status: PublicProjectionStatus;
  publicFields: string[];
  publicTitle?: string;
  publicSummary?: string;
  publishedAt?: string;
  publishedBy?: string;
  withdrawnAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicRouteBindingRecord = {
  id: string;
  surface: PublicRouteSurface;
  status: RouteInventoryStatus;
  route?: string;
  componentEvidence?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  updatedAt: string;
};

export type PublicConversionEventKey =
  | "lead_submitted"
  | "demo_access_requested"
  | "account_entry_clicked"
  | "workspace_sign_in_clicked"
  | "service_interest"
  | "case_study_viewed";

export type PublicConversionEventDefinition = {
  key: PublicConversionEventKey;
  purpose: string;
  allowedPayloadKeys: string[];
  forbiddenPiiKeys: string[];
  enabled: boolean;
};

export type PublicConversionReceipt = {
  id: string;
  eventKey: PublicConversionEventKey;
  anonymousSessionId: string;
  payload: Record<string, string | number | boolean>;
  requestId: string;
  occurredAt: string;
};

export type PublicLeadSubmissionInput = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  servicePublicId?: string;
  message?: string;
  privacyAccepted: boolean;
  marketingAccepted?: boolean;
  sourceSurface?: string;
};

export type PublicDemoRequestInput = {
  name: string;
  email: string;
  company: string;
  privacyAccepted: boolean;
};

export type PublicServiceProjection = {
  id: string;
  slug: string;
  name: string;
  family?: string;
  description?: string;
  billingModel?: string;
  priceLkr?: number;
  duration?: string;
};

export type PublicCaseStudyProjection = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  serviceName?: string;
};

export type PublicHelpProjection = {
  articles: Array<{ id: string; slug: string; title: string; summary: string; body?: string }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
};

const KEYS = {
  publications: "nextf.v0.19.digital.public-site-publications",
  routes: "nextf.v0.19.digital.public-site-route-bindings",
  conversionReceipts: "nextf.v0.19.digital.public-site-conversion-receipts",
};

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const publicationSeed: PublicProjectionPublicationRecord[] = [
  { id: "public_projection_service_1", kind: "service", sourceId: "svc_web_business", publicId: "service-business-website", slug: "business-website", status: "draft", publicFields: ["name", "family", "description", "billingModel", "basePrice", "duration"], createdAt: ago(20), updatedAt: ago(20) },
  { id: "public_projection_service_2", kind: "service", sourceId: "svc_web_maintenance", publicId: "service-website-maintenance", slug: "website-maintenance", status: "draft", publicFields: ["name", "family", "description", "billingModel", "basePrice", "duration"], createdAt: ago(20), updatedAt: ago(20) },
  { id: "public_projection_help_1", kind: "help_article", sourceId: "ha_2", publicId: "help-track-digital-project", slug: "track-digital-project", status: "draft", publicFields: ["title", "summary", "body"], createdAt: ago(12), updatedAt: ago(12) },
];

const routeSeed: PublicRouteBindingRecord[] = [
  "lead_form", "demo_access", "account_registration", "customer_workspace_sign_in", "services", "case_studies", "help_resources", "conversion_events",
].map((surface) => ({ id: `public_route_${surface}`, surface: surface as PublicRouteSurface, status: "unmapped", updatedAt: ago(1) }));

export const PUBLIC_CONVERSION_EVENTS: PublicConversionEventDefinition[] = [
  { key: "lead_submitted", purpose: "Measure successful public lead intake.", allowedPayloadKeys: ["service_public_id", "source_surface"], forbiddenPiiKeys: ["name", "email", "phone", "company", "message"], enabled: true },
  { key: "demo_access_requested", purpose: "Measure successful Demo Access Request intake.", allowedPayloadKeys: ["source_surface"], forbiddenPiiKeys: ["name", "email", "phone", "company", "message"], enabled: true },
  { key: "account_entry_clicked", purpose: "Measure account registration entry intent.", allowedPayloadKeys: ["source_surface", "cta_id"], forbiddenPiiKeys: ["name", "email", "phone", "company", "message"], enabled: true },
  { key: "workspace_sign_in_clicked", purpose: "Measure Customer Workspace sign-in entry intent.", allowedPayloadKeys: ["source_surface", "cta_id"], forbiddenPiiKeys: ["name", "email", "phone", "company", "message"], enabled: true },
  { key: "service_interest", purpose: "Measure engagement with a deliberately public service projection.", allowedPayloadKeys: ["service_public_id", "source_surface", "cta_id"], forbiddenPiiKeys: ["name", "email", "phone", "company", "message"], enabled: true },
  { key: "case_study_viewed", purpose: "Measure engagement with a deliberately public case-study projection.", allowedPayloadKeys: ["content_public_id", "source_surface"], forbiddenPiiKeys: ["name", "email", "phone", "company", "message"], enabled: true },
];

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:website-platform", { detail: key }));
  return result;
}

function requirePublicSource(kind: PublicProjectionKind, sourceId: string) {
  if (kind === "service") return digitalStore.getServices().find((row) => row.id === sourceId);
  if (kind === "case_study") return digitalStore.getProjects().find((row) => row.id === sourceId && row.status === "completed");
  if (kind === "help_article") return helpCenterStore.getArticles().find((row) => row.id === sourceId && row.status === "published" && ["all", "digital"].includes(row.audience));
  return helpCenterStore.getFaqs().find((row) => row.id === sourceId && row.status === "published" && ["all", "digital"].includes(row.audience));
}

function validateRoute(route: string) {
  const value = route.trim();
  if (!value) throw new Error("Verified route/path is required");
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (url.hostname !== NEXTF_PUBLIC_HOST && url.hostname !== `www.${NEXTF_PUBLIC_HOST}`) throw new Error("Route must belong to nextf.lk");
    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message === "Route must belong to nextf.lk") throw error;
    throw new Error("Route must be a nextf.lk URL or an absolute path");
  }
}

function normalizedEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("A valid email address is required");
  return email;
}

export const publicSiteIntegrationStore = {
  getSiteIntegration(): FirstPartySiteIntegrationRecord {
    const routes = this.getRouteBindings(); const verifiedCount = routes.filter((row) => row.status === "verified").length; return { siteKey: NEXTF_PUBLIC_SITE_KEY, host: NEXTF_PUBLIC_HOST, business: "next-f-digital", ownerOrganizationId: "org_nextf", tenancy: "first_party", sourceInventoryStatus: verifiedCount === 0 ? "source_required" : verifiedCount === routes.length ? "verified" : "partial", publicDeliveryMode: "projection_api", directInternalDatabaseAccess: false, updatedAt: new Date().toISOString() };
  },

  getPublications: () => read(KEYS.publications, publicationSeed),
  getRouteBindings: () => read(KEYS.routes, routeSeed),
  getConversionReceipts: () => read<PublicConversionReceipt[]>(KEYS.conversionReceipts, []),

  upsertPublication(input: { kind: PublicProjectionKind; sourceId: string; publicId?: string; slug?: string; publicFields: string[]; publicTitle?: string; publicSummary?: string; actorId: string }) {
    const source = requirePublicSource(input.kind, input.sourceId);
    if (!source) throw new Error("Only an existing eligible authoritative source can be staged for nextf.lk");
    if (!input.publicFields.length) throw new Error("At least one deliberate public field is required");
    const rows = this.getPublications();
    const existing = rows.find((row) => row.kind === input.kind && row.sourceId === input.sourceId && row.status !== "withdrawn");
    const timestamp = new Date().toISOString();
    const publicId = input.publicId?.trim() || existing?.publicId || `${input.kind}-${slugify(input.sourceId)}`;
    const slug = slugify(input.slug || existing?.slug || ("name" in source ? String(source.name) : "title" in source ? String(source.title) : "question" in source ? String(source.question) : input.sourceId));
    if (!slug) throw new Error("A stable public slug is required");
    const row: PublicProjectionPublicationRecord = { id: existing?.id ?? uid("public_projection"), kind: input.kind, sourceId: input.sourceId, publicId, slug, status: existing?.status === "published" ? "published" : "draft", publicFields: [...new Set(input.publicFields)], publicTitle: input.publicTitle?.trim() || undefined, publicSummary: input.publicSummary?.trim() || undefined, publishedAt: existing?.publishedAt, publishedBy: existing?.publishedBy, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp };
    write(KEYS.publications, [row, ...rows.filter((item) => item.id !== row.id)]);
    platformStore.addAudit("Admin", "nextf.lk public projection staged", row.publicId, "NEXT F Digital", `${row.kind} source ${row.sourceId}; fields: ${row.publicFields.join(", ")}.`, "info");
    return row;
  },

  publishProjection(id: string, actorId: string) {
    const rows = this.getPublications();
    const target = rows.find((row) => row.id === id);
    if (!target) throw new Error("Public projection not found");
    if (!requirePublicSource(target.kind, target.sourceId)) throw new Error("Authoritative source is no longer eligible for public delivery");
    const timestamp = new Date().toISOString();
    const updated = { ...target, status: "published" as const, publishedAt: timestamp, publishedBy: actorId, updatedAt: timestamp };
    write(KEYS.publications, [updated, ...rows.filter((row) => row.id !== id)]);
    platformStore.addAudit("Admin", "nextf.lk public projection published", updated.publicId, "NEXT F Digital", `Published safe ${updated.kind} projection only; internal source remains authoritative.`, "info");
    return updated;
  },

  withdrawProjection(id: string, actorId: string) {
    const rows = this.getPublications();
    const target = rows.find((row) => row.id === id);
    if (!target) throw new Error("Public projection not found");
    const timestamp = new Date().toISOString();
    const updated = { ...target, status: "withdrawn" as const, withdrawnAt: timestamp, updatedAt: timestamp };
    write(KEYS.publications, [updated, ...rows.filter((row) => row.id !== id)]);
    platformStore.addAudit("Admin", "nextf.lk public projection withdrawn", updated.publicId, "NEXT F Digital", `Public delivery withdrawn by ${actorId}; authoritative source was not deleted.`, "warning");
    return updated;
  },

  verifyRouteBinding(surface: PublicRouteSurface, route: string, componentEvidence: string, actorId: string) {
    if (!componentEvidence.trim()) throw new Error("Source/component evidence is required before a route can be marked verified");
    const verifiedRoute = validateRoute(route);
    const rows = this.getRouteBindings();
    const target = rows.find((row) => row.surface === surface);
    if (!target) throw new Error("Public route surface not registered");
    const timestamp = new Date().toISOString();
    const updated: PublicRouteBindingRecord = { ...target, status: "verified", route: verifiedRoute, componentEvidence: componentEvidence.trim(), verifiedBy: actorId, verifiedAt: timestamp, updatedAt: timestamp };
    write(KEYS.routes, rows.map((row) => row.id === target.id ? updated : row));
    platformStore.addAudit("Admin", "nextf.lk route binding verified", surface, "NEXT F Digital", `${verifiedRoute} · evidence: ${componentEvidence.trim()}`, "info");
    return updated;
  },

  buildPublicBootstrap() {
    const routes = this.getRouteBindings();
    const account = routes.find((row) => row.surface === "account_registration");
    const signIn = routes.find((row) => row.surface === "customer_workspace_sign_in");
    return {
      host: NEXTF_PUBLIC_HOST as typeof NEXTF_PUBLIC_HOST,
      siteKey: NEXTF_PUBLIC_SITE_KEY,
      business: "next-f-digital" as const,
      tenancy: "first_party" as const,
      contentDeliveryMode: "safe-projection" as const,
      accountRegistration: { status: account?.status === "verified" ? "verified" as const : "unmapped" as const, ...(account?.status === "verified" && account.route ? { href: account.route } : {}) },
      customerWorkspaceSignIn: { status: signIn?.status === "verified" ? "verified" as const : "unmapped" as const, ...(signIn?.status === "verified" && signIn.route ? { href: signIn.route } : {}) },
    };
  },

  buildPublicServices(): PublicServiceProjection[] {
    const services = digitalStore.getServices();
    return this.getPublications().filter((row) => row.kind === "service" && row.status === "published").flatMap((row) => {
      const source = services.find((item) => item.id === row.sourceId && item.active);
      if (!source) return [];
      const fields = new Set(row.publicFields);
      return [{ id: row.publicId, slug: row.slug, name: row.publicTitle || source.name, ...(fields.has("family") ? { family: source.family } : {}), ...(fields.has("description") ? { description: row.publicSummary || source.description } : {}), ...(fields.has("billingModel") ? { billingModel: source.billingModel } : {}), ...(fields.has("basePrice") ? { priceLkr: source.basePrice } : {}), ...(fields.has("duration") ? { duration: source.duration } : {}) }];
    });
  },

  buildPublicCaseStudies(): PublicCaseStudyProjection[] {
    const projects = digitalStore.getProjects();
    const services = digitalStore.getServices();
    return this.getPublications().filter((row) => row.kind === "case_study" && row.status === "published").flatMap((row) => {
      const project = projects.find((item) => item.id === row.sourceId && item.status === "completed");
      if (!project || !row.publicTitle || !row.publicSummary) return [];
      const service = services.find((item) => item.id === project.serviceId);
      return [{ id: row.publicId, slug: row.slug, title: row.publicTitle, summary: row.publicSummary, serviceName: service?.name }];
    });
  },

  buildPublicHelp(): PublicHelpProjection {
    const articles = helpCenterStore.getArticles();
    const faqs = helpCenterStore.getFaqs();
    const publications = this.getPublications().filter((row) => row.status === "published");
    return {
      articles: publications.filter((row) => row.kind === "help_article").flatMap((row) => {
        const source = articles.find((item) => item.id === row.sourceId && item.status === "published" && ["all", "digital"].includes(item.audience));
        if (!source) return [];
        const fields = new Set(row.publicFields);
        return [{ id: row.publicId, slug: row.slug, title: row.publicTitle || source.title, summary: row.publicSummary || source.summary, ...(fields.has("body") ? { body: source.body } : {}) }];
      }),
      faqs: publications.filter((row) => row.kind === "help_faq").flatMap((row) => {
        const source = faqs.find((item) => item.id === row.sourceId && item.status === "published" && ["all", "digital"].includes(item.audience));
        return source ? [{ id: row.publicId, question: row.publicTitle || source.question, answer: row.publicSummary || source.answer }] : [];
      }),
    };
  },

  submitPublicLead(input: PublicLeadSubmissionInput) {
    if (!input.privacyAccepted) throw new Error("Privacy acknowledgement is required before a public enquiry is accepted");
    const email = normalizedEmail(input.email);
    const name = input.name.trim().slice(0, 200);
    if (!name) throw new Error("Contact name is required");
    const publicService = input.servicePublicId ? this.buildPublicServices().find((row) => row.id === input.servicePublicId) : undefined;
    if (input.servicePublicId && !publicService) throw new Error("Selected service is not currently available through the public projection");
    const publication = input.servicePublicId ? this.getPublications().find((row) => row.publicId === input.servicePublicId && row.kind === "service" && row.status === "published") : undefined;
    return digitalStore.addLead({ name, company: input.company?.trim().slice(0, 200) ?? "", email, phone: input.phone?.trim().slice(0, 80) ?? "", source: "nextf.lk", serviceId: publication?.sourceId, estimatedValue: 0, nextAction: "Review public website enquiry", enquiryDetail: input.message?.trim().slice(0, 5000), sourceContext: input.sourceSurface?.trim().slice(0, 120) || "public-site", privacyConsentAt: new Date().toISOString(), marketingConsentAt: input.marketingAccepted ? new Date().toISOString() : undefined });
  },

  submitPublicDemoRequest(input: PublicDemoRequestInput) {
    if (!input.privacyAccepted) throw new Error("Privacy acknowledgement is required before a Demo Access Request is accepted");
    return websitePlatformStore.submitDemoRequest({ name: input.name, email: normalizedEmail(input.email), company: input.company });
  },

  recordConversion(input: { eventKey: PublicConversionEventKey; anonymousSessionId: string; payload: Record<string, unknown>; requestId: string }) {
    const definition = PUBLIC_CONVERSION_EVENTS.find((row) => row.key === input.eventKey && row.enabled);
    if (!definition) throw new Error("Conversion event is not enabled");
    if (!input.anonymousSessionId.trim()) throw new Error("Anonymous session identifier is required");
    const payload: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(input.payload)) {
      if (definition.forbiddenPiiKeys.includes(key)) throw new Error(`PII key ${key} is forbidden in conversion event payloads`);
      if (!definition.allowedPayloadKeys.includes(key)) throw new Error(`Payload key ${key} is not allowlisted for ${input.eventKey}`);
      if (!["string", "number", "boolean"].includes(typeof value)) throw new Error(`Payload key ${key} must be scalar`);
      payload[key] = value as string | number | boolean;
    }
    const receipt: PublicConversionReceipt = { id: uid("public_conversion"), eventKey: input.eventKey, anonymousSessionId: input.anonymousSessionId.trim().slice(0, 160), payload, requestId: input.requestId, occurredAt: new Date().toISOString() };
    write(KEYS.conversionReceipts, [receipt, ...this.getConversionReceipts()].slice(0, 500));
    return receipt;
  },

  getReadiness() {
    const routes = this.getRouteBindings();
    const publications = this.getPublications();
    return {
      host: NEXTF_PUBLIC_HOST,
      firstPartyTenancyCorrect: true,
      directInternalDatabaseAccess: false,
      sourceInventoryEvidenceCaptured: routes.some((row) => row.status === "verified"),
      verifiedRouteCount: routes.filter((row) => row.status === "verified").length,
      totalRouteSurfaceCount: routes.length,
      publishedServiceCount: publications.filter((row) => row.kind === "service" && row.status === "published").length,
      publishedCaseStudyCount: publications.filter((row) => row.kind === "case_study" && row.status === "published").length,
      publishedHelpCount: publications.filter((row) => ["help_article", "help_faq"].includes(row.kind) && row.status === "published").length,
      publicLeadIngressMode: "backend-command" as const,
      demoRequestIngressMode: "backend-command" as const,
      contentDeliveryMode: "safe-projection" as const,
      productionTransportConnected: false,
      liveRouteWiringComplete: routes.every((row) => row.status === "verified"),
      blocker: routes.every((row) => row.status === "verified") ? undefined : "Exact nextf.lk route/component wiring is blocked until the public-site source or a verifiable live crawl is available.",
    };
  },
};

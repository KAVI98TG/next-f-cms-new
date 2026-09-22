import type { Permission } from "../../app/auth/types";
import type { PrincipalKind } from "./types";

export type BackendQueryName =
  | "staff.session.get"
  | "staff.state.snapshot.get"
  | "staff.state.document.get"
  | "staff.workspace.get"
  | "staff.workspace.activity.list"
  | "staff.website-platform.queue.list"
  | "staff.gaming.supplier.funding.snapshot.get"
  | "staff.gaming.supplier.funding.payment.get"
  | "customer.workspace.get"
  | "customer.projects.list"
  | "customer.sites.list"
  | "customer.approvals.list"
  | "customer.billing.summary"
  | "demo.workspace.get"
  | "demo.sample-data.list"
  | "public.site.bootstrap.get"
  | "public.services.list"
  | "public.case-studies.list"
  | "public.help.list";

export type BackendCommandName =
  | "staff.state.document.put"
  | "staff.state.document.delete"
  | "staff.workspace.provision.review"
  | "staff.workspace.activate"
  | "staff.membership.invite"
  | "staff.change.review.start"
  | "staff.change.approve"
  | "staff.change.reject"
  | "staff.publish.approve"
  | "staff.lifecycle.offboarding.create"
  | "staff.lifecycle.offboarding.review"
  | "staff.lifecycle.offboarding.start"
  | "staff.lifecycle.site-disposition.apply"
  | "staff.lifecycle.offboarding.complete"
  | "staff.data-export.request"
  | "staff.asset-ownership.confirm"
  | "staff.contract-migration.create"
  | "staff.production-acceptance.record"
  | "staff.system.maintenance.run"
  | "staff.gaming.supplier.funding.create"
  | "staff.gaming.supplier.funding.verify"
  | "customer.change.submit"
  | "customer.publish.submit"
  | "customer.support.create"
  | "customer.approval.respond"
  | "demo.sample-data.mutate"
  | "public.lead.submit"
  | "public.demo-access.request"
  | "public.conversion.track"
  | "service.site.revision.observe"
  | "service.site.change.applied"
  | "service.site.publication.completed";

export type ApiOperationDefinition = {
  name: BackendQueryName | BackendCommandName;
  kind: "query" | "command";
  allowedPrincipals: PrincipalKind[];
  workspaceScoped: boolean;
  idempotency: "not_applicable" | "required";
  staffPermissions?: Permission[];
  serviceScopes?: string[];
  description: string;
};

export const BACKEND_API_OPERATIONS: ApiOperationDefinition[] = [
  { name: "staff.session.get", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "not_applicable", description: "Return the verified Cloudflare Access-bound production staff principal and authoritative server permissions." },
  { name: "staff.state.snapshot.get", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "not_applicable", description: "Permission-filtered D1 durable-state bootstrap for the internal CMS frontend." },
  { name: "staff.state.document.get", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "not_applicable", description: "Read one permission-filtered durable CMS state document." },
  { name: "staff.state.document.put", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "required", description: "Optimistically write one D1-backed CMS state document with server permission enforcement and audit evidence." },
  { name: "staff.state.document.delete", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "required", description: "Soft-delete one D1-backed CMS state document with server permission enforcement and audit evidence." },
  { name: "staff.system.maintenance.run", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "required", staffPermissions: ["platform.cleanup.manage"], description: "Run production demo-expiry, retention and idempotency maintenance immediately with audited evidence." },
  { name: "staff.gaming.supplier.funding.create", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "required", staffPermissions: ["gaming.suppliers.manage","gaming.finance.manage"], description: "Create a FazerCards wallet-funding invoice using current provider methods and limits without exposing provider credentials to the browser." },
  { name: "staff.gaming.supplier.funding.verify", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "required", staffPermissions: ["gaming.suppliers.manage","gaming.finance.manage"], description: "Verify a Binance Pay FazerCards funding payment by provider payment id and Binance Order ID." },
  { name: "staff.workspace.get", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "not_applicable", staffPermissions: ["digital.website-platform.manage"], description: "Internal staff projection for one Customer Workspace." },
  { name: "staff.workspace.activity.list", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "not_applicable", staffPermissions: ["digital.website-platform.manage"], description: "Internal operational/audit activity for one Customer Workspace." },
  { name: "staff.website-platform.queue.list", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "not_applicable", staffPermissions: ["digital.website-platform.manage"], description: "Internal website-platform operations queue." },
  { name: "staff.gaming.supplier.funding.snapshot.get", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "not_applicable", staffPermissions: ["gaming.suppliers.manage","gaming.finance.manage"], description: "Read live FazerCards balance, available funding methods and recent audited funding intents through the server-only Gaming bridge." },
  { name: "staff.gaming.supplier.funding.payment.get", kind: "query", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "not_applicable", staffPermissions: ["gaming.suppliers.manage","gaming.finance.manage"], description: "Reconcile one previously created FazerCards funding payment through the server-only Gaming bridge." },
  { name: "customer.workspace.get", kind: "query", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "not_applicable", description: "Customer-safe projection of the principal's own workspace." },
  { name: "customer.projects.list", kind: "query", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "not_applicable", description: "Customer-visible projects attached to the current workspace." },
  { name: "customer.sites.list", kind: "query", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "not_applicable", description: "Customer-visible managed sites attached to the current workspace." },
  { name: "customer.approvals.list", kind: "query", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "not_applicable", description: "Customer-visible approval/change/publication workflow projection." },
  { name: "customer.billing.summary", kind: "query", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "not_applicable", description: "Customer-safe billing summary; no internal finance notes or payment secrets." },
  { name: "demo.workspace.get", kind: "query", allowedPrincipals: ["demo"], workspaceScoped: false, idempotency: "not_applicable", description: "Synthetic demo workspace projection only." },
  { name: "demo.sample-data.list", kind: "query", allowedPrincipals: ["demo"], workspaceScoped: false, idempotency: "not_applicable", description: "Synthetic demonstration dataset only." },
  { name: "public.site.bootstrap.get", kind: "query", allowedPrincipals: ["public"], workspaceScoped: false, idempotency: "not_applicable", description: "First-party nextf.lk bootstrap/readiness projection with no internal secrets or workspace scope." },
  { name: "public.services.list", kind: "query", allowedPrincipals: ["public"], workspaceScoped: false, idempotency: "not_applicable", description: "Explicitly published NEXT F Digital service projection only; internal service records remain authoritative." },
  { name: "public.case-studies.list", kind: "query", allowedPrincipals: ["public"], workspaceScoped: false, idempotency: "not_applicable", description: "Explicitly published completed-project case-study projection only; project commercial/internal fields remain private." },
  { name: "public.help.list", kind: "query", allowedPrincipals: ["public"], workspaceScoped: false, idempotency: "not_applicable", description: "Explicitly published NEXT F Digital/all-audience Help Center projection only." },
  { name: "staff.workspace.provision.review", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Run/record workspace provisioning review through the shared backend." },
  { name: "staff.workspace.activate", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Activate an eligible workspace after provisioning rules pass." },
  { name: "staff.membership.invite", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Invite a verified NEXT F Account to a Customer Workspace." },
  { name: "staff.change.review.start", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Begin staff review without applying website content." },
  { name: "staff.change.approve", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Approve proposal evidence; application remains a separate adapter action." },
  { name: "staff.change.reject", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Reject a customer proposal with audit evidence." },
  { name: "staff.publish.approve", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Authorize publication; publishing remains a separate adapter action." },
  { name: "staff.lifecycle.offboarding.create", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Create an explicit customer workspace offboarding plan. Billing state alone never performs a managed-site shutdown." },
  { name: "staff.lifecycle.offboarding.review", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Review an offboarding plan before restrictions or revocations are applied." },
  { name: "staff.lifecycle.offboarding.start", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Move a reviewed workspace into controlled offboarding and suspend customer membership access." },
  { name: "staff.lifecycle.site-disposition.apply", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Apply a separately approved managed-site suspend/revoke disposition during offboarding." },
  { name: "staff.lifecycle.offboarding.complete", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Complete offboarding only after export/site/membership prerequisites are satisfied." },
  { name: "staff.data-export.request", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Request a scoped customer portability export excluding staff/security/secrets and other-tenant data." },
  { name: "staff.asset-ownership.confirm", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Record evidence-based asset ownership/portability; technical connection never determines legal ownership." },
  { name: "staff.contract-migration.create", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: true, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Create a fail-closed Site Contract migration plan requiring trusted target Registry compatibility evidence." },
  { name: "staff.production-acceptance.record", kind: "command", allowedPrincipals: ["staff"], workspaceScoped: false, idempotency: "required", staffPermissions: ["digital.website-platform.manage"], description: "Record concrete production acceptance evidence; source completeness alone cannot release V1.0." },
  { name: "customer.change.submit", kind: "command", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "required", description: "Submit an authorized customer change proposal." },
  { name: "customer.publish.submit", kind: "command", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "required", description: "Submit or directly authorize a publication request according to effective policy." },
  { name: "customer.support.create", kind: "command", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "required", description: "Create a support request against the authoritative NEXT F Digital workflow." },
  { name: "customer.approval.respond", kind: "command", allowedPrincipals: ["customer"], workspaceScoped: true, idempotency: "required", description: "Respond to an eligible customer approval task." },
  { name: "demo.sample-data.mutate", kind: "command", allowedPrincipals: ["demo"], workspaceScoped: false, idempotency: "required", description: "Mutate disposable synthetic demo data only; never a production resource." },
  { name: "public.lead.submit", kind: "command", allowedPrincipals: ["public"], workspaceScoped: false, idempotency: "required", description: "Low-trust nextf.lk lead ingress. Creates a governed NEXT F Digital intake record after edge abuse controls; never grants account/workspace access." },
  { name: "public.demo-access.request", kind: "command", allowedPrincipals: ["public"], workspaceScoped: false, idempotency: "required", description: "Low-trust nextf.lk Demo Access Request ingress. Submission enters staff review and never auto-provisions a Demo Environment." },
  { name: "public.conversion.track", kind: "command", allowedPrincipals: ["public"], workspaceScoped: false, idempotency: "required", description: "Collect an allowlisted first-party conversion event without direct PII." },
  { name: "service.site.revision.observe", kind: "command", allowedPrincipals: ["service"], workspaceScoped: false, idempotency: "required", serviceScopes: ["managed-site:revision:observe"], description: "Record immutable managed-site resource revision evidence." },
  { name: "service.site.change.applied", kind: "command", allowedPrincipals: ["service"], workspaceScoped: false, idempotency: "required", serviceScopes: ["managed-site:change:receipt"], description: "Record managed-site change application receipt." },
  { name: "service.site.publication.completed", kind: "command", allowedPrincipals: ["service"], workspaceScoped: false, idempotency: "required", serviceScopes: ["managed-site:publish:receipt"], description: "Record managed-site publishing receipt." },
];

export function getApiOperation(name: BackendQueryName | BackendCommandName) {
  return BACKEND_API_OPERATIONS.find((operation) => operation.name === name);
}

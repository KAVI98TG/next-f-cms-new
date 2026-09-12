import type { ServicePackage, DigitalLead, DigitalOpportunity, DigitalProposal, DigitalClient, DigitalInvoice, DigitalProject, DigitalTask, DigitalDeliverable, DigitalApproval, DigitalSubscription, DigitalSite, DigitalTicket, DigitalWorkflow, DigitalActivity } from "./types";

export const KEYS = {
  services: "nextf.v0.4.digital.services",
  leads: "nextf.v0.4.digital.leads",
  opportunities: "nextf.v0.4.digital.opportunities",
  proposals: "nextf.v0.4.digital.proposals",
  clients: "nextf.v0.4.digital.clients",
  invoices: "nextf.v0.4.digital.invoices",
  projects: "nextf.v0.4.digital.projects",
  tasks: "nextf.v0.4.digital.tasks",
  deliverables: "nextf.v0.4.digital.deliverables",
  approvals: "nextf.v0.4.digital.approvals",
  subscriptions: "nextf.v0.4.digital.subscriptions",
  sites: "nextf.v0.4.digital.sites",
  tickets: "nextf.v0.4.digital.tickets",
  workflows: "nextf.v0.4.digital.workflows",
  activity: "nextf.v0.4.digital.activity",
};

const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
export const ahead = (days: number) => new Date(now + days * 86_400_000).toISOString();

export const seedServices: ServicePackage[] = [
  { id: "svc_web_business", name: "Business Website", family: "Website Design & Development", description: "Conversion-focused responsive business website with launch support.", billingModel: "one_time", basePrice: 180000, duration: "4-6 weeks", active: true, template: ["Discovery", "Requirements", "UI Design", "Development", "Content", "QA", "Client Review", "Deployment", "Handover"] },
  { id: "svc_web_maintenance", name: "Website Maintenance", family: "Website Maintenance", description: "Ongoing updates, monitoring, backups and technical support.", billingModel: "monthly", basePrice: 12500, duration: "Monthly", active: true, template: ["Health review", "Updates", "Backup verification", "Issue resolution", "Monthly summary"] },
  { id: "svc_seo_growth", name: "SEO Growth", family: "SEO", description: "Technical, on-page and authority growth program with monthly reporting.", billingModel: "monthly", basePrice: 45000, duration: "Monthly", active: true, template: ["SEO Audit", "Technical Fixes", "Keyword Research", "On-page Work", "Content", "Authority Work", "Tracking", "Monthly Report"] },
  { id: "svc_marketing", name: "Digital Marketing Retainer", family: "Digital Marketing", description: "Campaign planning, execution, optimization and reporting.", billingModel: "retainer", basePrice: 65000, duration: "Monthly", active: true, template: ["Planning", "Campaign Setup", "Creative Coordination", "Optimization", "Reporting"] },
  { id: "svc_social", name: "Social Media Management", family: "Social Media Marketing", description: "Monthly content planning, publishing and performance management.", billingModel: "monthly", basePrice: 55000, duration: "Monthly", active: true, template: ["Content Planning", "Creative Preparation", "Client Approval", "Scheduling", "Publishing", "Monitoring", "Performance Report"] },
  { id: "svc_content", name: "Content Services", family: "Content Services", description: "Web, campaign and brand content delivered to an agreed scope.", billingModel: "custom", basePrice: 25000, duration: "By scope", active: true, template: ["Brief", "Research", "Draft", "Review", "Revision", "Delivery"] },
  { id: "svc_analytics", name: "Analytics & Reporting", family: "Analytics", description: "Measurement setup, dashboards and recurring performance reporting.", billingModel: "monthly", basePrice: 30000, duration: "Monthly", active: true, template: ["Measurement Audit", "Tracking Setup", "Dashboard", "Review", "Report"] },
  { id: "svc_custom", name: "Custom Digital Solution", family: "Custom Digital Solutions", description: "Custom technical or digital engagement scoped around client requirements.", billingModel: "custom", basePrice: 100000, duration: "By scope", active: true, template: ["Discovery", "Scope", "Plan", "Build", "QA", "Approval", "Delivery"] },
];

export const seedLeads: DigitalLead[] = [
  { id: "lead_1", name: "Nadeesha Perera", company: "Ceylon Roots", email: "nadeesha@example.com", phone: "+94 77 555 0192", source: "Website", serviceId: "svc_web_business", estimatedValue: 220000, status: "contacted", owner: "Admin", nextAction: "Discovery call tomorrow", createdAt: ago(72), updatedAt: ago(5) },
  { id: "lead_2", name: "Ruwan Silva", company: "Peak Fitness LK", email: "ruwan@example.com", phone: "+94 71 444 8120", source: "Referral", serviceId: "svc_marketing", estimatedValue: 195000, status: "new", owner: "Admin", nextAction: "Initial response", createdAt: ago(18), updatedAt: ago(18) },
  { id: "lead_3", name: "Shenali Fernando", company: "Ocean Bloom", email: "shenali@example.com", phone: "+94 76 333 8221", source: "Instagram", serviceId: "svc_social", estimatedValue: 165000, status: "qualified", owner: "Admin", nextAction: "Prepare service proposal", createdAt: ago(120), updatedAt: ago(12) },
];

export const seedOpportunities: DigitalOpportunity[] = [
  { id: "opp_1", leadId: "lead_3", name: "Ocean Bloom Social Launch", company: "Ocean Bloom", serviceId: "svc_social", value: 165000, stage: "proposal", probability: 65, nextAction: "Send proposal", expectedCloseAt: ahead(8), createdAt: ago(110), updatedAt: ago(12) },
  { id: "opp_2", name: "Atlas Dental Website Refresh", company: "Atlas Dental", serviceId: "svc_web_business", value: 280000, stage: "negotiation", probability: 80, nextAction: "Confirm final scope", expectedCloseAt: ahead(5), createdAt: ago(170), updatedAt: ago(9) },
];

export const seedClients: DigitalClient[] = [
  { id: "client_1", name: "Amal Jayasinghe", company: "Lanka Craft House", email: "amal@example.com", phone: "+94 77 880 1188", status: "active", since: ago(2400), notes: "Website and recurring SEO client." },
  { id: "client_2", name: "Mihiri Dias", company: "Serene Stay", email: "mihiri@example.com", phone: "+94 70 220 4477", status: "active", since: ago(1500), notes: "Website maintenance client." },
];

export const seedProposals: DigitalProposal[] = [
  { id: "prop_1", number: "NF-P-1001", opportunityId: "opp_2", title: "Atlas Dental Website Refresh", serviceId: "svc_web_business", amount: 280000, status: "sent", validUntil: ahead(9), createdAt: ago(50), updatedAt: ago(9) },
];

export const seedProjects: DigitalProject[] = [
  { id: "proj_1", clientId: "client_1", serviceId: "svc_seo_growth", name: "Lanka Craft House SEO Growth", status: "active", progress: 62, startAt: ago(720), dueAt: ahead(12), value: 45000, milestones: seedServices[2].template.map((title, index) => ({ id: `m1_${index}`, title, done: index < 4 })), createdAt: ago(720), updatedAt: ago(8) },
  { id: "proj_2", clientId: "client_2", serviceId: "svc_web_maintenance", name: "Serene Stay Website Maintenance", status: "awaiting_client", progress: 85, startAt: ago(420), dueAt: ahead(4), value: 12500, milestones: seedServices[1].template.map((title, index) => ({ id: `m2_${index}`, title, done: index < 4 })), createdAt: ago(420), updatedAt: ago(20) },
];

export const seedInvoices: DigitalInvoice[] = [
  { id: "inv_1", number: "NF-I-2001", clientId: "client_1", projectId: "proj_1", subscriptionId: "sub_1", amount: 45000, paidAmount: 45000, status: "paid", issuedAt: ago(250), dueAt: ago(200), paidAt: ago(205) },
  { id: "inv_2", number: "NF-I-2002", clientId: "client_2", projectId: "proj_2", subscriptionId: "sub_2", amount: 12500, paidAmount: 0, status: "issued", issuedAt: ago(24), dueAt: ahead(6) },
];

export const seedTasks: DigitalTask[] = [
  { id: "task_1", projectId: "proj_1", title: "Publish September SEO content brief", status: "in_progress", owner: "Admin", dueAt: ahead(2), createdAt: ago(72), updatedAt: ago(5) },
  { id: "task_2", projectId: "proj_1", title: "Review search performance dashboard", status: "todo", owner: "Admin", dueAt: ahead(5), createdAt: ago(72), updatedAt: ago(8) },
  { id: "task_3", projectId: "proj_2", title: "Share maintenance summary", status: "done", owner: "Admin", dueAt: ahead(1), createdAt: ago(48), updatedAt: ago(12) },
];

export const seedDeliverables: DigitalDeliverable[] = [
  { id: "del_1", projectId: "proj_1", name: "Monthly SEO Performance Report", status: "ready", note: "Ready to send after internal review.", createdAt: ago(20), updatedAt: ago(3) },
  { id: "del_2", projectId: "proj_2", name: "Maintenance Summary", status: "sent", note: "Sent to client for acknowledgement.", createdAt: ago(30), updatedAt: ago(6) },
];

export const seedApprovals: DigitalApproval[] = [
  { id: "app_1", projectId: "proj_2", title: "Monthly maintenance completion", status: "pending", requestedAt: ago(20), note: "Waiting for client acknowledgement." },
];

export const seedSubscriptions: DigitalSubscription[] = [
  { id: "sub_1", clientId: "client_1", serviceId: "svc_seo_growth", projectId: "proj_1", name: "Lanka Craft House SEO Growth", amount: 45000, frequency: "monthly", status: "active", startedAt: ago(720), nextBillingAt: ahead(12), nextRenewalAt: ahead(12), graceDays: 7 },
  { id: "sub_2", clientId: "client_2", serviceId: "svc_web_maintenance", projectId: "proj_2", name: "Serene Stay Website Maintenance", amount: 12500, frequency: "monthly", status: "active", startedAt: ago(420), nextBillingAt: ahead(6), nextRenewalAt: ahead(6), graceDays: 7 },
];

export const seedSites: DigitalSite[] = [
  { id: "site_1", clientId: "client_1", projectId: "proj_1", name: "Lanka Craft House", domain: "lankacrafthouse.lk", productionUrl: "https://lankacrafthouse.lk", status: "online", sslStatus: "valid", domainExpiresAt: ahead(170), maintenancePlan: "Website Maintenance", lastDeploymentAt: ago(96), lastBackupAt: ago(8), responseMs: 384, billingState: "paid", updatedAt: ago(2) },
  { id: "site_2", clientId: "client_2", projectId: "proj_2", name: "Serene Stay", domain: "serenestay.lk", productionUrl: "https://serenestay.lk", status: "degraded", sslStatus: "expiring", domainExpiresAt: ahead(22), maintenancePlan: "Website Maintenance", lastDeploymentAt: ago(240), lastBackupAt: ago(30), responseMs: 1150, billingState: "due", updatedAt: ago(1) },
];

export const seedTickets: DigitalTicket[] = [
  { id: "ticket_1", number: "NF-S-3001", clientId: "client_2", projectId: "proj_2", siteId: "site_2", subject: "Slow loading on accommodation pages", detail: "Client reports slower page loading during evening traffic.", priority: "high", status: "in_progress", owner: "Admin", createdAt: ago(18), updatedAt: ago(2) },
  { id: "ticket_2", number: "NF-S-3002", clientId: "client_1", projectId: "proj_1", subject: "Update seasonal campaign banner", detail: "Replace the current homepage promotional artwork.", priority: "normal", status: "open", owner: "Admin", createdAt: ago(6), updatedAt: ago(6) },
];

export const seedWorkflows: DigitalWorkflow[] = [
  { id: "wf_1", name: "New lead acknowledgement", trigger: "Lead created", action: "Queue acknowledgement email", status: "active", runs: 42, lastRunAt: ago(18) },
  { id: "wf_2", name: "Proposal follow-up", trigger: "Proposal sent + 3 days", action: "Create follow-up reminder", status: "active", runs: 18, lastRunAt: ago(9) },
  { id: "wf_3", name: "Invoice due reminder", trigger: "Invoice due in 3 days", action: "Queue payment reminder", status: "active", runs: 31, lastRunAt: ago(20) },
  { id: "wf_4", name: "Site incident alert", trigger: "Site health degraded", action: "Create admin notification", status: "active", runs: 7, lastRunAt: ago(1) },
  { id: "wf_5", name: "Renewal reminder", trigger: "Renewal due in 14 days", action: "Create renewal reminder", status: "active", runs: 15, lastRunAt: ago(40) },
];

export const seedActivity: DigitalActivity[] = [
  { id: "act_1", title: "Proposal sent", detail: "Atlas Dental Website Refresh · NF-P-1001", entityType: "proposal", entityId: "prop_1", tone: "info", createdAt: ago(9) },
  { id: "act_2", title: "Project awaiting client", detail: "Serene Stay Website Maintenance is ready for client review.", entityType: "project", entityId: "proj_2", tone: "warning", createdAt: ago(20) },
  { id: "act_3", title: "Lead received", detail: "Peak Fitness LK requested digital marketing services.", entityType: "lead", entityId: "lead_2", tone: "neutral", createdAt: ago(18) },
  { id: "act_4", title: "Site health degraded", detail: "Serene Stay response time crossed the local health threshold.", entityType: "site", entityId: "site_2", tone: "warning", createdAt: ago(1) },
];

export function read<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try { return JSON.parse(raw) as T; }
  catch {
    window.localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
}

export function write<T>(key: string, value: T): T {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("nextf:digital-store", { detail: key }));
  return value;
}

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function sequentialNumber(prefix: string, rows: Array<{ number: string }>, base: number) {
  const max = rows.reduce((current, row) => {
    const value = Number(row.number.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(current, value) : current;
  }, base);
  return `${prefix}${max + 1}`;
}

export function activity(title: string, detail: string, entityType: DigitalActivity["entityType"], entityId: string, tone: DigitalActivity["tone"] = "neutral") {
  const items = read(KEYS.activity, seedActivity);
  const next: DigitalActivity = { id: id("act"), title, detail, entityType, entityId, tone, createdAt: new Date().toISOString() };
  write(KEYS.activity, [next, ...items].slice(0, 300));
  return next;
}

export function recurringFrequency(service?: ServicePackage): "monthly" | "annual" | null {
  if (!service) return null;
  if (["monthly", "retainer"].includes(service.billingModel)) return "monthly";
  if (service.billingModel === "annual") return "annual";
  return null;
}


export function resetDigitalCore() {
  Object.values(KEYS).forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent("nextf:digital-store", { detail: "reset" }));
}

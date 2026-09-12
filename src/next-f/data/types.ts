
export type LeadStatus = "new" | "contacted" | "qualified" | "lost";
export type OpportunityStage = "discovery" | "proposal" | "negotiation" | "won" | "lost";
export type ProposalStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type ClientStatus = "active" | "prospect" | "inactive";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled" | "refunded";
export type ProjectStatus = "planned" | "active" | "blocked" | "awaiting_client" | "completed" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type DeliverableStatus = "draft" | "ready" | "sent" | "approved" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "changes_requested";
export type SubscriptionStatus = "active" | "paused" | "past_due" | "cancelled";
export type SiteStatus = "online" | "degraded" | "offline" | "maintenance";
export type TicketStatus = "open" | "in_progress" | "waiting_client" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type WorkflowStatus = "active" | "paused";

export type ServicePackage = {
  id: string;
  name: string;
  family: string;
  description: string;
  billingModel: "one_time" | "monthly" | "annual" | "retainer" | "custom";
  basePrice: number;
  duration: string;
  active: boolean;
  template: string[];
};

export type DigitalLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  serviceId: string;
  estimatedValue: number;
  status: LeadStatus;
  owner: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
};

export type DigitalOpportunity = {
  id: string;
  leadId?: string;
  clientId?: string;
  name: string;
  company: string;
  serviceId: string;
  value: number;
  stage: OpportunityStage;
  probability: number;
  nextAction: string;
  expectedCloseAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DigitalProposal = {
  id: string;
  number: string;
  opportunityId: string;
  clientId?: string;
  title: string;
  serviceId: string;
  amount: number;
  status: ProposalStatus;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
};

export type DigitalClient = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: ClientStatus;
  sourceLeadId?: string;
  since: string;
  notes: string;
};

export type DigitalInvoice = {
  id: string;
  number: string;
  clientId: string;
  projectId?: string;
  proposalId?: string;
  subscriptionId?: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
};

export type DigitalProject = {
  id: string;
  clientId: string;
  proposalId?: string;
  serviceId: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  startAt?: string;
  dueAt: string;
  value: number;
  milestones: Array<{ id: string; title: string; done: boolean }>;
  createdAt: string;
  updatedAt: string;
};

export type DigitalTask = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  owner: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DigitalDeliverable = {
  id: string;
  projectId: string;
  name: string;
  status: DeliverableStatus;
  url?: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type DigitalApproval = {
  id: string;
  projectId: string;
  title: string;
  status: ApprovalStatus;
  requestedAt: string;
  respondedAt?: string;
  note: string;
};

export type DigitalSubscription = {
  id: string;
  clientId: string;
  serviceId: string;
  projectId?: string;
  name: string;
  amount: number;
  frequency: "monthly" | "annual";
  status: SubscriptionStatus;
  startedAt: string;
  nextBillingAt: string;
  nextRenewalAt: string;
  graceDays: number;
};

export type DigitalSite = {
  id: string;
  clientId: string;
  projectId?: string;
  name: string;
  domain: string;
  productionUrl: string;
  status: SiteStatus;
  sslStatus: "valid" | "expiring" | "issue";
  domainExpiresAt: string;
  maintenancePlan: string;
  lastDeploymentAt?: string;
  lastBackupAt?: string;
  responseMs: number;
  billingState: "paid" | "due" | "overdue";
  updatedAt: string;
};

export type DigitalTicket = {
  id: string;
  number: string;
  clientId: string;
  projectId?: string;
  siteId?: string;
  subject: string;
  detail: string;
  priority: TicketPriority;
  status: TicketStatus;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export type DigitalWorkflow = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: WorkflowStatus;
  runs: number;
  lastRunAt?: string;
};

export type DigitalActivity = {
  id: string;
  title: string;
  detail: string;
  entityType: "lead" | "opportunity" | "proposal" | "client" | "invoice" | "project" | "service" | "subscription" | "site" | "ticket" | "workflow" | "deliverable" | "approval" | "task";
  entityId: string;
  tone: "neutral" | "success" | "warning" | "info";
  createdAt: string;
};


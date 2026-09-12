export type HelpAudience = "all" | "digital" | "gaming" | "software";
export type HelpContentStatus = "draft" | "published" | "archived";
export type HelpRequestPriority = "low" | "normal" | "high" | "urgent";
export type HelpRequestStatus = "new" | "routed" | "in_progress" | "waiting_customer" | "resolved" | "closed";

export type HelpCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  audience: HelpAudience;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HelpArticle = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  categoryId: string;
  audience: HelpAudience;
  status: HelpContentStatus;
  featured: boolean;
  views: number;
  updatedAt: string;
};

export type HelpFaq = {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
  audience: HelpAudience;
  status: HelpContentStatus;
  order: number;
  updatedAt: string;
};

export type HelpAnnouncement = {
  id: string;
  title: string;
  message: string;
  audience: HelpAudience;
  status: HelpContentStatus;
  publishAt: string;
  expiresAt?: string;
  updatedAt: string;
};

export type HelpSavedReply = {
  id: string;
  title: string;
  shortcut: string;
  body: string;
  audience: HelpAudience;
  active: boolean;
  updatedAt: string;
};

export type HelpRequest = {
  id: string;
  number: string;
  customerName: string;
  email: string;
  business: Exclude<HelpAudience, "all"> | "unassigned";
  subject: string;
  detail: string;
  priority: HelpRequestPriority;
  status: HelpRequestStatus;
  assignedTo?: string;
  internalNote?: string;
  source: "help_center" | "admin";
  createdAt: string;
  updatedAt: string;
};

export type HelpFeedback = {
  id: string;
  articleId?: string;
  audience: HelpAudience;
  rating: "helpful" | "not_helpful";
  comment: string;
  email?: string;
  createdAt: string;
};

export type HelpCenterSettings = {
  name: string;
  contactEmail: string;
  welcomeTitle: string;
  welcomeText: string;
  defaultAudience: HelpAudience;
  enableSearch: boolean;
  enableFeedback: boolean;
  enableContactRequests: boolean;
  allowAnonymousRequests: boolean;
  autoRouteRequests: boolean;
};

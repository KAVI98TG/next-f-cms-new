export type Permission =
  | "platform.read"
  | "platform.users.manage"
  | "platform.access.manage"
  | "platform.audit.read"
  | "platform.settings.manage"
  | "platform.organizations.manage"
  | "platform.domains.manage"
  | "platform.security.manage"
  | "platform.logs.read"
  | "platform.backup.manage"
  | "platform.cleanup.manage"
  | "platform.help.manage"
  | "digital.read"
  | "digital.sales.manage"
  | "digital.projects.manage"
  | "digital.billing.manage"
  | "digital.sites.manage"
  | "digital.settings.manage"
  | "gaming.read"
  | "gaming.orders.manage"
  | "gaming.products.manage"
  | "gaming.suppliers.manage"
  | "gaming.finance.manage"
  | "software.read"
  | "software.products.manage"
  | "software.releases.manage"
  | "software.licenses.manage"
  | "software.billing.manage";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: string;
  permissions: Permission[];
};

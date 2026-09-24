export const permissionValues = [
  "platform.read",
  "platform.users.manage",
  "platform.access.manage",
  "platform.audit.read",
  "platform.settings.manage",
  "platform.organizations.manage",
  "platform.domains.manage",
  "platform.security.manage",
  "platform.logs.read",
  "platform.backup.manage",
  "platform.cleanup.manage",
  "platform.help.manage",
  "marketing.analytics.view",
  "marketing.tracking.view",
  "digital.read",
  "digital.sales.manage",
  "digital.projects.manage",
  "digital.billing.manage",
  "digital.sites.manage",
  "digital.website-platform.manage",
  "digital.settings.manage",
  "gaming.read",
  "gaming.orders.manage",
  "gaming.products.manage",
  "gaming.suppliers.manage",
  "gaming.finance.manage",
  "software.read",
  "software.products.manage",
  "software.releases.manage",
  "software.licenses.manage",
  "software.billing.manage",
] as const;

export type Permission = typeof permissionValues[number];

const permissionSet = new Set<string>(permissionValues);
export function isPermission(value: string): value is Permission { return permissionSet.has(value); }

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: string;
  permissions: Permission[];
  principalId?: string;
  organizationId?: string;
  assurance: "local-development" | "cloudflare-access";
};

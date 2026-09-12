import type { Permission } from "./types";

const routePermissions: Array<[string, Permission]> = [
  ["/platform/users", "platform.users.manage"],
  ["/platform/organizations", "platform.organizations.manage"],
  ["/platform/domains", "platform.domains.manage"],
  ["/platform/security", "platform.security.manage"],
  ["/platform/logs", "platform.logs.read"],
  ["/platform/backup", "platform.backup.manage"],
  ["/platform/cleanup", "platform.cleanup.manage"],
  ["/platform/help-center", "platform.help.manage"],
  ["/platform/access", "platform.access.manage"],
  ["/platform/audit", "platform.audit.read"],
  ["/platform/settings", "platform.settings.manage"],
  ["/platform", "platform.read"],
  ["/next-f/sales", "digital.sales.manage"],
  ["/next-f/projects", "digital.projects.manage"],
  ["/next-f/billing", "digital.billing.manage"],
  ["/next-f/sites", "digital.sites.manage"],
  ["/next-f/settings", "digital.settings.manage"],
  ["/next-f", "digital.read"],
  ["/gaming-store/orders", "gaming.orders.manage"],
  ["/gaming-store/products", "gaming.products.manage"],
  ["/gaming-store/pricing", "gaming.products.manage"],
  ["/gaming-store/suppliers", "gaming.suppliers.manage"],
  ["/gaming-store/finance", "gaming.finance.manage"],
  ["/gaming-store", "gaming.read"],
  ["/software/products", "software.products.manage"],
  ["/software/releases", "software.releases.manage"],
  ["/software/licenses", "software.licenses.manage"],
  ["/software/orders", "software.billing.manage"],
  ["/software/subscriptions", "software.billing.manage"],
  ["/software", "software.read"],
];

export function permissionForPath(pathname: string): Permission | undefined {
  return routePermissions.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
}

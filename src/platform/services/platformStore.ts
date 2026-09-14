import { readDurableValue, writeDurableValue, removeDurableValue } from "../../services/production/durableStorage";
import { readRuntimeTruth } from "../../services/production/runtime";
const runtime = readRuntimeTruth();
export type UserStatus = "active" | "invited" | "suspended";
export type AuditTone = "neutral" | "info" | "warning" | "danger";
export type NotificationTone = "info" | "warning" | "danger" | "success";

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: UserStatus;
  lastActive: string;
  createdAt: string;
};

export type PlatformRole = {
  id: string;
  name: string;
  description: string;
  members: number;
  permissions: string[];
  system: boolean;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  domain: string;
  detail: string;
  tone: AuditTone;
  timestamp: string;
};

export type PlatformNotification = {
  id: string;
  title: string;
  detail: string;
  domain: string;
  tone: NotificationTone;
  read: boolean;
  createdAt: string;
};

export type IntegrationRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "ready" | "not_configured" | "disabled";
  environment: "local" | "production";
};

export type PlatformSettings = {
  organizationName: string;
  supportEmail: string;
  timezone: string;
  defaultCurrency: string;
  sessionTimeoutMinutes: number;
  requireMfaForAdmins: boolean;
  emailNotifications: boolean;
};

const KEYS = {
  users: "nextf.v0.2.platform.users",
  roles: "nextf.v0.2.platform.roles",
  audit: "nextf.v0.2.platform.audit",
  notifications: "nextf.v0.2.platform.notifications",
  integrations: "nextf.v0.2.platform.integrations",
  settings: "nextf.v0.2.platform.settings",
};

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

const seedUsers: PlatformUser[] = [
  { id: "usr_admin", name: "Admin", email: "local@nextf.dev", roleId: "role_super", status: "active", lastActive: ago(3), createdAt: ago(7200) },
  { id: "usr_digital", name: "Digital Manager", email: "digital@nextf.local", roleId: "role_digital", status: "active", lastActive: ago(42), createdAt: ago(6200) },
  { id: "usr_gaming", name: "Gaming Operator", email: "gaming@nextf.local", roleId: "role_gaming", status: "active", lastActive: ago(95), createdAt: ago(5800) },
  { id: "usr_support", name: "Support Agent", email: "support@nextf.local", roleId: "role_support", status: "invited", lastActive: ago(1440), createdAt: ago(120) },
];

export const platformPermissionCatalog = [
  { group: "Platform", permissions: ["platform.read", "platform.users.manage", "platform.access.manage", "platform.audit.read", "platform.settings.manage", "platform.organizations.manage", "platform.domains.manage", "platform.security.manage", "platform.logs.read", "platform.backup.manage", "platform.cleanup.manage", "platform.help.manage"] },
  { group: "NEXT F Digital", permissions: ["digital.read", "digital.sales.manage", "digital.projects.manage", "digital.billing.manage", "digital.sites.manage", "digital.website-platform.manage", "digital.settings.manage"] },
  { group: "Gaming Store", permissions: ["gaming.read", "gaming.orders.manage", "gaming.products.manage", "gaming.suppliers.manage", "gaming.finance.manage"] },
  { group: "NEXT F Software", permissions: ["software.read", "software.products.manage", "software.releases.manage", "software.licenses.manage", "software.billing.manage"] },
];

const allPermissions = platformPermissionCatalog.flatMap((group) => group.permissions);

const seedRoles: PlatformRole[] = [
  { id: "role_super", name: "Super Admin", description: "Full control across the entire NEXT F platform.", members: 1, permissions: allPermissions, system: true },
  { id: "role_digital", name: "Digital Manager", description: "Operate sales, clients, projects, billing and client sites.", members: 1, permissions: ["platform.read", "digital.read", "digital.sales.manage", "digital.projects.manage", "digital.billing.manage", "digital.sites.manage", "digital.website-platform.manage", "digital.settings.manage"], system: false },
  { id: "role_gaming", name: "Gaming Operator", description: "Operate Gaming Store catalog, orders, suppliers and finance.", members: 1, permissions: ["platform.read", "gaming.read", "gaming.orders.manage", "gaming.products.manage", "gaming.suppliers.manage", "gaming.finance.manage"], system: false },
  { id: "role_support", name: "Support", description: "Read customer operations and work the shared Help Center and business support queues.", members: 1, permissions: ["platform.read", "platform.help.manage", "digital.read", "gaming.read", "software.read"], system: false },
];

const seedAudit: AuditEvent[] = [
  { id: "audit_1", actor: "Admin", action: "Foundation upgraded", target: "Platform Core V0.2.0", domain: "Platform", detail: "New platform control layer initialized locally.", tone: "info", timestamp: ago(8) },
  { id: "audit_2", actor: "Admin", action: "Role reviewed", target: "Gaming Operator", domain: "Platform", detail: "Gaming domain permissions reviewed.", tone: "neutral", timestamp: ago(75) },
  { id: "audit_3", actor: "System", action: "Health check", target: "Local repository", domain: "Platform", detail: "Shared durable repository boundary responded successfully.", tone: "neutral", timestamp: ago(130) },
  { id: "audit_4", actor: "Admin", action: "Integration deferred", target: "Production data adapter", domain: "Platform", detail: "Production infrastructure remains intentionally disconnected.", tone: "warning", timestamp: ago(240) },
];

const seedNotifications: PlatformNotification[] = [
  { id: "note_1", title: "Platform Core initialized", detail: "Users, access, audit, notifications, health and settings are now active locally.", domain: "Platform", tone: "success", read: false, createdAt: ago(6) },
  { id: "note_2", title: "Production authentication deferred", detail: "Local development session remains active until final infrastructure setup.", domain: "Security", tone: "info", read: false, createdAt: ago(90) },
  { id: "note_3", title: "Production database not connected", detail: "This is expected. Browser-persistent repositories are being used during product development.", domain: "Platform", tone: "warning", read: true, createdAt: ago(300) },
];

const seedIntegrations: IntegrationRecord[] = [
  { id: "int_email", name: "Transactional Email", category: "Communication", description: "Shared outbound email provider adapter.", status: "not_configured", environment: "production" },
  { id: "int_payment", name: "Payment Gateway", category: "Finance", description: "Shared payment abstraction for Digital, Gaming and Software.", status: "not_configured", environment: "production" },
  { id: "int_supplier", name: "Gaming Supplier API", category: "Gaming Store", description: "Provider-independent supplier connection layer.", status: "not_configured", environment: "production" },
  { id: "int_update", name: "Software Update Service", category: "NEXT F Software", description: "License-aware product update and download service.", status: "not_configured", environment: "production" },
  { id: "int_local", name: "Local Browser Repository", category: "Development", description: "Browser-persistent adapter for fully developing the CMS before backend wiring.", status: "ready", environment: "local" },
];

const seedSettings: PlatformSettings = {
  organizationName: "NEXT F",
  supportEmail: "nextf.cms.lk@gmail.com",
  timezone: "Asia/Colombo",
  defaultCurrency: "LKR",
  sessionTimeoutMinutes: 60,
  requireMfaForAdmins: true,
  emailNotifications: true,
};

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  window.dispatchEvent(new CustomEvent("nextf:platform-store", { detail: key }));
  return result;
}

export const platformStore = {
  getUsers: () => read(KEYS.users, seedUsers),
  saveUsers: (users: PlatformUser[]) => write(KEYS.users, users),
  addUser(input: Pick<PlatformUser, "name" | "email" | "roleId">) {
    const users = read(KEYS.users, seedUsers);
    const next: PlatformUser = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      roleId: input.roleId,
      status: "invited",
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    write(KEYS.users, [next, ...users]);
    this.addAudit("Admin", "User invited", next.email, "Platform", `${next.name} was invited to the CMS.`, "info");
    return next;
  },
  updateUser(id: string, patch: Partial<PlatformUser>) {
    const users = read(KEYS.users, seedUsers).map((user) => user.id === id ? { ...user, ...patch } : user);
    return write(KEYS.users, users);
  },

  getRoles: () => {
    const roles = read(KEYS.roles, seedRoles);
    const normalized = roles.map((role) => {
      if (role.id === "role_super") return { ...role, permissions: allPermissions };
      if (role.id === "role_digital") { const required = ["digital.settings.manage", "digital.website-platform.manage"]; const missing = required.filter((permission) => !role.permissions.includes(permission)); if (missing.length) return { ...role, permissions: [...role.permissions, ...missing] }; }
      if (role.id === "role_support" && !role.permissions.includes("platform.help.manage")) return { ...role, permissions: [...role.permissions, "platform.help.manage"] };
      return role;
    });
    if (JSON.stringify(normalized) !== JSON.stringify(roles)) write(KEYS.roles, normalized);
    return normalized;
  },
  saveRoles: (roles: PlatformRole[]) => write(KEYS.roles, roles),
  updateRole(id: string, patch: Partial<PlatformRole>) {
    const roles = read(KEYS.roles, seedRoles).map((role) => role.id === id ? { ...role, ...patch } : role);
    write(KEYS.roles, roles);
    return roles.find((role) => role.id === id)!;
  },
  addRole(name: string, description: string) {
    const roles = read(KEYS.roles, seedRoles);
    const role: PlatformRole = {
      id: crypto.randomUUID(),
      name,
      description,
      members: 0,
      permissions: ["platform.read"],
      system: false,
    };
    write(KEYS.roles, [...roles, role]);
    platformStore.addAudit("Admin", "Role created", name, "Platform", `${name} permission group created.`, "info");
    return role;
  },

  getAudit: () => read(KEYS.audit, seedAudit),
  saveAudit: (events: AuditEvent[]) => write(KEYS.audit, events),
  addAudit(actor: string, action: string, target: string, domain: string, detail: string, tone: AuditTone = "neutral") {
    const events = read(KEYS.audit, seedAudit);
    const next: AuditEvent = { id: crypto.randomUUID(), actor, action, target, domain, detail, tone, timestamp: new Date().toISOString() };
    write(KEYS.audit, [next, ...events].slice(0, 250));
    return next;
  },

  getNotifications: () => read(KEYS.notifications, seedNotifications),
  saveNotifications: (items: PlatformNotification[]) => write(KEYS.notifications, items),
  markNotification(id: string, readState = true) {
    const items = read(KEYS.notifications, seedNotifications).map((item) => item.id === id ? { ...item, read: readState } : item);
    return write(KEYS.notifications, items);
  },
  markAllNotifications() {
    return write(KEYS.notifications, read(KEYS.notifications, seedNotifications).map((item) => ({ ...item, read: true })));
  },

  getIntegrations: () => read(KEYS.integrations, seedIntegrations),
  saveIntegrations: (items: IntegrationRecord[]) => write(KEYS.integrations, items),

  getSettings: () => read(KEYS.settings, seedSettings),
  saveSettings: (settings: PlatformSettings) => {
    write(KEYS.settings, settings);
    platformStore.addAudit("Admin", "Settings updated", "Organization settings", "Platform", `Platform settings changed in ${runtime.environmentLabel}.`, "info");
    return settings;
  },

  reset() {
    if (!runtime.isLocal) throw new Error("Platform reset is disabled outside local prototype mode");
    Object.values(KEYS).forEach((key) => removeDurableValue(key));
    window.dispatchEvent(new CustomEvent("nextf:platform-store", { detail: "reset" }));
  }
};

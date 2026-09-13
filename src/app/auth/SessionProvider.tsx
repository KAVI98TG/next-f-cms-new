import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { platformStore } from "../../platform/services/platformStore";
import { getProductionStaffSession, readProductionRuntimeConfig } from "../../services/production";
import type { Permission, SessionUser } from "./types";

const SESSION_USER_KEY = "nextf.v0.7.session.user-id";
const runtime = readProductionRuntimeConfig();

type SessionContextValue = {
  user: SessionUser;
  can: (permission: Permission) => boolean;
  mode: "local-development" | "production-access";
  assumeUser?: (userId: string) => void;
};

const fallback: SessionUser = {
  id: "local-admin",
  name: "Admin",
  email: "local@nextf.dev",
  roleId: "role_super",
  role: "Super Admin",
  permissions: ["platform.read", "platform.users.manage", "platform.access.manage", "platform.audit.read", "platform.settings.manage", "platform.organizations.manage", "platform.domains.manage", "platform.security.manage", "platform.logs.read", "platform.backup.manage", "platform.cleanup.manage", "platform.help.manage", "digital.read", "digital.sales.manage", "digital.projects.manage", "digital.billing.manage", "digital.sites.manage", "digital.website-platform.manage", "digital.settings.manage", "gaming.read", "gaming.orders.manage", "gaming.products.manage", "gaming.suppliers.manage", "gaming.finance.manage", "software.read", "software.products.manage", "software.releases.manage", "software.licenses.manage", "software.billing.manage"],
  assurance: "local-development",
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readLocalSessionUser(): SessionUser {
  const users = platformStore.getUsers();
  const roles = platformStore.getRoles();
  const selected = window.localStorage.getItem(SESSION_USER_KEY) ?? "usr_admin";
  const user = users.find((item) => item.id === selected && item.status === "active") ?? users.find((item) => item.id === "usr_admin") ?? users.find((item) => item.status === "active");
  if (!user) return fallback;
  const role = roles.find((item) => item.id === user.roleId);
  return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, role: role?.name ?? "Unassigned", permissions: (role?.permissions ?? ["platform.read"]) as Permission[], assurance: "local-development" };
}

function readProductionSessionUser(): SessionUser {
  const principal = getProductionStaffSession();
  if (!principal) throw new Error("Verified production staff principal is unavailable");
  const staffUser = platformStore.getUsers().find((item) => item.id === principal.staffUserId && item.status === "active");
  return {
    id: principal.staffUserId,
    name: staffUser?.name ?? principal.email,
    email: principal.email,
    roleId: staffUser?.roleId ?? "access-bound",
    role: "Verified Staff",
    permissions: principal.permissions,
    principalId: principal.principalId,
    organizationId: principal.organizationId,
    assurance: "cloudflare-access",
  };
}

function readSessionUser() { return runtime.mode === "production-api" ? readProductionSessionUser() : readLocalSessionUser(); }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser>(() => readSessionUser());
  useEffect(() => {
    if (runtime.mode === "production-api") return;
    const refresh = () => setUser(readLocalSessionUser());
    window.addEventListener("nextf:platform-store", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("nextf:platform-store", refresh as EventListener); window.removeEventListener("storage", refresh); };
  }, []);
  const assumeUser = useCallback((userId: string) => {
    if (runtime.mode === "production-api") throw new Error("Staff impersonation is disabled in production");
    window.localStorage.setItem(SESSION_USER_KEY, userId);
    setUser(readLocalSessionUser());
  }, []);
  const value = useMemo<SessionContextValue>(() => ({
    user,
    can: (permission) => user.permissions.includes(permission),
    mode: runtime.mode === "production-api" ? "production-access" : "local-development",
    ...(runtime.mode === "local-prototype" ? { assumeUser } : {}),
  }), [user, assumeUser]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

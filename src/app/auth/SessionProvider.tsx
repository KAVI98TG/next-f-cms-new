import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { platformStore } from "../../platform/services/platformStore";
import type { Permission, SessionUser } from "./types";

const SESSION_USER_KEY = "nextf.v0.7.session.user-id";

type SessionContextValue = {
  user: SessionUser;
  can: (permission: Permission) => boolean;
  mode: "local-development";
  assumeUser: (userId: string) => void;
};

const fallback: SessionUser = {
  id: "local-admin",
  name: "Admin",
  email: "local@nextf.dev",
  roleId: "role_super",
  role: "Super Admin",
  permissions: ["platform.read", "platform.users.manage", "platform.access.manage", "platform.audit.read", "platform.settings.manage", "platform.organizations.manage", "platform.domains.manage", "platform.security.manage", "platform.logs.read", "platform.backup.manage", "platform.cleanup.manage", "platform.help.manage", "digital.read", "digital.sales.manage", "digital.projects.manage", "digital.billing.manage", "digital.sites.manage", "digital.settings.manage", "gaming.read", "gaming.orders.manage", "gaming.products.manage", "gaming.suppliers.manage", "gaming.finance.manage", "software.read", "software.products.manage", "software.releases.manage", "software.licenses.manage", "software.billing.manage"],
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readSessionUser(): SessionUser {
  const users = platformStore.getUsers();
  const roles = platformStore.getRoles();
  const selected = window.localStorage.getItem(SESSION_USER_KEY) ?? "usr_admin";
  const user = users.find((item) => item.id === selected && item.status === "active") ?? users.find((item) => item.id === "usr_admin") ?? users.find((item) => item.status === "active");
  if (!user) return fallback;
  const role = roles.find((item) => item.id === user.roleId);
  return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, role: role?.name ?? "Unassigned", permissions: (role?.permissions ?? ["platform.read"]) as Permission[] };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser>(() => readSessionUser());
  useEffect(() => {
    const refresh = () => setUser(readSessionUser());
    window.addEventListener("nextf:platform-store", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("nextf:platform-store", refresh as EventListener); window.removeEventListener("storage", refresh); };
  }, []);
  const assumeUser = useCallback((userId: string) => { window.localStorage.setItem(SESSION_USER_KEY, userId); setUser(readSessionUser()); }, []);
  const value = useMemo<SessionContextValue>(() => ({ user, can: (permission) => user.permissions.includes(permission), mode: "local-development", assumeUser }), [user, assumeUser]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

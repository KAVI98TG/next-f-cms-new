import type { ReactNode } from "react";
import { useSession } from "../../app/auth/SessionProvider";
import type { Permission } from "../../app/auth/types";

export function PermissionGate({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useSession();
  return can(permission) ? children : fallback;
}

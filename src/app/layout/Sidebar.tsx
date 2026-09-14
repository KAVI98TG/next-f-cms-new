import { ChevronRight } from "lucide-react";
import { domains, getDomainByPath } from "../navigation";
import { Link } from "../router/Link";
import { useRouter } from "../router/RouterProvider";
import { useSession } from "../auth/SessionProvider";
import { permissionForPath } from "../auth/permissions";
import { Brand } from "./Brand";
import { APP_VERSION } from "../version";
import { readRuntimeTruth } from "../../services/production";

const runtime=readRuntimeTruth();

export function Sidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const { pathname } = useRouter();
  const { can } = useSession();
  const activeDomain = getDomainByPath(pathname);
  const canVisit = (path: string) => { const permission = permissionForPath(path); return !permission || can(permission); };
  return <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
    <div className="sidebar__brand"><Brand /></div>
    <div className="sidebar__scroll"><p className="sidebar__label">Workspaces</p><nav className="workspace-list" aria-label="Business workspaces">{domains.filter((domain)=>canVisit(domain.path)).map((domain) => { const Icon=domain.icon; const active=activeDomain.id===domain.id; return <Link key={domain.id} href={domain.path} className={`workspace-link ${active ? "is-active" : ""}`} onClick={onNavigate}><span className="workspace-link__icon"><Icon size={18}/></span><span><strong>{domain.label}</strong><small>{domain.description}</small></span><ChevronRight size={16}/></Link>; })}</nav><div className="sidebar__divider"/><p className="sidebar__label">{activeDomain.label}</p><nav className="module-nav" aria-label={`${activeDomain.label} navigation`}>{activeDomain.navigation.filter((item)=>canVisit(item.path)).map((item)=>{ const Icon=item.icon; const active=pathname===item.path||pathname.startsWith(`${item.path}/`); return <Link key={item.path} href={item.path} className={`module-nav__link ${active ? "is-active" : ""}`} onClick={onNavigate}><Icon size={17}/><span>{item.label}</span></Link>; })}</nav></div>
    <div className="sidebar__footer"><span className="environment-dot"/>{runtime.environmentLabel} <strong>V{APP_VERSION}</strong></div>
  </aside>;
}

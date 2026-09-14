import { Bell, BookOpen, CheckCircle2, HelpCircle, LogOut, Menu, Moon, Search, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getDomainByPath } from "../navigation";
import { useRouter } from "../router/RouterProvider";
import { useSession } from "../auth/SessionProvider";
import { useOperationsCenter } from "../../services/shared/useOperationsCenter";
import { useTheme } from "../theme/ThemeProvider";
import { readProductionRuntimeConfig, signOutStaffSession } from "../../services/production";

const runtime = readProductionRuntimeConfig();

export function Topbar({ onMenu, onSearch, onGuide, onShortcuts }: { onMenu: () => void; onSearch: () => void; onGuide: () => void; onShortcuts:()=>void }) {
  const { pathname, navigate } = useRouter();
  const domain = getDomainByPath(pathname);
  const { user, mode } = useSession();
  const notifications = useOperationsCenter();
  const unread = notifications.filter((item) => !item.read).length;
  const { resolvedTheme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const assurance = mode === "production-access" ? "Cloudflare Access verified" : "Local preview session";

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  return <header className="topbar"><div className="topbar__left"><button className="icon-button topbar__menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20}/></button><div className="topbar__context"><span>Workspace</span><strong>{domain.label}</strong></div></div><div className="topbar__actions"><button className="command-trigger" onClick={onSearch} aria-label="Open global search"><Search size={17}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}>{resolvedTheme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" onClick={onShortcuts} aria-label="Open keyboard shortcuts"><HelpCircle size={18}/></button><button className="icon-button" onClick={onGuide} aria-label="Open page guide"><BookOpen size={18}/></button><button className="icon-button" onClick={()=>navigate("/platform/notifications")} aria-label={`${unread} unread notifications`}><Bell size={18}/>{unread>0&&<span className="notification-indicator"/>}</button><div className="account-menu" ref={accountRef}><button className="user-chip" type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen((open)=>!open)} title={`${user.email} · ${user.permissions.length} permissions · ${assurance}`}><span className="user-chip__avatar"><UserRound size={17}/></span><span><strong>{user.name}</strong><small>{user.role}</small></span></button>{menuOpen&&<div className="account-menu__panel" role="menu" aria-label="Account menu"><div className="account-menu__identity"><span className="user-chip__avatar"><UserRound size={17}/></span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><dl className="account-menu__details"><div><dt>Role</dt><dd>{user.role}</dd></div><div><dt>Environment</dt><dd>{runtime.label}</dd></div><div><dt>Auth</dt><dd><ShieldCheck size={13}/>{assurance}</dd></div></dl><button className="account-menu__signout" type="button" role="menuitem" onClick={signOutStaffSession}><LogOut size={15}/>{mode === "production-access" ? "Sign out" : "Reload preview"}</button><div className="account-menu__assurance"><CheckCircle2 size={14}/><span>{mode === "production-access" ? "Cloudflare Access remains the staff authentication authority." : "Local preview only; production impersonation is disabled."}</span></div></div>}</div></div></header>;
}
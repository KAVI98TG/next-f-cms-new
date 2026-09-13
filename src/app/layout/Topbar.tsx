import { Bell, BookOpen, HelpCircle, Menu, Moon, Search, Sun, UserRound } from "lucide-react";
import { getDomainByPath } from "../navigation";
import { useRouter } from "../router/RouterProvider";
import { useSession } from "../auth/SessionProvider";
import { useOperationsCenter } from "../../services/shared/useOperationsCenter";
import { useTheme } from "../theme/ThemeProvider";

export function Topbar({ onMenu, onSearch, onGuide, onShortcuts }: { onMenu: () => void; onSearch: () => void; onGuide: () => void; onShortcuts:()=>void }) {
  const { pathname, navigate } = useRouter();
  const domain = getDomainByPath(pathname);
  const { user, mode } = useSession();
  const notifications = useOperationsCenter();
  const unread = notifications.filter((item) => !item.read).length;
  const { resolvedTheme, toggleTheme } = useTheme();
  return <header className="topbar"><div className="topbar__left"><button className="icon-button topbar__menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20}/></button><div className="topbar__context"><span>Workspace</span><strong>{domain.label}</strong></div></div><div className="topbar__actions"><button className="command-trigger" onClick={onSearch} aria-label="Open global search"><Search size={17}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}>{resolvedTheme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" onClick={onShortcuts} aria-label="Open keyboard shortcuts"><HelpCircle size={18}/></button><button className="icon-button" onClick={onGuide} aria-label="Open page guide"><BookOpen size={18}/></button><button className="icon-button" onClick={()=>navigate("/platform/notifications")} aria-label={`${unread} unread notifications`}><Bell size={18}/>{unread>0&&<span className="notification-indicator"/>}</button><div className="user-chip" title={`${user.email} · ${user.permissions.length} permissions · ${mode === "production-access" ? "Cloudflare Access verified" : "Local development"}`}><span className="user-chip__avatar"><UserRound size={17}/></span><span><strong>{user.name}</strong><small>{user.role}</small></span></div></div></header>;
}

import { useEffect, useRef, useState } from "react";
import { Bell, BookOpen, ChevronDown, HelpCircle, LogOut, Menu, Moon, Search, ShieldCheck, Sun, UserRound } from "lucide-react";
import { getDomainByPath } from "../navigation";
import { useRouter } from "../router/RouterProvider";
import { useSession } from "../auth/SessionProvider";
import { useOperationsCenter } from "../../services/shared/useOperationsCenter";
import { useTheme } from "../theme/ThemeProvider";
import { readRuntimeTruth } from "../../services/production";

const runtime = readRuntimeTruth();

export function Topbar({ onMenu, onSearch, onGuide, onShortcuts }: { onMenu: () => void; onSearch: () => void; onGuide: () => void; onShortcuts:()=>void }) {
  const { pathname, navigate } = useRouter();
  const domain = getDomainByPath(pathname);
  const { user, mode } = useSession();
  const notifications = useOperationsCenter();
  const unread = notifications.filter((item) => !item.read).length;
  const { resolvedTheme, toggleTheme } = useTheme();
  const [accountOpen,setAccountOpen]=useState(false);
  const accountRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!accountOpen) return;
    const close=(event:MouseEvent)=>{if(!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);};
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape") setAccountOpen(false);};
    document.addEventListener("pointerdown",close);
    document.addEventListener("keydown",key);
    return ()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",key);};
  },[accountOpen]);

  const signOut=()=>{
    if(mode!=="production-access") return;
    window.location.assign("/cdn-cgi/access/logout");
  };

  return <header className="topbar"><div className="topbar__left"><button className="icon-button topbar__menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20}/></button><div className="topbar__context"><span>Workspace</span><strong>{domain.label}</strong></div></div><div className="topbar__actions"><button className="command-trigger" onClick={onSearch} aria-label="Open global search"><Search size={17}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}>{resolvedTheme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" onClick={onShortcuts} aria-label="Open keyboard shortcuts"><HelpCircle size={18}/></button><button className="icon-button" onClick={onGuide} aria-label="Open page guide"><BookOpen size={18}/></button><button className="icon-button" onClick={()=>navigate("/platform/notifications")} aria-label={`${unread} unread notifications`}><Bell size={18}/>{unread>0&&<span className="notification-indicator"/>}</button><div className="account-menu-wrap" ref={accountRef}><button className="user-chip user-chip--button" type="button" onClick={()=>setAccountOpen((value)=>!value)} aria-haspopup="menu" aria-expanded={accountOpen} title={`${user.email} · ${user.permissions.length} permissions · ${mode === "production-access" ? "Cloudflare Access verified" : "Local development"}`}><span className="user-chip__avatar"><UserRound size={17}/></span><span className="user-chip__identity"><strong>{user.name}</strong><small>{user.role}</small></span><ChevronDown className="user-chip__chevron" size={14}/></button>{accountOpen&&<div className="account-menu" role="menu" aria-label="Account and session"><div className="account-menu__identity"><span className="user-chip__avatar"><UserRound size={17}/></span><span><strong>{user.name}</strong><small>{user.email}</small></span></div><div className="account-menu__meta"><div><span>Role</span><strong>{user.role}</strong></div><div><span>Environment</span><strong>{runtime.environmentLabel}</strong></div><div><span>Authentication</span><strong>{mode==="production-access"?"Cloudflare Access verified":"Local development"}</strong></div>{user.organizationId&&<div><span>Organization</span><strong>{user.organizationId}</strong></div>}</div>{mode==="production-access"?<button className="account-menu__action" role="menuitem" type="button" onClick={signOut}><LogOut size={16}/><span><strong>Sign out</strong><small>End the Cloudflare Access session</small></span></button>:<div className="account-menu__assurance"><ShieldCheck size={16}/><span>Local prototype session</span></div>}</div>}</div></div></header>;
}

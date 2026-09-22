import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { allNavigation, getDomainByPath } from "../navigation";
import { useRouter } from "../router/RouterProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const routeLabel = useMemo(() => allNavigation.find((item) => pathname === item.path)?.label ?? getDomainByPath(pathname).label, [pathname]);
  useEffect(() => { const onKey=(event:KeyboardEvent)=>{ if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setSearchOpen(true);} if(event.key==="Escape"){setSearchOpen(false);setMobileOpen(false);} }; window.addEventListener("keydown",onKey); return()=>window.removeEventListener("keydown",onKey); },[]);
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to main content</a><div className="route-announcer" aria-live="polite" aria-atomic="true">{routeLabel}</div><Sidebar mobileOpen={mobileOpen} onNavigate={()=>setMobileOpen(false)}/><div className={`mobile-backdrop ${mobileOpen?"is-open":""}`} onClick={()=>setMobileOpen(false)}/><div className="app-shell__main"><Topbar onMenu={()=>setMobileOpen(true)} onSearch={()=>setSearchOpen(true)}/><main id="main-content" className="page-canvas" tabIndex={-1}>{children}</main></div><CommandPalette open={searchOpen} onClose={()=>setSearchOpen(false)}/></div>;
}

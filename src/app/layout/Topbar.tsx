import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Bell, BookOpen, ChevronDown, HelpCircle, LogOut, Menu, Moon, Search, ShieldCheck, Sun, UserCog, UserRound } from "lucide-react";
import { getDomainByPath } from "../navigation";
import { useRouter } from "../router/RouterProvider";
import { useSession } from "../auth/SessionProvider";
import { useOperationsCenter } from "../../services/shared/useOperationsCenter";
import { useTheme } from "../theme/ThemeProvider";
import { readRuntimeTruth } from "../../services/production";
import { Modal } from "../../shared/components/Modal";
import { FormField, TextInput, Toggle } from "../../shared/components/FormField";

const runtime = readRuntimeTruth();
const PROFILE_KEY = "nextf.v1.staff.profile-preferences";

type ProfilePreferences = {
  displayName: string;
  emailNotifications: boolean;
  compactMode: boolean;
};

const defaultPreferences: ProfilePreferences = { displayName: "", emailNotifications: true, compactMode: false };

function readProfilePreferences(): ProfilePreferences {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<ProfilePreferences>;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      emailNotifications: typeof parsed.emailNotifications === "boolean" ? parsed.emailNotifications : true,
      compactMode: typeof parsed.compactMode === "boolean" ? parsed.compactMode : false,
    };
  } catch {
    return defaultPreferences;
  }
}

function saveProfilePreferences(value: ProfilePreferences) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(value));
}

export function Topbar({ onMenu, onSearch, onGuide, onShortcuts }: { onMenu: () => void; onSearch: () => void; onGuide: () => void; onShortcuts:()=>void }) {
  const { pathname, navigate } = useRouter();
  const domain = getDomainByPath(pathname);
  const { user, mode } = useSession();
  const notifications = useOperationsCenter();
  const unread = notifications.filter((item) => !item.read).length;
  const { resolvedTheme, toggleTheme } = useTheme();
  const [accountOpen,setAccountOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [profile,setProfile]=useState<ProfilePreferences>(()=>readProfilePreferences());
  const [draftProfile,setDraftProfile]=useState<ProfilePreferences>(()=>readProfilePreferences());
  const [profileSaved,setProfileSaved]=useState(false);
  const accountRef=useRef<HTMLDivElement>(null);
  const displayName = profile.displayName.trim() || user.name;

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

  const openProfile=()=>{
    const latest=readProfilePreferences();
    setDraftProfile({...latest, displayName: latest.displayName || displayName});
    setProfileSaved(false);
    setAccountOpen(false);
    setProfileOpen(true);
  };

  const closeProfile=useCallback(()=>setProfileOpen(false),[]);

  const saveProfile=()=>{
    const next={...draftProfile, displayName: draftProfile.displayName.trim().slice(0,80)};
    saveProfilePreferences(next);
    setProfile(next);
    setProfileSaved(true);
  };

  return <>
    <header className="topbar"><div className="topbar__left"><button className="icon-button topbar__menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20}/></button><div className="topbar__context"><span>Workspace</span><strong>{domain.label}</strong></div></div><div className="topbar__actions"><button className="command-trigger" onClick={onSearch} aria-label="Open global search"><Search size={17}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}>{resolvedTheme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" onClick={onShortcuts} aria-label="Open keyboard shortcuts"><HelpCircle size={18}/></button><button className="icon-button" onClick={onGuide} aria-label="Open page guide"><BookOpen size={18}/></button><button className="icon-button" onClick={()=>navigate("/platform/notifications")} aria-label={`${unread} unread notifications`}><Bell size={18}/>{unread>0&&<span className="notification-indicator"/>}</button><div className="account-menu-wrap" ref={accountRef}><button className="user-chip user-chip--button" type="button" onClick={()=>setAccountOpen((value)=>!value)} aria-haspopup="menu" aria-expanded={accountOpen} title={`${user.email} · ${user.permissions.length} permissions · ${mode === "production-access" ? "Cloudflare Access verified" : "Local development"}`}><span className="user-chip__avatar"><UserRound size={17}/></span><span className="user-chip__identity"><span className="user-chip__name-row"><strong>{displayName}</strong>{mode === "production-access" && <BadgeCheck className="user-chip__verified" size={14} aria-label="Verified staff"/>}</span><small>{user.role}</small></span><ChevronDown className="user-chip__chevron" size={14}/></button>{accountOpen&&<div className="account-menu" role="menu" aria-label="Account and session"><div className="account-menu__identity"><span className="user-chip__avatar"><UserRound size={17}/></span><span><span className="account-menu__name"><strong>{displayName}</strong>{mode === "production-access" && <BadgeCheck className="user-chip__verified" size={14} aria-label="Verified staff"/>}</span><small>{user.email}</small></span></div><div className="account-menu__meta"><div><span>Role</span><strong>{user.role}</strong></div><div><span>Environment</span><strong>{runtime.environmentLabel}</strong></div><div><span>Authentication</span><strong>{mode==="production-access"?"Cloudflare Access verified":"Local development"}</strong></div>{user.organizationId&&<div><span>Organization</span><strong>{user.organizationId}</strong></div>}</div><button className="account-menu__action" role="menuitem" type="button" onClick={openProfile}><UserCog size={16}/><span><strong>Edit profile</strong><small>Display name and staff preferences</small></span></button>{mode==="production-access"?<button className="account-menu__action" role="menuitem" type="button" onClick={signOut}><LogOut size={16}/><span><strong>Sign out</strong><small>End the Cloudflare Access session</small></span></button>:<div className="account-menu__assurance"><ShieldCheck size={16}/><span>Local prototype session</span></div>}</div>}</div></div></header>
    <Modal open={profileOpen} title="Edit profile" description="Manage your CMS display name and staff preferences. Verified account details stay protected." onClose={closeProfile} footer={<><button className="btn btn--ghost" type="button" onClick={closeProfile}>Close</button><button className="btn btn--primary" type="button" onClick={saveProfile}>Save profile</button></>}>
      <div className="profile-panel">
        <div className="profile-panel__header"><span className="user-chip__avatar"><UserRound size={18}/></span><div><span className="account-menu__name"><strong>{draftProfile.displayName.trim() || displayName}</strong>{mode === "production-access" && <BadgeCheck className="user-chip__verified" size={14} aria-label="Verified staff"/>}</span><small>{mode === "production-access" ? "Verified staff profile" : "Local staff profile"}</small></div></div>
        <FormField label="Display name" hint="Shown in the top bar instead of your email."><TextInput value={draftProfile.displayName} maxLength={80} onChange={(event)=>{setDraftProfile((current)=>({...current,displayName:event.target.value}));setProfileSaved(false);}} placeholder="First and last name" /></FormField>
        <div className="profile-panel__readonly"><div><span>Verified email</span><strong>{user.email}</strong></div><div><span>Role</span><strong>{user.role}</strong></div><div><span>Authentication</span><strong>{mode === "production-access" ? "Cloudflare Access" : "Local session"}</strong></div></div>
        <div className="profile-panel__toggles"><div><span><strong>Email notifications</strong><small>Keep CMS operational emails enabled.</small></span><Toggle checked={draftProfile.emailNotifications} onChange={(value)=>{setDraftProfile((current)=>({...current,emailNotifications:value}));setProfileSaved(false);}} /></div><div><span><strong>Compact workspace</strong><small>Preference saved for future dense views.</small></span><Toggle checked={draftProfile.compactMode} onChange={(value)=>{setDraftProfile((current)=>({...current,compactMode:value}));setProfileSaved(false);}} /></div></div>
        {profileSaved&&<div className="profile-panel__saved"><BadgeCheck size={15}/><span>Profile preferences saved on this browser.</span></div>}
      </div>
    </Modal>
  </>;
}
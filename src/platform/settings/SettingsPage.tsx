import { useState } from "react";
import { Building2, MonitorCog, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, FormField, SectionHeader, SelectInput, TextInput, Toggle } from "../../shared/components";
import { platformStore } from "../services/platformStore";
import { useTheme, type ThemeMode } from "../../app/theme/ThemeProvider";
import { readRuntimeTruth } from "../../services/production";

const runtime=readRuntimeTruth();

export function SettingsPage() {
  const [settings, setSettings] = useState(() => platformStore.getSettings());
  const [saved, setSaved] = useState(false);
  const { mode: themeMode, resolvedTheme, setMode: setThemeMode } = useTheme();

  const save = () => {
    platformStore.saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    if(!runtime.isLocal) return;
    platformStore.reset();
    window.location.reload();
  };

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Settings" description="Global organization and admin behavior. Business-specific settings stay inside their own domains." action={<Button variant="primary" onClick={save}><Save size={16}/>{saved ? "Saved" : "Save changes"}</Button>} />
    <div className="settings-layout">
      <Card>
        <div className="settings-section-title"><Building2 size={18}/><div><strong>Organization</strong><small>Shared identity and defaults used across the CMS.</small></div></div>
        <div className="form-grid form-grid--two">
          <FormField label="Organization name"><TextInput value={settings.organizationName} onChange={(event) => setSettings({ ...settings, organizationName: event.target.value })}/></FormField>
          <FormField label="Support email"><TextInput type="email" value={settings.supportEmail} onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })}/></FormField>
          <FormField label="Timezone"><SelectInput value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}><option value="Asia/Colombo">Asia/Colombo</option><option value="UTC">UTC</option></SelectInput></FormField>
          <FormField label="Default currency"><SelectInput value={settings.defaultCurrency} onChange={(event) => setSettings({ ...settings, defaultCurrency: event.target.value })}><option value="LKR">LKR</option><option value="USD">USD</option><option value="EUR">EUR</option></SelectInput></FormField>
        </div>
      </Card>
      <Card>
        <div className="settings-section-title"><MonitorCog size={18}/><div><strong>Appearance</strong><small>Choose a theme for this browser. System follows your device preference automatically.</small></div></div>
        <div className="form-grid form-grid--two">
          <FormField label="Theme"><SelectInput value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></SelectInput></FormField>
          <div className="theme-preview" aria-live="polite"><span className={`theme-preview__swatch theme-preview__swatch--${resolvedTheme}`} aria-hidden="true"/><span><strong>{resolvedTheme === "dark" ? "Dark" : "Light"} active</strong><small>{themeMode === "system" ? "Following system preference" : "Explicit browser preference"}</small></span></div>
        </div>
      </Card>
      <Card>
        <div className="settings-section-title"><ShieldCheck size={18}/><div><strong>Administrative security</strong><small>{runtime.mode==="production-api"?"Cloudflare Access is the authoritative staff authentication and session control plane.":"Local prototype security defaults for development."}</small></div></div>
        {runtime.mode==="production-api"?<div className="settings-rows"><div className="settings-row"><span><strong>Authentication authority</strong><small>MFA, Access policies and session duration are managed in Cloudflare Zero Trust, not by this CMS form.</small></span><Badge tone="success">Cloudflare Access</Badge></div><div className="settings-row"><span><strong>Email operational notifications</strong><small>CMS-owned notification preference; this does not change Access policy.</small></span><Toggle checked={settings.emailNotifications} onChange={(value) => setSettings({ ...settings, emailNotifications: value })}/></div></div>:<div className="settings-rows"><div className="settings-row"><span><strong>Require MFA for administrators</strong><small>Prototype policy only. Production MFA is enforced by Cloudflare Access.</small></span><Toggle checked={settings.requireMfaForAdmins} onChange={(value) => setSettings({ ...settings, requireMfaForAdmins: value })}/></div><div className="settings-row"><span><strong>Email operational notifications</strong><small>Send important platform alerts to configured administrators.</small></span><Toggle checked={settings.emailNotifications} onChange={(value) => setSettings({ ...settings, emailNotifications: value })}/></div><FormField label="Prototype session timeout (minutes)"><TextInput type="number" min={15} max={1440} value={settings.sessionTimeoutMinutes} onChange={(event) => setSettings({ ...settings, sessionTimeoutMinutes: Number(event.target.value) })}/></FormField></div>}
      </Card>
      {runtime.isLocal&&<Card className="danger-zone"><div><strong>Reset local prototype data</strong><p>Clears browser-backed local prototype records and restores local seeds. This control is never rendered in staging or production.</p></div><Button variant="ghost" onClick={reset}><RotateCcw size={16}/>Reset local data</Button></Card>}
    </div>
  </div>;
}

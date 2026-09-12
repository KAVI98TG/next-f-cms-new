import { useState } from "react";
import { Building2, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button, Card, FormField, SectionHeader, SelectInput, TextInput, Toggle } from "../../shared/components";
import { platformStore } from "../services/platformStore";

export function SettingsPage() {
  const [settings, setSettings] = useState(() => platformStore.getSettings());
  const [saved, setSaved] = useState(false);

  const save = () => {
    platformStore.saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
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
        <div className="settings-section-title"><ShieldCheck size={18}/><div><strong>Admin security defaults</strong><small>Product rules now; production enforcement connects later.</small></div></div>
        <div className="settings-rows">
          <div className="settings-row"><span><strong>Require MFA for administrators</strong><small>Keep this requirement enabled when production authentication is connected.</small></span><Toggle checked={settings.requireMfaForAdmins} onChange={(value) => setSettings({ ...settings, requireMfaForAdmins: value })}/></div>
          <div className="settings-row"><span><strong>Email operational notifications</strong><small>Send important platform alerts to configured administrators.</small></span><Toggle checked={settings.emailNotifications} onChange={(value) => setSettings({ ...settings, emailNotifications: value })}/></div>
          <FormField label="Session timeout (minutes)"><TextInput type="number" min={15} max={1440} value={settings.sessionTimeoutMinutes} onChange={(event) => setSettings({ ...settings, sessionTimeoutMinutes: Number(event.target.value) })}/></FormField>
        </div>
      </Card>
      <Card className="danger-zone">
        <div><strong>Reset local development data</strong><p>Clears Platform Core browser records and restores the local development seeds. This does not affect any remote system.</p></div>
        <Button variant="ghost" onClick={reset}><RotateCcw size={16}/>Reset local data</Button>
      </Card>
    </div>
  </div>;
}

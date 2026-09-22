import { Boxes, Cloud, Database, HardDrive, KeyRound, Layers3, ServerCog, ShieldCheck } from "lucide-react";
import { Badge, Card, SectionHeader } from "../../shared/components";
import { readProductionRuntimeConfig } from "../../services/production";

const adapters = [
  { name: "Workers API", detail: "CMS production API", icon: ServerCog, state: "Configured in source" },
  { name: "D1", detail: "Operational data and audit records", icon: Database, state: "Migration available" },
  { name: "R2", detail: "Customer and internal file storage", icon: HardDrive, state: "Binding defined" },
  { name: "Queues", detail: "Background event delivery", icon: Boxes, state: "Binding defined" },
  { name: "Cloudflare Access", detail: "Staff access protection", icon: ShieldCheck, state: "Verification configured" },
  { name: "Secrets", detail: "Provider and service credentials", icon: KeyRound, state: "Bindings defined" },
];

export function InfrastructurePage() {
  const runtime = readProductionRuntimeConfig();
  const productionEnabled = runtime.mode === "production-api";
  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Infrastructure readiness" description="Production infrastructure and integration readiness." />
    <Card className="deferred-banner"><span><Layers3 size={20}/></span><div><strong>{productionEnabled ? "Production API mode" : "Local development mode"}</strong><p>{productionEnabled ? "Production data requires the configured API, bindings and verified staff access." : "Local data stays in the development adapter."}</p></div><Badge tone={productionEnabled?"warning":"info"}>{runtime.environment}</Badge></Card>
    <div className="integration-grid">{adapters.map(({ name, detail, icon: Icon, state }) => <Card key={name} className="integration-card">
      <header><span className="integration-icon is-ready"><Icon size={18}/></span><Badge tone="success">Ready</Badge></header>
      <h3>{name}</h3><p>{detail}</p><footer><span>Status</span><strong>{state}</strong></footer>
    </Card>)}</div>
    <Card><div className="card-section-heading"><div><strong>Production requirements</strong></div><Cloud size={20}/></div><div className="settings-rows">
      <div className="settings-row"><span>API hostname</span><strong>{runtime.apiBaseUrl || "Not configured"}</strong></div>
      <div className="settings-row"><span>Backend mode</span><strong>{runtime.mode}</strong></div>
      <div className="settings-row"><span>Required</span><strong>D1/R2/Queue bindings · Access · secrets · migrations · domain handlers · restore test</strong></div>
    </div></Card>
  </div>;
}

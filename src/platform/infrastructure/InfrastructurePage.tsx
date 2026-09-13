import { Boxes, Cloud, Database, HardDrive, KeyRound, Layers3, ServerCog, ShieldCheck } from "lucide-react";
import { Badge, Card, SectionHeader } from "../../shared/components";
import { readProductionRuntimeConfig } from "../../services/production";

const adapters = [
  { name: "Workers API", detail: "Shared V1 HTTP boundary", icon: ServerCog, state: "Adapter package implemented" },
  { name: "D1", detail: "Durable documents, audit, idempotency, outbox", icon: Database, state: "Migration 0001 ready" },
  { name: "R2", detail: "Customer/internal file object storage", icon: HardDrive, state: "Binding contract ready" },
  { name: "Queues", detail: "At-least-once async event delivery + DLQ", icon: Boxes, state: "Producer contract ready" },
  { name: "Cloudflare Access", detail: "Staff perimeter + Worker JWT validation", icon: ShieldCheck, state: "JWT verifier implemented" },
  { name: "Secrets", detail: "Provider/service credentials outside source", icon: KeyRound, state: "Fail-closed bindings defined" },
];

export function InfrastructurePage() {
  const runtime = readProductionRuntimeConfig();
  const productionEnabled = runtime.mode === "production-api";
  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Infrastructure readiness" description="Production adapter status for the internal CMS and shared backend boundary. Architecture readiness is separate from deployed binding/credential readiness." />
    <Card className="deferred-banner"><span><Layers3 size={20}/></span><div><strong>{productionEnabled ? "Production API mode is selected." : "Local prototype mode remains selected."}</strong><p>V0.24 connects the internal CMS durable-state transport to Cloudflare Worker + D1 handlers. Production mode fails closed when its API URL, bindings, Access identity mapping or secrets are unavailable; it never silently falls back to browser persistence.</p></div><Badge tone={productionEnabled?"warning":"info"}>{runtime.environment}</Badge></Card>
    <div className="integration-grid">{adapters.map(({ name, detail, icon: Icon, state }) => <Card key={name} className="integration-card">
      <header><span className="integration-icon is-ready"><Icon size={18}/></span><Badge tone="success">Foundation ready</Badge></header>
      <h3>{name}</h3><p>{detail}</p><footer><span>Implementation</span><strong>{state}</strong></footer>
    </Card>)}</div>
    <Card><div className="card-section-heading"><div><strong>Deployment gate</strong><p>These source artifacts are not equivalent to a deployed production backend.</p></div><Cloud size={20}/></div><div className="settings-rows">
      <div className="settings-row"><span>API hostname</span><strong>{runtime.apiBaseUrl || "Not configured"}</strong></div>
      <div className="settings-row"><span>Backend mode</span><strong>{runtime.mode}</strong></div>
      <div className="settings-row"><span>Required before production</span><strong>D1/R2/Queue bindings · Access application · secrets · migrations · domain handlers · restore test</strong></div>
    </div></Card>
  </div>;
}

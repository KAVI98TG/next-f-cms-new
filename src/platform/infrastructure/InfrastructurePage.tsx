import { Boxes, Database, HardDrive, Layers3, ServerCog } from "lucide-react";
import { Badge, Card, SectionHeader } from "../../shared/components";

const adapters = [
  { name: "Relational data", detail: "Repository contract", icon: Database, state: "Local adapter active" },
  { name: "Object storage", detail: "File service contract", icon: HardDrive, state: "Interface reserved" },
  { name: "Background jobs", detail: "Job dispatch contract", icon: Boxes, state: "Interface reserved" },
  { name: "Runtime API", detail: "HTTP/service boundary", icon: ServerCog, state: "Interface reserved" },
];

export function InfrastructurePage() {
  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Infrastructure readiness" description="This area verifies that the CMS can be connected to production infrastructure later without coupling product development to a provider today." />
    <Card className="deferred-banner"><span><Layers3 size={20}/></span><div><strong>Production infrastructure is intentionally deferred.</strong><p>The current product build uses browser-persistent repositories. Provider bindings, remote databases, object storage and deployment configuration are not part of this stage.</p></div><Badge tone="info">By design</Badge></Card>
    <div className="integration-grid">{adapters.map(({ name, detail, icon: Icon, state }) => <Card key={name} className="integration-card">
      <header><span className="integration-icon is-ready"><Icon size={18}/></span><Badge tone="success">Boundary ready</Badge></header>
      <h3>{name}</h3><p>{detail}</p><footer><span>Architecture</span><strong>{state}</strong></footer>
    </Card>)}</div>
  </div>;
}

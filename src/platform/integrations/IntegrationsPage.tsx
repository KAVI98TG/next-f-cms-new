import { Blocks, CheckCircle2, CircleDashed, PlugZap } from "lucide-react";
import { Badge, Card, SectionHeader } from "../../shared/components";
import { platformStore } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";
import { readRuntimeTruth } from "../../services/production";

const runtime=readRuntimeTruth();

export function IntegrationsPage() {
  const reader = () => platformStore.getIntegrations();
  const [items] = usePlatformStore(reader);
  const relevant=runtime.isLocal?items:items.filter((item)=>item.environment==="production");
  const ready = relevant.filter((item) => item.status === "ready").length;

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Integrations" description="Integration status and connected provider controls." />
    <div className="compact-metrics">
      <Card><span><Blocks size={17}/>Adapters</span><strong>{relevant.length}</strong></Card>
      <Card><span><CheckCircle2 size={17}/>Ready</span><strong>{ready}</strong></Card>
      <Card><span><CircleDashed size={17}/>Not connected</span><strong>{relevant.length - ready}</strong></Card>
      <Card><span><PlugZap size={17}/>Environment</span><strong>{runtime.environmentLabel}</strong></Card>
    </div>
    <div className="integration-grid">{relevant.map((item) => <Card key={item.id} className="integration-card">
      <header><span className={`integration-icon ${item.status === "ready" ? "is-ready" : ""}`}><PlugZap size={18}/></span><Badge tone={item.status === "ready" ? "success" : "neutral"}>{item.status === "ready" ? "Ready" : "Not connected"}</Badge></header>
      <h3>{item.name}</h3><p>{item.description}</p>
      <footer><span>{item.category}</span><strong>{item.environment === "local" ? "Local sandbox" : "Production adapter"}</strong></footer>
    </Card>)}</div>
    {!relevant.length&&<Card><p className="empty-copy">No production integrations are configured.</p></Card>}
  </div>;
}

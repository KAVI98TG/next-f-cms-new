import { Blocks, CheckCircle2, CircleDashed, PlugZap } from "lucide-react";
import { Badge, Card, SectionHeader } from "../../shared/components";
import { platformStore } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";

export function IntegrationsPage() {
  const reader = () => platformStore.getIntegrations();
  const [items] = usePlatformStore(reader);
  const ready = items.filter((item) => item.status === "ready").length;

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Integrations" description="Shared integration registry only. External providers remain intentionally unconfigured until the product is complete." />
    <div className="compact-metrics">
      <Card><span><Blocks size={17}/>Adapters</span><strong>{items.length}</strong></Card>
      <Card><span><CheckCircle2 size={17}/>Ready locally</span><strong>{ready}</strong></Card>
      <Card><span><CircleDashed size={17}/>Production pending</span><strong>{items.length - ready}</strong></Card>
      <Card><span><PlugZap size={17}/>Provider lock-in</span><strong>0</strong></Card>
    </div>
    <div className="integration-grid">{items.map((item) => <Card key={item.id} className="integration-card">
      <header><span className={`integration-icon ${item.status === "ready" ? "is-ready" : ""}`}><PlugZap size={18}/></span><Badge tone={item.status === "ready" ? "success" : "neutral"}>{item.status === "ready" ? "Ready" : "Not configured"}</Badge></header>
      <h3>{item.name}</h3><p>{item.description}</p>
      <footer><span>{item.category}</span><strong>{item.environment === "local" ? "Local development" : "Final deployment stage"}</strong></footer>
    </Card>)}</div>
  </div>;
}

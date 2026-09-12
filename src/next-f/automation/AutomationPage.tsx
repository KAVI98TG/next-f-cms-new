import { BellRing, Mail, Play, RefreshCw, Workflow } from "lucide-react";
import { Button, Card, MetricCard, SectionHeader, Toggle } from "../../shared/components";
import { digitalStore } from "../data/digitalStore";
import { DigitalStatus } from "../shared/DigitalStatus";
import { formatDate } from "../shared/format";
import { useDigitalStore } from "../shared/useDigitalStore";

export function AutomationPage(){
 const workflows=useDigitalStore(digitalStore.getWorkflows); const active=workflows.filter((w)=>w.status==="active"); const runs=workflows.reduce((sum,w)=>sum+w.runs,0);
 return <div className="page automation-page"><SectionHeader eyebrow="NEXT F Digital" title="Automation" description="Design the business event layer now. Real email providers, queues and durable workflows will be attached only after the CMS product is complete."/>
 <div className="compact-metrics"><MetricCard label="Workflows" value={String(workflows.length)} detail="Configured business rules" icon={Workflow}/><MetricCard label="Active" value={String(active.length)} detail="Currently enabled" icon={RefreshCw}/><MetricCard label="Local runs" value={String(runs)} detail="Simulated workflow executions" icon={Play}/><MetricCard label="Delivery adapters" value="Deferred" detail="Email and infrastructure later" icon={Mail}/></div>
 <Card><div className="operation-section__head"><div><span>Business workflows</span><h3>Automation registry</h3></div><BellRing size={18}/></div><div className="workflow-list automation-workflow-list">{workflows.map((w)=><article className="automation-workflow-row" key={w.id}><div className="workflow-row__main"><span>{w.trigger}</span><strong>{w.name}</strong><p>{w.action}</p></div><div className="automation-workflow-status"><DigitalStatus value={w.status}/></div><div className="workflow-row__meta"><span>{w.runs} runs</span><small>{w.lastRunAt?`Last ${formatDate(w.lastRunAt)}`:"Never run"}</small></div><div className="automation-workflow-toggle"><Toggle checked={w.status==="active"} onChange={()=>digitalStore.toggleWorkflow(w.id)}/></div><div className="workflow-row__actions"><Button onClick={()=>digitalStore.runWorkflow(w.id)}><Play size={14}/> Test run</Button></div></article>)}</div></Card>
 <Card className="architecture-callout"><strong>Production boundary preserved</strong><p>These workflows record business intent and local state only. Email delivery, queues, retries, provider credentials and Cloudflare Workflows remain intentionally deferred until the infrastructure stage.</p></Card></div>;
}

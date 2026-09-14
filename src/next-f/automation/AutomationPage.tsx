import { BellRing, Mail, Play, RefreshCw, Workflow } from "lucide-react";
import { Badge, Button, Card, MetricCard, SectionHeader, Toggle } from "../../shared/components";
import { digitalStore } from "../data/digitalStore";
import { DigitalStatus } from "../shared/DigitalStatus";
import { formatDate } from "../shared/format";
import { useDigitalStore } from "../shared/useDigitalStore";
import { readExternalCapability, readRuntimeTruth } from "../../services/production";

const runtime=readRuntimeTruth();
const executionCapability=readExternalCapability("digital.workflow-execution");

export function AutomationPage(){
 const workflows=useDigitalStore(digitalStore.getWorkflows); const active=workflows.filter((w)=>w.status==="active"); const runs=workflows.reduce((sum,w)=>sum+w.runs,0);
 return <div className="page automation-page"><SectionHeader eyebrow="NEXT F Digital" title="Automation" description={executionCapability.available?"Design and test business event workflows in the local sandbox.":"Business workflow definitions are visible, but production execution is disabled until the real delivery/workflow adapter is connected."}/>
 <div className="compact-metrics"><MetricCard label="Workflows" value={String(workflows.length)} detail="Configured business rules" icon={Workflow}/><MetricCard label="Active" value={String(active.length)} detail="Configured state" icon={RefreshCw}/><MetricCard label={runtime.isLocal?"Local runs":"Execution"} value={runtime.isLocal?String(runs):"Disabled"} detail={runtime.isLocal?"Sandbox workflow executions":"Integration not connected"} icon={Play}/><MetricCard label="Delivery adapters" value={executionCapability.available?"Sandbox":"Not connected"} detail={executionCapability.detail} icon={Mail}/></div>
 <Card><div className="operation-section__head"><div><span>Business workflows</span><h3>Automation registry</h3></div><BellRing size={18}/></div><div className="workflow-list automation-workflow-list">{workflows.map((w)=><article className="automation-workflow-row" key={w.id}><div className="workflow-row__main"><span>{w.trigger}</span><strong>{w.name}</strong><p>{w.action}</p></div><div className="automation-workflow-status"><DigitalStatus value={w.status}/></div><div className="workflow-row__meta"><span>{w.runs} recorded runs</span><small>{w.lastRunAt?`Last ${formatDate(w.lastRunAt)}`:"Never run"}</small></div><div className="automation-workflow-toggle"><Toggle checked={w.status==="active"} onChange={()=>digitalStore.toggleWorkflow(w.id)}/></div><div className="workflow-row__actions"><Button disabled={!executionCapability.available} onClick={()=>executionCapability.available&&digitalStore.runWorkflow(w.id)}><Play size={14}/>{executionCapability.available?"Test run":"Integration not connected"}</Button></div></article>)}</div></Card>
 {!executionCapability.available&&<Card className="architecture-callout"><div className="operation-section__head"><div><span>Production boundary</span><h3>Workflow execution unavailable</h3></div><Badge tone="warning">Integration not connected</Badge></div><p>Definitions may be reviewed, but the CMS will not persist a fake successful workflow run in production. Connect the real workflow/delivery adapter before enabling execution.</p></Card>}</div>;
}

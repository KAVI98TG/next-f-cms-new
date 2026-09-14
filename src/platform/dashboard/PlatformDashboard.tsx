import { Activity, BellRing, KeyRound, LifeBuoy, ShieldCheck } from "lucide-react";
import { ActivityPanel, AttentionPanel } from "../../shared/components/DashboardPanels";
import { Badge, Card, MetricCard, SectionHeader } from "../../shared/components";
import { platformStore } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";
import { helpCenterStore } from "../help-center/data/helpCenterStore";
import { useHelpCenter } from "../help-center/shared/useHelpCenter";
import { readRuntimeTruth } from "../../services/production";

const runtime=readRuntimeTruth();

export function PlatformDashboard() {
  const usersReader = () => platformStore.getUsers();
  const rolesReader = () => platformStore.getRoles();
  const notesReader = () => platformStore.getNotifications();
  const integrationsReader = () => platformStore.getIntegrations();
  const auditReader = () => platformStore.getAudit();
  const [users] = usePlatformStore(usersReader);
  const [roles] = usePlatformStore(rolesReader);
  const [notifications] = usePlatformStore(notesReader);
  const [integrations] = usePlatformStore(integrationsReader);
  const [audit] = usePlatformStore(auditReader);
  const helpRequests = useHelpCenter(helpCenterStore.getRequests);
  const unread = notifications.filter((item) => !item.read).length;
  const readyAdapters = integrations.filter((item) => item.status === "ready" && (runtime.isLocal || item.environment === "production")).length;
  const pendingAdapters = integrations.filter((item)=>item.environment==="production"&&item.status!=="ready");
  const attention = pendingAdapters.length ? [{ title: "External integrations not connected", detail: `${pendingAdapters.length} production adapter${pendingAdapters.length===1?"":"s"} remain unavailable. Operational actions stay gated until a real integration is connected.`, tone: "warning" as const }] : [];
  const activity = audit.slice(0,8).map((event)=>({id:event.id,domain:event.domain,title:event.action,detail:`${event.target} — ${event.detail}`,meta:new Date(event.timestamp).toLocaleString("en-LK"),tone:event.tone}));

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Control center" description="Shared identity, access, audit and product-level operational controls across NEXT F." />
    <div className="metric-grid">
      <MetricCard label="Admin users" value={String(users.length)} detail={`${users.filter((user) => user.status === "active").length} active`} icon={ShieldCheck} />
      <MetricCard label="Permission groups" value={String(roles.length)} detail="Domain-scoped access" icon={KeyRound} />
      <MetricCard label="Unread alerts" value={String(unread)} detail={`${notifications.length} total notifications`} icon={BellRing} />
      <MetricCard label="Help requests" value={String(helpRequests.filter((item) => !["resolved", "closed"].includes(item.status)).length)} detail="Shared customer queue" icon={LifeBuoy} />
      <MetricCard label="Data mode" value={runtime.isProduction?"Production":runtime.isStaging?"Staging":"Local"} detail={runtime.mode==="production-api"?"D1 production API":"Local prototype adapter"} icon={Activity} />
    </div>
    <div className="dashboard-grid">
      <AttentionPanel items={attention} />
      <Card>
        <SectionHeader title="Platform Core" description="Shared identity, access, audit and control surfaces for the active runtime." />
        <div className="platform-capability-list">
          {[
            ["Users", `${users.length} staff records`, "Ready"],
            ["Access control", runtime.mode==="production-api"?"Cloudflare Access":"Local prototype identity", runtime.mode==="production-api"?"Verified":"Local"],
            ["Audit", `${audit.length} application events`, "Ready"],
            ["Notifications", `${unread} unread`, "Ready"],
            ["Customer Help Center", `${helpRequests.length} requests`, "Ready"],
            ["Integrations", `${readyAdapters} production-ready adapters`, pendingAdapters.length?"Attention":"Ready"],
            ["Infrastructure", runtime.mode==="production-api"?"D1 / R2 / Queue backend":"Local prototype adapter", runtime.mode==="production-api"?"Connected":"Local"],
          ].map(([label, detail, state]) => <div key={label}><span><strong>{label}</strong><small>{detail}</small></span><Badge tone={state === "Ready" || state === "Verified" || state === "Connected" ? "success" : state === "Attention" ? "warning" : "info"}>{state}</Badge></div>)}
        </div>
      </Card>
    </div>
    <ActivityPanel items={activity} />
  </div>;
}

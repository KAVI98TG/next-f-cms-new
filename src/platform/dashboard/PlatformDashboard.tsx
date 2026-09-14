import { Activity, BellRing, KeyRound, LifeBuoy, ShieldCheck } from "lucide-react";
import { ActivityPanel, AttentionPanel, type DashboardActivityItem } from "../../shared/components/DashboardPanels";
import { Badge, Card, MetricCard, SectionHeader } from "../../shared/components";
import { platformStore } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";
import { helpCenterStore } from "../help-center/data/helpCenterStore";
import { useHelpCenter } from "../help-center/shared/useHelpCenter";
import { readProductionRuntimeConfig } from "../../services/production";

const runtime = readProductionRuntimeConfig();

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
  const readyAdapters = integrations.filter((item) => item.status === "ready").length;
  const unconfiguredIntegrations = integrations.filter((item) => item.environment === "production" && item.status !== "ready");
  const recentActivity: DashboardActivityItem[] = audit.slice(0, 6).map((item) => ({ id: item.id, domain: item.domain, title: item.action, detail: `${item.target} · ${new Date(item.timestamp).toLocaleString("en-LK")}`, tone: item.tone === "neutral" ? "info" : item.tone }));

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Control center" description="Shared identity, access, audit and product-level operational controls across NEXT F." />
    <div className="metric-grid">
      <MetricCard label="Admin users" value={String(users.length)} detail={`${users.filter((user) => user.status === "active").length} active`} icon={ShieldCheck} />
      <MetricCard label="Permission groups" value={String(roles.length)} detail="Domain-scoped access" icon={KeyRound} />
      <MetricCard label="Unread alerts" value={String(unread)} detail={`${notifications.length} total notifications`} icon={BellRing} />
      <MetricCard label="Help requests" value={String(helpRequests.filter((item) => !["resolved", "closed"].includes(item.status)).length)} detail="Shared customer queue" icon={LifeBuoy} />
      <MetricCard label="Data mode" value={runtime.mode === "production-api" ? "D1-backed" : "Local preview"} detail={`${readyAdapters} adapter ready`} icon={Activity} />
    </div>
    <div className="dashboard-grid">
      <AttentionPanel items={unconfiguredIntegrations.slice(0, 3).map((item) => ({ title: `${item.name} integration not connected`, detail: "Production action is disabled until the real adapter is configured.", tone: "warning" as const }))} />
      <Card>
        <SectionHeader title="Platform Core" description="Shared identity, access, audit and control surfaces are available across the production product layer." />
        <div className="platform-capability-list">
          {[
            ["Users", `${users.length} staff records`, "Ready"],
            ["Access control", `${roles.length} roles`, "Ready"],
            ["Audit", `${audit.length} events`, "Ready"],
            ["Notifications", `${unread} unread`, "Ready"],
            ["Customer Help Center", `${helpRequests.length} requests`, "Ready"],
            ["Integrations", `${integrations.length} adapters`, unconfiguredIntegrations.length ? "Review" : "Ready"],
            ["Durable state", runtime.mode === "production-api" ? "Production API" : "Browser preview", runtime.mode === "production-api" ? "Ready" : "Preview"],
          ].map(([label, detail, state]) => <div key={label}><span><strong>{label}</strong><small>{detail}</small></span><Badge tone={state === "Ready" ? "success" : state === "Review" ? "warning" : "info"}>{state}</Badge></div>)}
        </div>
      </Card>
    </div>
    <ActivityPanel items={recentActivity} />
  </div>;
}
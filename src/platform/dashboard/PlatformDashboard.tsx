import { Activity, BellRing, KeyRound, LifeBuoy, ShieldCheck } from "lucide-react";
import { ActivityPanel, AttentionPanel } from "../../shared/components/DashboardPanels";
import { Badge, Card, MetricCard, SectionHeader } from "../../shared/components";
import { platformStore } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";
import { helpCenterStore } from "../help-center/data/helpCenterStore";
import { useHelpCenter } from "../help-center/shared/useHelpCenter";

export function PlatformDashboard() {
  const usersReader = () => platformStore.getUsers();
  const rolesReader = () => platformStore.getRoles();
  const notesReader = () => platformStore.getNotifications();
  const integrationsReader = () => platformStore.getIntegrations();
  const [users] = usePlatformStore(usersReader);
  const [roles] = usePlatformStore(rolesReader);
  const [notifications] = usePlatformStore(notesReader);
  const [integrations] = usePlatformStore(integrationsReader);
  const helpRequests = useHelpCenter(helpCenterStore.getRequests);
  const unread = notifications.filter((item) => !item.read).length;
  const readyAdapters = integrations.filter((item) => item.status === "ready").length;

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Control center" description="Shared identity, access, audit and product-level operational controls across NEXT F." />
    <div className="metric-grid">
      <MetricCard label="Admin users" value={String(users.length)} detail={`${users.filter((user) => user.status === "active").length} active`} icon={ShieldCheck} />
      <MetricCard label="Permission groups" value={String(roles.length)} detail="Domain-scoped access" icon={KeyRound} />
      <MetricCard label="Unread alerts" value={String(unread)} detail={`${notifications.length} total notifications`} icon={BellRing} />
      <MetricCard label="Help requests" value={String(helpRequests.filter((item) => !["resolved", "closed"].includes(item.status)).length)} detail="Shared customer queue" icon={LifeBuoy} />
      <MetricCard label="Data mode" value="Local" detail={`${readyAdapters} adapter ready`} icon={Activity} />
    </div>
    <div className="dashboard-grid">
      <AttentionPanel items={[
        { title: "Production authentication not connected", detail: "Expected until final infrastructure stage", tone: "info" },
        { title: "External integrations intentionally unconfigured", detail: "Provider wiring starts only after product completion", tone: "warning" },
      ]} />
      <Card>
        <SectionHeader title="Platform Core" description="Shared identity, access, audit and control surfaces are available across the completed local product layer." />
        <div className="platform-capability-list">
          {[
            ["Users", `${users.length} staff records`, "Ready"],
            ["Access control", `${roles.length} roles`, "Ready"],
            ["Audit", `${platformStore.getAudit().length} events`, "Ready"],
            ["Notifications", `${unread} unread`, "Ready"],
            ["Customer Help Center", `${helpRequests.length} requests`, "Ready"],
            ["Integrations", `${integrations.length} adapters`, "Registry"],
            ["Infrastructure", "Production deferred", "Intentional"],
          ].map(([label, detail, state]) => <div key={label}><span><strong>{label}</strong><small>{detail}</small></span><Badge tone={state === "Ready" ? "success" : "info"}>{state}</Badge></div>)}
        </div>
      </Card>
    </div>
    <ActivityPanel />
  </div>;
}

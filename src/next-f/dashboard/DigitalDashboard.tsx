import { AlertTriangle, BriefcaseBusiness, CircleDollarSign, RefreshCw, UsersRound } from "lucide-react";
import { Card, MetricCard, SectionHeader } from "../../shared/components";
import { digitalStore } from "../data/digitalStore";
import { formatLkr, formatRelative } from "../shared/format";
import { useDigitalStore } from "../shared/useDigitalStore";

export function DigitalDashboard() {
  const leads = useDigitalStore(digitalStore.getLeads);
  const opportunities = useDigitalStore(digitalStore.getOpportunities);
  const proposals = useDigitalStore(digitalStore.getProposals);
  const clients = useDigitalStore(digitalStore.getClients);
  const invoices = useDigitalStore(digitalStore.getInvoices);
  const projects = useDigitalStore(digitalStore.getProjects);
  const subscriptions = useDigitalStore(digitalStore.getSubscriptions);
  const sites = useDigitalStore(digitalStore.getSites);
  const tickets = useDigitalStore(digitalStore.getTickets);
  const activity = useDigitalStore(digitalStore.getActivity);

  const pipeline = opportunities.filter((item) => !["won", "lost"].includes(item.stage)).reduce((sum, item) => sum + item.value, 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0);
  const activeProjects = projects.filter((project) => ["active", "awaiting_client", "blocked"].includes(project.status));
  const openProposals = proposals.filter((proposal) => proposal.status === "sent");
  const recurring = subscriptions.filter((item) => item.status === "active").reduce((sum, item) => sum + item.amount, 0);

  const attention = [
    ...projects.filter((project) => project.status === "awaiting_client").map((project) => ({ title: "Client approval pending", detail: project.name, tone: "warning" as const })),
    ...invoices.filter((invoice) => invoice.status !== "paid").map((invoice) => ({ title: "Payment outstanding", detail: `${invoice.number} · ${formatLkr(invoice.amount - invoice.paidAmount)}`, tone: "info" as const })),
    ...sites.filter((site) => ["degraded", "offline"].includes(site.status)).map((site) => ({ title: "Client site needs attention", detail: `${site.domain} · ${site.status}`, tone: "warning" as const })),
    ...tickets.filter((ticket) => ["high", "urgent"].includes(ticket.priority) && !["resolved", "closed"].includes(ticket.status)).map((ticket) => ({ title: "Priority support ticket", detail: `${ticket.number} · ${ticket.subject}`, tone: "warning" as const })),
    ...subscriptions.filter((item) => new Date(item.nextRenewalAt).getTime() - Date.now() < 14 * 86400000).map((item) => ({ title: "Renewal approaching", detail: item.name, tone: "info" as const })),
    ...leads.filter((lead) => lead.status === "new").map((lead) => ({ title: "New lead needs response", detail: lead.company || lead.name, tone: "info" as const })),
  ].slice(0, 5);

  return <div className="page">
    <SectionHeader eyebrow="NEXT F Digital" title="Business operations" description="A live view of the complete service-business lifecycle from lead capture through billing and delivery." />
    <div className="metric-grid">
      <MetricCard label="Open pipeline" value={formatLkr(pipeline)} detail={`${opportunities.filter((item) => !["won", "lost"].includes(item.stage)).length} opportunities`} icon={CircleDollarSign} />
      <MetricCard label="Active projects" value={String(activeProjects.length)} detail={`${projects.filter((item) => item.status === "awaiting_client").length} awaiting client`} icon={BriefcaseBusiness} />
      <MetricCard label="Clients" value={String(clients.filter((client) => client.status === "active").length)} detail={`${openProposals.length} proposals awaiting decision`} icon={UsersRound} />
      <MetricCard label="Recurring base" value={formatLkr(recurring)} detail={`${subscriptions.filter((item) => item.status === "active").length} active recurring services`} icon={RefreshCw} />
    </div>

    <div className="digital-dashboard-grid">
      <Card>
        <div className="dashboard-card-heading"><div><span>Attention required</span><h3>What needs action now</h3></div><AlertTriangle size={18}/></div>
        <div className="attention-list">{attention.length ? attention.map((item, index) => <div className="attention-item" key={`${item.title}-${index}`}><span className={`attention-item__icon attention-item__icon--${item.tone}`}><AlertTriangle size={15}/></span><div><strong>{item.title}</strong><small>{item.detail}</small></div></div>) : <p className="empty-copy">No immediate attention items.</p>}</div>
      </Card>
      <Card>
        <div className="dashboard-card-heading"><div><span>Lifecycle</span><h3>Digital operating flow</h3></div></div>
        <div className="workflow-strip">{["Lead","Opportunity","Proposal","Client","Invoice","Project","Delivery","Renewal"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}</div>
      </Card>
    </div>

    <Card>
      <div className="dashboard-card-heading"><div><span>Activity</span><h3>Latest Digital events</h3></div></div>
      <div className="activity-list">{activity.slice(0, 7).map((item) => <div className="activity-item" key={item.id}><div className="activity-item__rail"><span/></div><div><div className="activity-item__meta"><strong>{item.title}</strong><small>{formatRelative(item.createdAt)}</small></div><p>{item.detail}</p></div></div>)}</div>
    </Card>
  </div>;
}

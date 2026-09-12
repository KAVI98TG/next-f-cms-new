import { useMemo, useState } from "react";
import { CircleDollarSign, FolderKanban, Mail, Phone, UsersRound } from "lucide-react";
import { Button, Card, DataTable, MetricCard, PageToolbar, SectionHeader, type DataTableColumn } from "../../shared/components";
import { digitalStore, type DigitalClient } from "../data/digitalStore";
import { DigitalStatus } from "../shared/DigitalStatus";
import { formatDate, formatLkr } from "../shared/format";
import { useDigitalStore } from "../shared/useDigitalStore";
import { digitalAdminStore } from "../operations/digitalAdminStore";
import { useDigitalAdmin } from "../operations/useDigitalAdmin";
import { useToast } from "../../shared/feedback/ToastProvider";

export function ClientsPage() {
  const clients = useDigitalStore(digitalStore.getClients);
  const projects = useDigitalStore(digitalStore.getProjects);
  const invoices = useDigitalStore(digitalStore.getInvoices);
  const services = useDigitalStore(digitalStore.getServices);
  const subscriptions = useDigitalStore(digitalStore.getSubscriptions);
  const sites = useDigitalStore(digitalStore.getSites);
  const tickets = useDigitalStore(digitalStore.getTickets);
  const portalAccess = useDigitalAdmin(digitalAdminStore.getPortalAccess);
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const rows = useMemo(() => clients.filter((client) => `${client.name} ${client.company} ${client.email}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);
  const selected = clients.find((client) => client.id === selectedId) ?? clients[0];

  const columns: DataTableColumn<DigitalClient>[] = [
    { key: "client", header: "Client", render: (row) => <button className="entity-link" onClick={() => setSelectedId(row.id)}><strong>{row.company || row.name}</strong><small>{row.name}</small></button> },
    { key: "contact", header: "Contact", render: (row) => <div className="entity-cell"><small>{row.email || "No email"}</small><small>{row.phone || "No phone"}</small></div> },
    { key: "projects", header: "Projects", render: (row) => <strong>{projects.filter((project) => project.clientId === row.id).length}</strong> },
    { key: "billing", header: "Lifetime invoiced", render: (row) => <strong>{formatLkr(invoices.filter((invoice) => invoice.clientId === row.id).reduce((sum, invoice) => sum + invoice.amount, 0))}</strong> },
    { key: "status", header: "Status", render: (row) => <DigitalStatus value={row.status} /> },
    { key: "since", header: "Client since", render: (row) => <span className="muted-cell">{formatDate(row.since)}</span> },
  ];

  const clientProjects = selected ? projects.filter((project) => project.clientId === selected.id) : [];
  const clientInvoices = selected ? invoices.filter((invoice) => invoice.clientId === selected.id) : [];
  const outstanding = clientInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0);
  const clientSubscriptions = selected ? subscriptions.filter((item) => item.clientId === selected.id) : [];
  const clientSites = selected ? sites.filter((item) => item.clientId === selected.id) : [];
  const clientTickets = selected ? tickets.filter((item) => item.clientId === selected.id) : [];
  const portal = selected ? portalAccess.find((item) => item.clientId === selected.id) : undefined;

  return <div className="page">
    <SectionHeader eyebrow="NEXT F Digital" title="Clients" description="A single client record for commercial history, delivery status and billing context." />
    <div className="compact-metrics">
      <MetricCard label="Active clients" value={String(clients.filter((client) => client.status === "active").length)} detail={`${clients.length} total records`} icon={UsersRound} />
      <MetricCard label="Active delivery" value={String(projects.filter((project) => ["active", "awaiting_client", "blocked"].includes(project.status)).length)} detail="Projects currently in motion" icon={FolderKanban} />
      <MetricCard label="Outstanding" value={formatLkr(invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0))} detail="Across all Digital clients" icon={CircleDollarSign} />
    </div>
    <div className="client-layout">
      <Card>
        <PageToolbar query={query} onQueryChange={setQuery} placeholder="Search clients…" />
        <DataTable rows={rows} columns={columns} getKey={(row) => row.id} />
      </Card>
      {selected && <Card className="client-360-card">
        <div className="client-360-header"><div><span>Client 360</span><h3>{selected.company || selected.name}</h3><p>{selected.name}</p></div><DigitalStatus value={selected.status} /></div>
        <div className="client-contact-grid">
          <div><Mail size={14}/><span>Email</span><strong>{selected.email || "Not set"}</strong></div>
          <div><Phone size={14}/><span>Phone</span><strong>{selected.phone || "Not set"}</strong></div>
        </div>
        <div className="client-summary-grid">
          <div><span>Projects</span><strong>{clientProjects.length}</strong></div>
          <div><span>Invoices</span><strong>{clientInvoices.length}</strong></div>
          <div><span>Outstanding</span><strong>{formatLkr(outstanding)}</strong></div>
        </div>
        <div className="client-360-section"><strong>Current delivery</strong>{clientProjects.length ? clientProjects.map((project) => <div className="mini-record" key={project.id}><div><strong>{project.name}</strong><small>{services.find((service) => service.id === project.serviceId)?.name ?? "Service"}</small></div><div className="client-360-row-status"><DigitalStatus value={project.status}/><small>{project.progress}%</small></div></div>) : <p className="empty-copy">No projects yet.</p>}</div>
        <div className="client-360-section"><strong>Billing</strong>{clientInvoices.length ? clientInvoices.slice(0, 4).map((invoice) => <div className="mini-record" key={invoice.id}><div><strong>{invoice.number}</strong><small>{formatDate(invoice.dueAt)}</small></div><div className="client-360-row-status"><DigitalStatus value={invoice.status}/><small>{formatLkr(invoice.amount)}</small></div></div>) : <p className="empty-copy">No invoices yet.</p>}</div>
        <div className="client-360-section"><strong>Recurring services</strong>{clientSubscriptions.length ? clientSubscriptions.slice(0, 3).map((item) => <div className="mini-record" key={item.id}><div><strong>{item.name}</strong><small>Renews {formatDate(item.nextRenewalAt)}</small></div><div className="client-360-row-status"><DigitalStatus value={item.status}/><small>{formatLkr(item.amount)}</small></div></div>) : <p className="empty-copy">No recurring services.</p>}</div>
        <div className="client-360-section"><strong>Managed sites</strong>{clientSites.length ? clientSites.slice(0, 3).map((site) => <div className="mini-record" key={site.id}><div><strong>{site.domain}</strong><small>{site.responseMs ? `${site.responseMs} ms` : "No response"}</small></div><div className="client-360-row-status"><DigitalStatus value={site.status}/></div></div>) : <p className="empty-copy">No managed sites.</p>}</div>
        <div className="client-360-section"><strong>Support</strong>{clientTickets.length ? clientTickets.slice(0, 3).map((ticket) => <div className="mini-record" key={ticket.id}><div><strong>{ticket.number}</strong><small>{ticket.subject}</small></div><div className="client-360-row-status"><DigitalStatus value={ticket.status}/></div></div>) : <p className="empty-copy">No support tickets.</p>}</div>
        <div className="client-360-section"><strong>Client portal access</strong>{portal ? <div className="mini-record"><div><strong>{portal.email || selected.email}</strong><small>{portal.lastLoginAt ? `Last login ${formatDate(portal.lastLoginAt)}` : portal.lastInviteAt ? `Invited ${formatDate(portal.lastInviteAt)}` : "Portal access configured"}</small></div><div className="table-actions"><DigitalStatus value={portal.status}/>{portal.status === "active" ? <Button variant="ghost" onClick={() => { digitalAdminStore.updatePortalAccess(portal.id,{status:"suspended"}); notify({title:"Portal access suspended",tone:"success"}); }}>Suspend</Button> : <Button onClick={() => { digitalAdminStore.updatePortalAccess(portal.id,{status:"active"}); notify({title:"Portal access activated",tone:"success"}); }}>Activate</Button>}<Button variant="ghost" onClick={() => { digitalAdminStore.createPortalAccess(selected.id); notify({title:"Portal invitation refreshed",tone:"success"}); }}>Re-invite</Button></div></div> : <div className="mini-record"><div><strong>No portal access</strong><small>Invite this client to the future client portal.</small></div><Button onClick={() => { digitalAdminStore.createPortalAccess(selected.id); notify({title:"Portal invitation created",tone:"success"}); }}>Invite client</Button></div>}</div>
        <p className="client-notes">{selected.notes}</p>
      </Card>}
    </div>
  </div>;
}

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Headphones, Plus, TimerReset } from "lucide-react";
import { Button, Card, DataTable, FormField, MetricCard, Modal, PageToolbar, SectionHeader, SelectInput, TextInput, type DataTableColumn } from "../../shared/components";
import { digitalStore, type DigitalTicket, type TicketPriority } from "../data/digitalStore";
import { DigitalStatus } from "../shared/DigitalStatus";
import { formatDate } from "../shared/format";
import { useDigitalStore } from "../shared/useDigitalStore";

export function SupportPage() {
  const tickets = useDigitalStore(digitalStore.getTickets);
  const clients = useDigitalStore(digitalStore.getClients);
  const sites = useDigitalStore(digitalStore.getSites);
  const projects = useDigitalStore(digitalStore.getProjects);
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ clientId: clients[0]?.id ?? "", projectId: "", siteId: "", subject: "", detail: "", priority: "normal" as TicketPriority });
  const rows = useMemo(() => tickets.filter((ticket) => {
    const client = clients.find((item) => item.id === ticket.clientId);
    return `${ticket.number} ${ticket.subject} ${client?.company ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || ticket.status === filter);
  }), [tickets, clients, query, filter]);
  const columns: DataTableColumn<DigitalTicket>[] = [
    { key:"ticket", header:"Ticket", render:(row)=><div className="entity-cell"><strong>{row.number}</strong><small>{row.subject}</small></div> },
    { key:"client", header:"Client", render:(row)=><span className="muted-cell">{clients.find((client)=>client.id===row.clientId)?.company || clients.find((client)=>client.id===row.clientId)?.name}</span> },
    { key:"priority", header:"Priority", render:(row)=><DigitalStatus value={row.priority}/> },
    { key:"status", header:"Status", render:(row)=><DigitalStatus value={row.status}/> },
    { key:"updated", header:"Updated", render:(row)=><span className="muted-cell">{formatDate(row.updatedAt)}</span> },
    { key:"action", header:"", render:(row)=>row.status!=="resolved"&&row.status!=="closed"?<Button variant="primary" onClick={()=>digitalStore.updateTicket(row.id,{status:"resolved"})}>Resolve</Button>:<Button onClick={()=>digitalStore.updateTicket(row.id,{status:"open"})}>Reopen</Button> },
  ];
  const submit=()=>{if(!form.clientId||!form.subject.trim())return; digitalStore.addTicket({...form,projectId:form.projectId||undefined,siteId:form.siteId||undefined});setOpen(false);};
  return <div className="page">
    <SectionHeader eyebrow="NEXT F Digital" title="Support" description="Keep service requests and operational issues connected to the client, project and managed site that caused them." action={<Button variant="primary" onClick={()=>setOpen(true)}><Plus size={15}/> New ticket</Button>}/>
    <div className="compact-metrics"><MetricCard label="Open" value={String(tickets.filter((t)=>t.status==="open").length)} detail="New work" icon={Headphones}/><MetricCard label="In progress" value={String(tickets.filter((t)=>t.status==="in_progress").length)} detail="Being handled" icon={TimerReset}/><MetricCard label="High priority" value={String(tickets.filter((t)=>["high","urgent"].includes(t.priority)&&!["resolved","closed"].includes(t.status)).length)} detail="Needs attention" icon={AlertTriangle}/><MetricCard label="Resolved" value={String(tickets.filter((t)=>t.status==="resolved").length)} detail="Completed support" icon={CheckCircle2}/></div>
    <Card><PageToolbar query={query} onQueryChange={setQuery} placeholder="Search support tickets…"><SelectInput value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_client">Waiting client</option><option value="resolved">Resolved</option></SelectInput></PageToolbar><DataTable rows={rows} columns={columns} getKey={(row)=>row.id}/></Card>
    <Modal open={open} onClose={()=>setOpen(false)} title="New support ticket" description="Keep the issue anchored to the client context."><div className="form-grid"><FormField label="Client"><SelectInput value={form.clientId} onChange={(e)=>setForm({...form,clientId:e.target.value,projectId:"",siteId:""})}>{clients.map((client)=><option key={client.id} value={client.id}>{client.company||client.name}</option>)}</SelectInput></FormField><FormField label="Priority"><SelectInput value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value as TicketPriority})}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></SelectInput></FormField><FormField label="Project"><SelectInput value={form.projectId} onChange={(e)=>setForm({...form,projectId:e.target.value})}><option value="">No project</option>{projects.filter((p)=>p.clientId===form.clientId).map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</SelectInput></FormField><FormField label="Site"><SelectInput value={form.siteId} onChange={(e)=>setForm({...form,siteId:e.target.value})}><option value="">No site</option>{sites.filter((s)=>s.clientId===form.clientId).map((s)=><option key={s.id} value={s.id}>{s.domain}</option>)}</SelectInput></FormField><FormField label="Subject"><TextInput value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})}/></FormField><FormField label="Details"><TextInput value={form.detail} onChange={(e)=>setForm({...form,detail:e.target.value})}/></FormField></div><div className="modal-actions"><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Create ticket</Button></div></Modal>
  </div>;
}

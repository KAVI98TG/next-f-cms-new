import { useMemo, useState } from "react";
import { CheckCircle2, CircleDot, ClipboardCheck, FileCheck2, FolderKanban, Plus, TimerReset } from "lucide-react";
import { Button, Card, FormField, MetricCard, Modal, PageToolbar, SectionHeader, SelectInput, TextInput } from "../../shared/components";
import { digitalStore } from "../data/digitalStore";
import { DigitalStatus } from "../shared/DigitalStatus";
import { formatDate, formatLkr } from "../shared/format";
import { useDigitalStore } from "../shared/useDigitalStore";

export function ProjectsPage() {
  const projects = useDigitalStore(digitalStore.getProjects);
  const clients = useDigitalStore(digitalStore.getClients);
  const services = useDigitalStore(digitalStore.getServices);
  const tasks = useDigitalStore(digitalStore.getTasks);
  const deliverables = useDigitalStore(digitalStore.getDeliverables);
  const approvals = useDigitalStore(digitalStore.getApprovals);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [taskDraft, setTaskDraft] = useState<{ projectId: string; title: string; dueAt: string } | null>(null);
  const [deliverableDraft, setDeliverableDraft] = useState<{ projectId: string; name: string; note: string } | null>(null);
  const [approvalDraft, setApprovalDraft] = useState<{ projectId: string; title: string } | null>(null);
  const rows = useMemo(() => projects.filter((project) => {
    const client = clients.find((item) => item.id === project.clientId);
    const matches = `${project.name} ${client?.company ?? ""} ${client?.name ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return matches && (filter === "all" || project.status === filter);
  }), [projects, clients, query, filter]);

  const openTaskDraft = (projectId: string) => setTaskDraft({ projectId, title: "", dueAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
  const openDeliverableDraft = (projectId: string) => setDeliverableDraft({ projectId, name: "", note: "" });
  const openApprovalDraft = (projectId: string, projectName: string) => setApprovalDraft({ projectId, title: `${projectName} approval` });
  const saveTask = () => {
    if (!taskDraft?.title.trim()) return;
    digitalStore.addTask(taskDraft.projectId, taskDraft.title.trim(), new Date(`${taskDraft.dueAt}T12:00:00`).toISOString());
    setTaskDraft(null);
  };
  const saveDeliverable = () => {
    if (!deliverableDraft?.name.trim()) return;
    digitalStore.addDeliverable(deliverableDraft.projectId, deliverableDraft.name.trim(), deliverableDraft.note.trim());
    setDeliverableDraft(null);
  };
  const saveApproval = () => {
    if (!approvalDraft?.title.trim()) return;
    digitalStore.requestApproval(approvalDraft.projectId, approvalDraft.title.trim());
    setApprovalDraft(null);
  };

  return <div className="page">
    <SectionHeader eyebrow="NEXT F Digital" title="Projects & Delivery" description="Run delivery from one place with milestones, tasks, deliverables and client approvals tied to each project." />
    <div className="compact-metrics">
      <MetricCard label="Active" value={String(projects.filter((project) => project.status === "active").length)} detail="Currently being delivered" icon={FolderKanban} />
      <MetricCard label="Open tasks" value={String(tasks.filter((task) => task.status !== "done").length)} detail="Across all projects" icon={ClipboardCheck} />
      <MetricCard label="Client approvals" value={String(approvals.filter((item) => item.status === "pending").length)} detail="Waiting for response" icon={TimerReset} />
      <MetricCard label="Deliverables" value={String(deliverables.length)} detail="Managed delivery records" icon={FileCheck2} />
    </div>
    <Card>
      <PageToolbar query={query} onQueryChange={setQuery} placeholder="Search projects…"><SelectInput value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option><option value="planned">Planned</option><option value="active">Active</option><option value="awaiting_client">Awaiting client</option><option value="completed">Completed</option></SelectInput></PageToolbar>
      <div className="project-list">
        {rows.map((project) => {
          const client = clients.find((item) => item.id === project.clientId);
          const service = services.find((item) => item.id === project.serviceId);
          const projectTasks = tasks.filter((item) => item.projectId === project.id);
          const projectDeliverables = deliverables.filter((item) => item.projectId === project.id);
          const projectApprovals = approvals.filter((item) => item.projectId === project.id);
          return <article className="project-card project-card--operations" key={project.id}>
            <header><div><span>{client?.company || client?.name || "Client"}</span><h3>{project.name}</h3><p>{service?.name ?? "Service"} · Due {formatDate(project.dueAt)}</p></div><DigitalStatus value={project.status} /></header>
            <div className="project-progress"><div><span>Progress</span><strong>{project.progress}%</strong></div><div className="progress-track"><i style={{ width: `${project.progress}%` }} /></div></div>
            <div className="milestone-grid">{project.milestones.map((milestone) => <button key={milestone.id} className={`milestone-chip ${milestone.done ? "is-done" : ""}`} onClick={() => digitalStore.toggleMilestone(project.id, milestone.id)}><span>{milestone.done ? <CheckCircle2 size={14}/> : <CircleDot size={14}/>}</span>{milestone.title}</button>)}</div>

            <div className="delivery-grid">
              <section className="delivery-panel"><div className="delivery-panel__head"><strong>Tasks</strong><Button variant="ghost" onClick={() => openTaskDraft(project.id)}><Plus size={14}/> Add</Button></div>{projectTasks.slice(0,4).map((task) => <button className="operation-row" key={task.id} onClick={() => digitalStore.updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}><span><strong>{task.title}</strong><small>Due {formatDate(task.dueAt)}</small></span><DigitalStatus value={task.status} /></button>)}{!projectTasks.length && <p className="empty-copy">No tasks yet.</p>}</section>
              <section className="delivery-panel"><div className="delivery-panel__head"><strong>Deliverables</strong><Button variant="ghost" onClick={() => openDeliverableDraft(project.id)}><Plus size={14}/> Add</Button></div>{projectDeliverables.slice(0,4).map((item) => <button className="operation-row" key={item.id} onClick={() => digitalStore.updateDeliverable(item.id, { status: item.status === "approved" ? "ready" : item.status === "ready" ? "sent" : "approved" })}><span><strong>{item.name}</strong><small>{item.note || "Project deliverable"}</small></span><DigitalStatus value={item.status} /></button>)}{!projectDeliverables.length && <p className="empty-copy">No deliverables yet.</p>}</section>
              <section className="delivery-panel"><div className="delivery-panel__head"><strong>Client approvals</strong><Button variant="ghost" onClick={() => openApprovalDraft(project.id, project.name)}><Plus size={14}/> Request</Button></div>{projectApprovals.slice(0,4).map((item) => <div className="operation-row" key={item.id}><span><strong>{item.title}</strong><small>Requested {formatDate(item.requestedAt)}</small></span>{item.status === "pending" ? <Button onClick={() => digitalStore.resolveApproval(item.id, "approved")}>Approve</Button> : <DigitalStatus value={item.status} />}</div>)}{!projectApprovals.length && <p className="empty-copy">No approval requests yet.</p>}</section>
            </div>

            <footer><div><span>Project value</span><strong>{formatLkr(project.value)}</strong></div><div className="project-actions">{project.status === "planned" && <Button variant="primary" onClick={() => digitalStore.updateProject(project.id, { status: "active", startAt: new Date().toISOString() })}>Start project</Button>}{project.status === "active" && <Button onClick={() => digitalStore.setProjectProgress(project.id, Math.min(100, project.progress + 10))}>+10% progress</Button>}{project.status === "awaiting_client" && <Button variant="primary" onClick={() => digitalStore.completeProject(project.id)}>Client approved</Button>}</div></footer>
          </article>;
        })}
        {!rows.length && <div className="empty-state-inline">No projects match this view.</div>}
      </div>
    </Card>
    <Modal open={!!taskDraft} title="Add task" description="Create a project task with a custom title and due date." onClose={() => setTaskDraft(null)} footer={<><Button onClick={() => setTaskDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveTask} disabled={!taskDraft?.title.trim()}>Add task</Button></>}>
      <div className="form-grid">
        <FormField label="Task title" required><TextInput value={taskDraft?.title ?? ""} onChange={(event) => setTaskDraft((draft) => draft ? { ...draft, title: event.target.value } : draft)} placeholder="Enter task title" /></FormField>
        <FormField label="Due date"><TextInput type="date" value={taskDraft?.dueAt ?? ""} onChange={(event) => setTaskDraft((draft) => draft ? { ...draft, dueAt: event.target.value } : draft)} /></FormField>
      </div>
    </Modal>
    <Modal open={!!deliverableDraft} title="Add deliverable" description="Name the deliverable and add a short note for the delivery team." onClose={() => setDeliverableDraft(null)} footer={<><Button onClick={() => setDeliverableDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveDeliverable} disabled={!deliverableDraft?.name.trim()}>Add deliverable</Button></>}>
      <div className="form-grid">
        <FormField label="Deliverable name" required><TextInput value={deliverableDraft?.name ?? ""} onChange={(event) => setDeliverableDraft((draft) => draft ? { ...draft, name: event.target.value } : draft)} placeholder="Enter deliverable name" /></FormField>
        <FormField label="Note"><textarea className="text-input help-textarea" value={deliverableDraft?.note ?? ""} onChange={(event) => setDeliverableDraft((draft) => draft ? { ...draft, note: event.target.value } : draft)} placeholder="Add delivery notes" /></FormField>
      </div>
    </Modal>
    <Modal open={!!approvalDraft} title="Request approval" description="Create a client approval request with a clear custom title." onClose={() => setApprovalDraft(null)} footer={<><Button onClick={() => setApprovalDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveApproval} disabled={!approvalDraft?.title.trim()}>Request approval</Button></>}>
      <div className="form-grid">
        <FormField label="Approval title" required><TextInput value={approvalDraft?.title ?? ""} onChange={(event) => setApprovalDraft((draft) => draft ? { ...draft, title: event.target.value } : draft)} placeholder="Enter approval title" /></FormField>
      </div>
    </Modal>
  </div>;
}

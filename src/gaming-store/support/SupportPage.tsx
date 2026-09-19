import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  LifeBuoy,
  LockKeyhole,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Drawer,
  FormField,
  Modal,
  PageToolbar,
  SectionHeader,
  SelectInput,
  StatePanel,
  TextInput,
  type DataTableColumn,
} from "../../shared/components";
import { useSession } from "../../app/auth/SessionProvider";
import { useRouter } from "../../app/router/RouterProvider";
import { useToast } from "../../shared/feedback/ToastProvider";
import { GamingStatus } from "../shared/GamingStatus";
import { gamingDate, gamingLkr } from "../shared/format";
import {
  commandGamingSupportCase,
  createGamingSupportCase,
  loadGamingSupportSnapshot,
  type GamingSupportCase,
  type GamingSupportMessage,
  type GamingSupportSnapshot,
  type SupportCreateInput,
} from "./support";
import { MediaUploadButton } from "../media/MediaUploadButton";
import { privateMediaDownloadUrl } from "../media/media";

const categories: Array<[SupportCreateInput["category"], string]> = [
  ["payment", "Payment"],
  ["fulfillment", "Fulfillment"],
  ["refund", "Refund"],
  ["account_details", "Account details"],
  ["delivery", "Delivery"],
  ["promotion", "Promotion"],
  ["duplicate_order", "Duplicate order"],
  ["other", "Other"],
];
const statuses = ["open", "in_progress", "waiting_customer", "waiting_internal", "resolved", "closed"] as const;
const priorities = ["normal", "high", "urgent"] as const;
type QueueKey = "active" | "mine" | "unassigned" | "sla" | "waiting_customer" | "resolved" | "all";
type ReplyMode = "customer" | "internal";

const label = (value: string) => value.replace(/_/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const isTerminal = (row: GamingSupportCase) => ["resolved", "closed"].includes(row.status);
const isBreached = (row: GamingSupportCase) => row.sla.firstResponseBreached || row.sla.resolutionBreached;
const slaTone = (row: GamingSupportCase) => isBreached(row) ? "danger" : row.priority === "urgent" ? "warning" : isTerminal(row) ? "success" : "neutral";
const categoryName = (value: string) => categories.find(([key]) => key === value)?.[1] ?? label(value);
const shortId = (value?: string) => value ? (value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value) : "Unassigned";
const timeTo = (value: string) => {
  const ms = Date.parse(value) - Date.now();
  if (!Number.isFinite(ms)) return gamingDate(value);
  if (ms <= 0) return "Overdue";
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours}h remaining`;
  return `${Math.ceil(hours / 24)}d remaining`;
};
const slaCopy = (row: GamingSupportCase) => {
  if (row.status === "closed") return { title: "Closed", detail: gamingDate(row.updatedAt) };
  if (row.sla.resolvedAt || row.status === "resolved") return { title: "Resolved", detail: row.sla.resolvedAt ? gamingDate(row.sla.resolvedAt) : gamingDate(row.updatedAt) };
  if (isBreached(row)) return { title: "SLA breached", detail: row.sla.firstResponseBreached ? "First response overdue" : "Resolution overdue" };
  if (!row.sla.firstRespondedAt) return { title: timeTo(row.sla.firstResponseDueAt), detail: `Respond by ${gamingDate(row.sla.firstResponseDueAt)}` };
  return { title: timeTo(row.sla.resolutionDueAt), detail: `Resolve by ${gamingDate(row.sla.resolutionDueAt)}` };
};

export function SupportPage() {
  const { notify } = useToast();
  const { user } = useSession();
  const { navigate } = useRouter();
  const staffAccountId = user.principalId || user.id;

  const [snapshot, setSnapshot] = useState<GamingSupportSnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<GamingSupportCase>();
  const [createOpen, setCreateOpen] = useState(false);
  const [queue, setQueue] = useState<QueueKey>("active");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [replyMode, setReplyMode] = useState<ReplyMode>("customer");

  const [orderId, setOrderId] = useState("");
  const [category, setCategory] = useState<SupportCreateInput["category"]>("fulfillment");
  const [priority, setPriority] = useState<SupportCreateInput["priority"]>("normal");
  const [subject, setSubject] = useState("");
  const [initialNote, setInitialNote] = useState("");
  const [note, setNote] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadGamingSupportSnapshot();
      setSnapshot(data);
      setSelected((current) => current ? data.cases.find((row) => row.caseId === current.caseId) : undefined);
      setOrderId((current) => current || data.orders[0]?.orderId || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load support cases.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      notify({ title: success, tone: "success" });
      await refresh();
    } catch (cause) {
      notify({ title: "Support action failed", description: cause instanceof Error ? cause.message : "The support action could not be completed.", tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  const create = () => run(async () => {
    await createGamingSupportCase({ orderId, category, subject, priority, ...(initialNote.trim() ? { initialNote: initialNote.trim() } : {}) });
    setCreateOpen(false); setSubject(""); setInitialNote("");
  }, "Support case created");
  const command = (action: Parameters<typeof commandGamingSupportCase>[0]["action"], extra: Record<string, unknown> = {}) => selected
    ? run(() => commandGamingSupportCase({ caseId: selected.caseId, action, ...extra } as never), "Support case updated")
    : Promise.resolve();

  const messages = useMemo(() => snapshot?.messages.filter((row) => row.caseId === selected?.caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) || [], [snapshot, selected]);
  const evidence = useMemo(() => snapshot?.evidence.filter((row) => row.caseId === selected?.caseId).sort((a, b) => b.addedAt.localeCompare(a.addedAt)) || [], [snapshot, selected]);
  const allCases = snapshot?.cases || [];
  const activeCases = allCases.filter((row) => !isTerminal(row));
  const queueCounts: Record<QueueKey, number> = {
    active: activeCases.length,
    mine: activeCases.filter((row) => row.assignee?.accountId === staffAccountId).length,
    unassigned: activeCases.filter((row) => !row.assignee).length,
    sla: activeCases.filter(isBreached).length,
    waiting_customer: activeCases.filter((row) => row.status === "waiting_customer").length,
    resolved: allCases.filter((row) => row.status === "resolved" || row.status === "closed").length,
    all: allCases.length,
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = allCases.filter((row) => {
      if (queue === "active" && isTerminal(row)) return false;
      if (queue === "mine" && (isTerminal(row) || row.assignee?.accountId !== staffAccountId)) return false;
      if (queue === "unassigned" && (isTerminal(row) || row.assignee)) return false;
      if (queue === "sla" && (isTerminal(row) || !isBreached(row))) return false;
      if (queue === "waiting_customer" && row.status !== "waiting_customer") return false;
      if (queue === "resolved" && !isTerminal(row)) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (priorityFilter !== "all" && row.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (!q) return true;
      return [row.caseNumber, row.subject, row.orderNumber, row.category, row.orderContext.productName, row.orderContext.offerName, row.orderContext.customerEmail || "", row.assignee?.accountId || ""].some((value) => value.toLowerCase().includes(q));
    });
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    return filtered.sort((a, b) => {
      const breach = Number(isBreached(b)) - Number(isBreached(a));
      if (breach) return breach;
      return priorityOrder[a.priority] - priorityOrder[b.priority] || b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [allCases, categoryFilter, priorityFilter, query, queue, staffAccountId, statusFilter]);

  const cols: DataTableColumn<GamingSupportCase>[] = [
    { key: "case", header: "Case", render: (row) => <button className="support-ops-case-link" onClick={() => setSelected(row)}><strong>{row.caseNumber}</strong><small>{categoryName(row.category)}</small></button> },
    { key: "issue", header: "Customer & issue", render: (row) => <div className="support-ops-identity"><span className="support-ops-avatar">{(row.orderContext.customerEmail || row.subject || "C").slice(0, 1).toUpperCase()}</span><span><strong>{row.subject}</strong><small>{row.orderContext.customerEmail || "Guest / recovered order"}</small></span></div> },
    { key: "context", header: "Order context", render: (row) => <div className="entity-cell"><strong>{row.orderContext.productName || row.orderContext.offerName || "Gaming order"}</strong><small>{row.orderNumber} · {gamingLkr(row.orderContext.amountLkr)}</small></div> },
    { key: "state", header: "State", render: (row) => <div className="support-ops-state-cell"><GamingStatus value={row.status}/><GamingStatus value={row.priority}/></div> },
    { key: "sla", header: "SLA", render: (row) => { const copy = slaCopy(row); return <div className="support-ops-sla-cell"><Badge tone={slaTone(row)}>{copy.title}</Badge><small>{copy.detail}</small></div>; } },
    { key: "owner", header: "Owner", render: (row) => <div className="support-ops-owner"><strong>{row.assignee?.accountId === staffAccountId ? "You" : row.assignee ? "Assigned" : "Unassigned"}</strong><small>{row.assignee ? shortId(row.assignee.accountId) : "Needs owner"}</small></div> },
  ];

  if (loading && !snapshot) return <StatePanel state="loading" title="Loading support operations" description="Reading canonical support cases from the shared Gaming commerce database."/>;
  if (error && !snapshot) return <StatePanel state="error" title="Support operations unavailable" description={error} action={<Button onClick={() => void refresh()}><RefreshCw size={14}/> Retry</Button>}/>;

  const summary = snapshot?.summary;
  const waitingInternal = summary?.waitingInternal || 0;
  const handleReply = async () => {
    if (!selected) return;
    if (replyMode === "customer") {
      const body = customerMessage.trim(); if (!body) return;
      await run(async () => { await commandGamingSupportCase({ caseId: selected.caseId, action: "send_customer_message", body }); setCustomerMessage(""); }, "Customer reply queued");
    } else {
      const body = note.trim(); if (!body) return;
      await run(async () => { await commandGamingSupportCase({ caseId: selected.caseId, action: "add_internal_note", body }); setNote(""); }, "Internal note added");
    }
  };

  return <div className="page gaming-support-ops-page">
    <SectionHeader eyebrow="Gaming Store" title="Support & Disputes" description="Operate customer cases with order context, clear ownership, SLA health, private evidence and audited customer communication." action={<div className="table-actions"><Button onClick={() => void refresh()} disabled={loading}><RefreshCw size={14}/> Refresh</Button><Button variant="primary" disabled={!snapshot?.capabilities.manage} onClick={() => setCreateOpen(true)}><Plus size={14}/> New case</Button></div>}/>

    <section className="support-ops-health" aria-label="Support queue overview">
      <button className={queue === "active" ? "is-active" : ""} onClick={() => setQueue("active")}><span><LifeBuoy size={16}/> Active</span><strong>{queueCounts.active}</strong><small>{waitingInternal} waiting internally</small></button>
      <button className={queue === "sla" ? "is-active is-danger" : queueCounts.sla ? "is-danger" : ""} onClick={() => setQueue("sla")}><span><Clock3 size={16}/> SLA risk</span><strong>{queueCounts.sla}</strong><small>{queueCounts.sla ? "Requires attention" : "No breached cases"}</small></button>
      <button className={queue === "unassigned" ? "is-active" : ""} onClick={() => setQueue("unassigned")}><span><UsersRound size={16}/> Unassigned</span><strong>{queueCounts.unassigned}</strong><small>Needs an owner</small></button>
      <button className={queue === "waiting_customer" ? "is-active" : ""} onClick={() => setQueue("waiting_customer")}><span><MessageSquareText size={16}/> Waiting customer</span><strong>{queueCounts.waiting_customer}</strong><small>Customer response pending</small></button>
      <button className={queue === "resolved" ? "is-active" : ""} onClick={() => setQueue("resolved")}><span><CheckCircle2 size={16}/> Resolved</span><strong>{queueCounts.resolved}</strong><small>Resolved or closed</small></button>
    </section>

    {!snapshot?.capabilities.manage && <Card className="support-ops-readonly"><div><LockKeyhole size={18}/><span><strong>Read-only support workspace</strong><small>Cases remain visible from shared D1. Mutations require Gaming order-management permission and the dedicated CMS support bridge credential.</small></span></div><Badge tone="warning">Read only</Badge></Card>}

    <Card className="support-ops-workspace">
      <div className="support-ops-workspace__head"><div><span>Case queue</span><h3>Customer support operations</h3><p>Prioritize breached and urgent cases, assign ownership, then work the entire conversation without leaving the case.</p></div><small>{rows.length.toLocaleString()} of {allCases.length.toLocaleString()} cases</small></div>
      <div className="segmented-nav support-ops-queue-nav">
        {([['active','Active'],['mine','Mine'],['unassigned','Unassigned'],['sla','SLA risk'],['waiting_customer','Waiting customer'],['resolved','Resolved'],['all','All']] as Array<[QueueKey,string]>).map(([value, name]) => <button key={value} className={queue === value ? "is-active" : ""} onClick={() => setQueue(value)}>{name}<span>{queueCounts[value]}</span></button>)}
      </div>
      <PageToolbar query={query} onQueryChange={setQuery} placeholder="Search case, customer email, order or product…">
        <span className="support-ops-filter-icon" title="Filters"><Filter size={14}/></span>
        <SelectInput aria-label="Filter support status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statuses.map((value) => <option value={value} key={value}>{label(value)}</option>)}</SelectInput>
        <SelectInput aria-label="Filter support priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">All priorities</option>{priorities.map((value) => <option value={value} key={value}>{label(value)}</option>)}</SelectInput>
        <SelectInput aria-label="Filter support category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</SelectInput>
      </PageToolbar>
      <DataTable rows={rows} columns={cols} getKey={(row) => row.caseId} empty={allCases.length ? "No support cases match these filters." : "No canonical Gaming support cases yet."}/>
    </Card>

    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create support case" description="Cases are permanently linked to the selected Gaming order." footer={<><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="primary" disabled={busy || !orderId || subject.trim().length < 4} onClick={() => void create()}>Create case</Button></>}>
      <div className="form-grid form-grid--two"><FormField label="Order" required><SelectInput value={orderId} onChange={(e) => setOrderId(e.target.value)}>{snapshot?.orders.map((order) => <option key={order.orderId} value={order.orderId}>{order.orderNumber} · {order.productName || order.status}</option>)}</SelectInput></FormField><FormField label="Category" required><SelectInput value={category} onChange={(e) => setCategory(e.target.value as SupportCreateInput["category"])}>{categories.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</SelectInput></FormField><FormField label="Priority"><SelectInput value={priority} onChange={(e) => setPriority(e.target.value as SupportCreateInput["priority"])}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></SelectInput></FormField><FormField label="Subject" required><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short issue summary"/></FormField></div>
      <FormField label="Initial internal note" hint="Optional. Staff-only and never emailed to the customer."><textarea className="text-input" rows={4} value={initialNote} onChange={(e) => setInitialNote(e.target.value)}/></FormField>
    </Modal>

    <Drawer open={Boolean(selected)} onClose={() => setSelected(undefined)} className="support-ops-drawer" title={selected?.caseNumber || "Support case"} description={selected ? `${selected.subject} · ${selected.orderNumber}` : undefined}>
      {selected && <div className="support-ops-detail">
        <section className="support-ops-case-hero">
          <div><span>{categoryName(selected.category)}</span><h2>{selected.subject}</h2><p>{selected.orderContext.customerEmail || "Guest / recovered order"} · {selected.orderNumber}</p></div>
          <div className="support-ops-case-hero__badges"><GamingStatus value={selected.status}/><GamingStatus value={selected.priority}/></div>
        </section>

        <section className="support-ops-control-grid">
          <div><small>OWNER</small><strong>{selected.assignee?.accountId === staffAccountId ? "You" : selected.assignee ? "Assigned agent" : "Unassigned"}</strong><span>{selected.assignee ? shortId(selected.assignee.accountId) : "Assign the case before working it."}</span></div>
          <div className={isBreached(selected) ? "is-danger" : ""}><small>SLA</small><strong>{slaCopy(selected).title}</strong><span>{slaCopy(selected).detail}</span></div>
          <div><small>UPDATED</small><strong>{gamingDate(selected.updatedAt)}</strong><span>Created {gamingDate(selected.createdAt)}</span></div>
        </section>

        <Card className="support-ops-command-card">
          <div className="support-ops-command-row"><FormField label="Status"><SelectInput disabled={!snapshot?.capabilities.manage || busy} value={selected.status} onChange={(e) => void command("set_status", { status: e.target.value })}>{statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</SelectInput></FormField><FormField label="Priority"><SelectInput disabled={!snapshot?.capabilities.manage || busy} value={selected.priority} onChange={(e) => void command("set_priority", { priority: e.target.value })}>{priorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}</SelectInput></FormField></div>
          <div className="table-actions"><Button disabled={!snapshot?.capabilities.manage || busy || selected.assignee?.accountId === staffAccountId} onClick={() => void command("assign_self")}><UserRoundCheck size={14}/> {selected.assignee ? "Assign to me" : "Take case"}</Button>{selected.assignee && <Button disabled={!snapshot?.capabilities.manage || busy} onClick={() => void command("unassign")}>Unassign</Button>}</div>
        </Card>

        <Card className="support-ops-context-card">
          <div className="operation-section__head"><div><span>Commerce context</span><h3>{selected.orderContext.productName || selected.orderContext.offerName || "Gaming order"}</h3></div><ShieldCheck size={18}/></div>
          <div className="support-ops-context-grid"><div><small>ORDER</small><strong>{selected.orderNumber}</strong><span>{gamingLkr(selected.orderContext.amountLkr)}</span></div><div><small>ORDER STATE</small><strong>{label(selected.orderContext.orderStatus || "unknown")}</strong><span>{selected.orderContext.orderCreatedAt ? gamingDate(selected.orderContext.orderCreatedAt) : "Canonical order"}</span></div><div><small>PAYMENT</small><strong>{label(selected.orderContext.paymentState || "unknown")}</strong><span>Server-authoritative state</span></div><div><small>FULFILLMENT</small><strong>{label(selected.orderContext.fulfillmentState || "not_routed")}</strong><span>{selected.orderContext.offerName || "Offer context"}</span></div></div>
          {selected.orderContext.risk && <div className="support-ops-context-alert"><AlertTriangle size={15}/><span><strong>Risk context</strong><small>{label(selected.orderContext.risk.level)} · {label(selected.orderContext.risk.state)} · score {selected.orderContext.risk.score}</small></span></div>}
          {selected.orderContext.refundStates.length > 0 && <div className="support-ops-context-alert"><LifeBuoy size={15}/><span><strong>Refund context</strong><small>{selected.orderContext.refundStates.map(label).join(", ")}</small></span></div>}
          <div className="table-actions"><Button onClick={() => navigate("/gaming-store/live-operations")}><ExternalLink size={14}/> Live Operations</Button><Button onClick={() => navigate("/gaming-store/customers")}><ExternalLink size={14}/> Customer 360</Button></div>
        </Card>

        <Card className="support-ops-thread-card">
          <div className="operation-section__head"><div><span>Conversation</span><h3>Case timeline</h3></div><MessageSquareText size={18}/></div>
          <div className="support-ops-thread">
            {messages.length === 0 ? <div className="support-ops-thread-empty"><MessageSquareText size={20}/><strong>No messages yet</strong><small>Reply to the customer or add an internal note to start the case timeline.</small></div> : messages.map((message) => <SupportMessage key={message.messageId} message={message} staffAccountId={staffAccountId}/>) }
          </div>
          <div className="support-ops-composer">
            <div className="segmented-nav support-ops-composer-tabs"><button className={replyMode === "customer" ? "is-active" : ""} onClick={() => setReplyMode("customer")}>Reply to customer</button><button className={replyMode === "internal" ? "is-active" : ""} onClick={() => setReplyMode("internal")}>Internal note</button></div>
            {replyMode === "customer" ? <FormField label="Customer reply" hint="Customer-visible. Queues a transactional support email when email delivery is enabled."><textarea className="text-input" rows={5} maxLength={3000} value={customerMessage} onChange={(e) => setCustomerMessage(e.target.value)} placeholder="Write a clear update or request for information…"/></FormField> : <FormField label="Internal note" hint="Staff-only. Never sent to or shown to the customer."><textarea className="text-input support-ops-internal-input" rows={5} maxLength={3000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal investigation notes, handoff context or safe references…"/></FormField>}
            <div className="support-ops-composer__footer"><span>{replyMode === "customer" ? <><MessageSquareText size={13}/> Customer-visible reply</> : <><LockKeyhole size={13}/> Staff-only note</>}</span><Button variant="primary" disabled={!snapshot?.capabilities.manage || busy || !(replyMode === "customer" ? customerMessage.trim() : note.trim())} onClick={() => void handleReply()}>{replyMode === "customer" ? "Send customer update" : "Add internal note"}</Button></div>
          </div>
        </Card>

        <Card className="support-ops-evidence-card">
          <div className="operation-section__head"><div><span>Evidence</span><h3>Private support evidence</h3></div><Paperclip size={18}/></div>
          <p>Private screenshots, images and PDFs stay in NEXT F Media. Payment reconciliation secrets remain in Finance rather than support messages.</p>
          {evidence.length > 0 ? <div className="support-ops-evidence-list">{evidence.map((item) => <div key={item.evidenceId}><span><Paperclip size={14}/><span><strong>{item.label}</strong><small>{item.kind === "media_asset" ? `Private media · ${gamingDate(item.addedAt)}` : `${item.kind.replaceAll("_", " ")} · ${gamingDate(item.addedAt)}`}</small></span></span>{item.kind === "media_asset" ? <Button onClick={() => window.open(privateMediaDownloadUrl(item.reference), "_blank", "noopener,noreferrer")}>Open evidence</Button> : <Badge tone="neutral">Reference</Badge>}</div>)}</div> : <div className="support-ops-evidence-empty"><Paperclip size={18}/><span><strong>No evidence attached</strong><small>Add only material needed to resolve this case.</small></span></div>}
          <div className="table-actions"><MediaUploadButton purpose="support_evidence" owner={{ ownerId: selected.caseId, orderId: selected.orderId }} accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" label="Upload private evidence" disabled={!snapshot?.capabilities.manage || busy} onUploaded={async (asset) => { await run(() => commandGamingSupportCase({ caseId: selected.caseId, action: "add_evidence", kind: "media_asset", label: asset.fileName, reference: asset.assetId }), "Evidence uploaded"); }} onError={(message) => notify({ title: "Evidence upload failed", description: message, tone: "danger" })}/></div>
          <div className="form-grid form-grid--two"><FormField label="Reference label"><TextInput value={evidenceLabel} onChange={(e) => setEvidenceLabel(e.target.value)} placeholder="e.g. Supplier ticket"/></FormField><FormField label="Safe reference"><TextInput value={evidenceReference} onChange={(e) => setEvidenceReference(e.target.value)} placeholder="Reference ID or safe external URL"/></FormField></div>
          <Button disabled={!snapshot?.capabilities.manage || busy || !evidenceLabel.trim() || !evidenceReference.trim()} onClick={() => void run(async () => { await commandGamingSupportCase({ caseId: selected.caseId, action: "add_evidence", kind: "external_reference", label: evidenceLabel.trim(), reference: evidenceReference.trim() }); setEvidenceLabel(""); setEvidenceReference(""); }, "Evidence reference added")}>Add reference</Button>
        </Card>
      </div>}
    </Drawer>
  </div>;
}

function SupportMessage({ message, staffAccountId }: { message: GamingSupportMessage; staffAccountId: string }) {
  const customer = message.author.kind === "customer";
  const internal = message.visibility === "internal";
  const mine = message.author.kind === "staff" && message.author.accountId === staffAccountId;
  const author = customer ? "Customer" : mine ? "You" : message.author.kind === "staff" ? "NEXT F Support" : "System";
  return <article className={`support-ops-message ${customer ? "is-customer" : "is-staff"} ${internal ? "is-internal" : ""}`}>
    <header><span><strong>{author}</strong>{internal && <Badge tone="warning">Internal</Badge>}{!internal && <Badge tone="info">Customer visible</Badge>}</span><small>{gamingDate(message.createdAt)}</small></header>
    <p>{message.body}</p>
    {!customer && message.author.accountId && <footer>{shortId(message.author.accountId)}</footer>}
  </article>;
}

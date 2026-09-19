import { useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, Download, Edit3, Mail, ReceiptText, RefreshCw, RotateCcw, WalletCards } from "lucide-react";
import { Button, Card, DataTable, FormField, MetricCard, Modal, PageToolbar, SectionHeader, SelectInput, TextInput, type DataTableColumn } from "../../shared/components";
import { digitalStore, type DigitalInvoice, type DigitalSubscription } from "../data/digitalStore";
import { DigitalStatus } from "../shared/DigitalStatus";
import { formatDate, formatLkr } from "../shared/format";
import { useDigitalStore } from "../shared/useDigitalStore";
import { digitalAdminStore, type BillingAdjustment } from "../operations/digitalAdminStore";
import { useDigitalAdmin } from "../operations/useDigitalAdmin";
import { useToast } from "../../shared/feedback/ToastProvider";
import { validators } from "../../shared/validation";

export function BillingPage() {
  const invoices = useDigitalStore(digitalStore.getInvoices);
  const subscriptions = useDigitalStore(digitalStore.getSubscriptions);
  const clients = useDigitalStore(digitalStore.getClients);
  const projects = useDigitalStore(digitalStore.getProjects);
  const adjustments = useDigitalAdmin(digitalAdminStore.getAdjustments);
  const { notify } = useToast();
  const [adjustmentOpen,setAdjustmentOpen]=useState(false);
  const [adjustmentInvoice,setAdjustmentInvoice]=useState(invoices[0]?.id ?? "");
  const [adjustmentType,setAdjustmentType]=useState<BillingAdjustment["type"]>("discount");
  const [adjustmentAmount,setAdjustmentAmount]=useState("1000");
  const [adjustmentReason,setAdjustmentReason]=useState("");
  const [invoiceDraft,setInvoiceDraft]=useState<{id?:string;clientId:string;projectId:string;amount:string;dueAt:string;status:DigitalInvoice["status"]}|null>(null);
  const [paymentDraft,setPaymentDraft]=useState<{invoiceId:string;amount:string}|null>(null);
  const [subscriptionDraft,setSubscriptionDraft]=useState<{id:string;name:string;amount:string;frequency:DigitalSubscription["frequency"];nextRenewalAt:string;status:DigitalSubscription["status"];graceDays:string}|null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = useMemo(() => invoices.filter((invoice) => {
    const client = clients.find((item) => item.id === invoice.clientId);
    const match = `${invoice.number} ${client?.name ?? ""} ${client?.company ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return match && (filter === "all" || invoice.status === filter);
  }), [invoices, clients, query, filter]);

  const total = invoices.reduce((sum, item) => sum + item.amount, 0);
  const paid = invoices.reduce((sum, item) => sum + item.paidAmount, 0);
  const outstanding = total - paid;
  const recurring = subscriptions.filter((item) => item.status === "active").reduce((sum, item) => sum + item.amount, 0);
  const netAdjustments = adjustments.reduce((sum,item)=>sum+(item.type==="fee"?item.amount:-item.amount),0);
  const inputDate=(value:string)=>new Date(value).toISOString().slice(0,10);
  const defaultDue=()=>new Date(Date.now()+7*86_400_000).toISOString().slice(0,10);

  const invoiceColumns: DataTableColumn<DigitalInvoice>[] = [
    { key: "invoice", header: "Invoice", render: (row) => <div className="entity-cell"><strong>{row.number}</strong><small>{clients.find((client) => client.id === row.clientId)?.company || clients.find((client) => client.id === row.clientId)?.name || "Unknown client"}</small></div> },
    { key: "project", header: "Project", render: (row) => <span className="muted-cell">{projects.find((project) => project.id === row.projectId)?.name ?? "-"}</span> },
    { key: "amount", header: "Amount", render: (row) => <strong>{formatLkr(row.amount)}</strong> },
    { key: "due", header: "Due", render: (row) => <span className="muted-cell">{formatDate(row.dueAt)}</span> },
    { key: "status", header: "Status", render: (row) => <DigitalStatus value={row.status} /> },
    { key: "action", header: "", render: (row) => <div className="billing-actions">
      <Button onClick={() => openInvoice(row)}><Edit3 size={14}/>Edit</Button>
      {row.status !== "paid" && !["cancelled", "refunded"].includes(row.status) ? <Button variant="primary" onClick={() => openPayment(row)}>Record payment</Button> : <Button onClick={()=>refundInvoice(row.id)}><RotateCcw size={14}/>Refund</Button>}
      <Button onClick={()=>sendReminder(row.id)}><Mail size={14}/>Remind</Button>
      <Button onClick={()=>downloadInvoice(row)}><Download size={14}/>PDF</Button>
    </div> },
  ];

  const subscriptionColumns: DataTableColumn<DigitalSubscription>[] = [
    { key: "service", header: "Recurring service", render: (row) => <div className="entity-cell"><strong>{row.name}</strong><small>{clients.find((client) => client.id === row.clientId)?.company || clients.find((client) => client.id === row.clientId)?.name}</small></div> },
    { key: "amount", header: "Amount", render: (row) => <strong>{formatLkr(row.amount)}</strong> },
    { key: "frequency", header: "Frequency", render: (row) => <span className="muted-cell">{row.frequency === "monthly" ? "Monthly" : "Annual"}</span> },
    { key: "renewal", header: "Next renewal", render: (row) => <span className="muted-cell">{formatDate(row.nextRenewalAt)}</span> },
    { key: "status", header: "Status", render: (row) => <DigitalStatus value={row.status} /> },
    { key: "action", header: "", render: (row) => <div className="billing-actions">
      <Button onClick={()=>openSubscription(row)}><Edit3 size={14}/>Edit</Button>
      {row.status === "active" ? <Button onClick={() => issueRenewal(row.id)}>Issue renewal</Button> : <Button onClick={() => digitalStore.updateSubscription(row.id, { status: "active" })}>Reactivate</Button>}
    </div> },
  ];


  const adjustmentColumns: DataTableColumn<BillingAdjustment>[] = [
    { key:"invoice", header:"Invoice", render:(row)=><strong>{invoices.find((i)=>i.id===row.invoiceId)?.number ?? "Unknown"}</strong> },
    { key:"type", header:"Type", render:(row)=><span>{row.type}</span> },
    { key:"amount", header:"Amount", render:(row)=><strong>{row.type === "fee" ? "+" : "-"}{formatLkr(row.amount)}</strong> },
    { key:"reason", header:"Reason", render:(row)=><span className="muted-cell">{row.reason}</span> },
    { key:"created", header:"Created", render:(row)=><span className="muted-cell">{formatDate(row.createdAt)}</span> },
  ];

  const createAdjustment = () => {
    const amountError=validators.positive(adjustmentAmount,"Amount"), reasonError=validators.required(adjustmentReason,"Reason");
    if(!adjustmentInvoice || amountError || reasonError) return notify({title:"Check adjustment",description:amountError||reasonError||"Select an invoice.",tone:"danger"});
    digitalAdminStore.addAdjustment({invoiceId:adjustmentInvoice,type:adjustmentType,amount:Number(adjustmentAmount),reason:adjustmentReason.trim()});
    notify({title:"Billing adjustment created",tone:"success"}); setAdjustmentOpen(false); setAdjustmentReason("");
  };

  const openInvoice=(invoice?:DigitalInvoice)=>{
    setInvoiceDraft(invoice?{id:invoice.id,clientId:invoice.clientId,projectId:invoice.projectId ?? "",amount:String(invoice.amount),dueAt:inputDate(invoice.dueAt),status:invoice.status}:{clientId:clients[0]?.id ?? "",projectId:"",amount:"45000",dueAt:defaultDue(),status:"issued"});
  };
  const saveInvoice=()=>{
    if(!invoiceDraft)return; const amountError=validators.positive(invoiceDraft.amount,"Amount");
    if(!invoiceDraft.clientId || amountError)return notify({title:"Check invoice",description:amountError || "Select a client.",tone:"danger"});
    const patch={clientId:invoiceDraft.clientId,projectId:invoiceDraft.projectId || undefined,amount:Number(invoiceDraft.amount),dueAt:new Date(invoiceDraft.dueAt).toISOString(),status:invoiceDraft.status};
    if(invoiceDraft.id) digitalStore.updateInvoice(invoiceDraft.id,patch); else digitalStore.createInvoice(patch);
    notify({title:invoiceDraft.id?"Invoice updated":"Invoice created",tone:"success"}); setInvoiceDraft(null);
  };
  const openPayment=(invoice:DigitalInvoice)=>setPaymentDraft({invoiceId:invoice.id,amount:String(Math.max(0,invoice.amount-invoice.paidAmount))});
  const savePayment=()=>{
    if(!paymentDraft)return; const invoice=invoices.find((item)=>item.id===paymentDraft.invoiceId); const amount=Number(paymentDraft.amount);
    if(!invoice || !Number.isFinite(amount) || amount<=0)return notify({title:"Check payment",description:"Enter a valid payment amount.",tone:"danger"});
    if(amount>invoice.amount-invoice.paidAmount)return notify({title:"Payment is too high",description:"The amount cannot exceed the open balance.",tone:"danger"});
    digitalStore.recordInvoicePayment(paymentDraft.invoiceId,amount); notify({title:"Payment recorded",tone:"success"}); setPaymentDraft(null);
  };
  const openSubscription=(subscription:DigitalSubscription)=>setSubscriptionDraft({id:subscription.id,name:subscription.name,amount:String(subscription.amount),frequency:subscription.frequency,nextRenewalAt:inputDate(subscription.nextRenewalAt),status:subscription.status,graceDays:String(subscription.graceDays)});
  const saveSubscription=()=>{
    if(!subscriptionDraft)return; const amountError=validators.positive(subscriptionDraft.amount,"Amount");
    if(!subscriptionDraft.name.trim() || amountError)return notify({title:"Check subscription",description:amountError || "Name is required.",tone:"danger"});
    digitalStore.updateSubscription(subscriptionDraft.id,{name:subscriptionDraft.name.trim(),amount:Number(subscriptionDraft.amount),frequency:subscriptionDraft.frequency,nextBillingAt:new Date(subscriptionDraft.nextRenewalAt).toISOString(),nextRenewalAt:new Date(subscriptionDraft.nextRenewalAt).toISOString(),status:subscriptionDraft.status,graceDays:Math.max(0,Number(subscriptionDraft.graceDays) || 0)});
    notify({title:"Subscription updated",tone:"success"}); setSubscriptionDraft(null);
  };
  const issueRenewal=(subscriptionId:string)=>{const invoice=digitalStore.createRenewalInvoice(subscriptionId); notify({title:"Renewal invoice ready",description:invoice.number,tone:"success"});};
  const sendReminder=(invoiceId:string)=>{digitalStore.sendInvoiceReminder(invoiceId); notify({title:"Reminder queued",tone:"success"});};
  const refundInvoice=(invoiceId:string)=>{digitalStore.refundInvoice(invoiceId); notify({title:"Invoice refunded",tone:"info"});};
  const downloadInvoice=(invoice:DigitalInvoice)=>notify({title:"Invoice export prepared",description:`${invoice.number} PDF action recorded locally.`,tone:"success"});

  return <div className="page">
    <SectionHeader eyebrow="NEXT F Digital" title="Billing & Renewals" description="Manage service invoices, recurring revenue and renewals without tying the product to a payment gateway yet." />
    <div className="compact-metrics">
      <MetricCard label="Invoiced" value={formatLkr(total)} detail={`${invoices.length} invoices`} icon={ReceiptText} />
      <MetricCard label="Collected" value={formatLkr(paid)} detail="Recorded payments" icon={WalletCards} />
      <MetricCard label="Outstanding" value={formatLkr(outstanding)} detail="Still to collect" icon={CircleDollarSign} />
      <MetricCard label="Recurring base" value={formatLkr(recurring)} detail={`${subscriptions.filter((item) => item.status === "active").length} active services`} icon={RefreshCw} />
      <MetricCard label="Adjustments" value={formatLkr(Math.abs(netAdjustments))} detail={netAdjustments > 0 ? "Net fees" : "Net credits / discounts"} icon={CircleDollarSign} />
    </div>

    <Card className="operation-section">
      <div className="operation-section__head"><div><span>Revenue operations</span><h3>Invoices</h3></div><div className="section-actions"><Button variant="primary" onClick={()=>openInvoice()}><ReceiptText size={15}/>Create invoice</Button></div></div>
      <PageToolbar query={query} onQueryChange={setQuery} placeholder="Search invoices…"><SelectInput value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option><option value="issued">Issued</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option></SelectInput></PageToolbar>
      <DataTable rows={rows} columns={invoiceColumns} getKey={(row) => row.id} />
    </Card>

    <Card className="operation-section">
      <div className="operation-section__head"><div><span>Recurring services</span><h3>Subscriptions & renewals</h3></div><CalendarClock size={18} /></div>
      <DataTable rows={subscriptions} columns={subscriptionColumns} getKey={(row) => row.id} />
    </Card>
    <Card className="operation-section">
      <div className="operation-section__head"><div><span>Financial controls</span><h3>Billing adjustments</h3></div><Button onClick={()=>setAdjustmentOpen(true)}>Add adjustment</Button></div>
      <DataTable rows={adjustments} columns={adjustmentColumns} getKey={(row)=>row.id} empty="No billing adjustments recorded."/>
    </Card>
    <Modal open={adjustmentOpen} title="Create billing adjustment" description="Record a discount, credit or fee without rewriting the original invoice." onClose={()=>setAdjustmentOpen(false)} footer={<><Button onClick={()=>setAdjustmentOpen(false)}>Cancel</Button><Button variant="primary" onClick={createAdjustment}>Create adjustment</Button></>}>
      <div className="form-grid form-grid--two"><FormField label="Invoice" required><SelectInput value={adjustmentInvoice} onChange={(e)=>setAdjustmentInvoice(e.target.value)}>{invoices.map((i)=><option key={i.id} value={i.id}>{i.number} · {formatLkr(i.amount)}</option>)}</SelectInput></FormField><FormField label="Type"><SelectInput value={adjustmentType} onChange={(e)=>setAdjustmentType(e.target.value as BillingAdjustment["type"])}><option value="discount">Discount</option><option value="credit">Credit</option><option value="fee">Fee</option></SelectInput></FormField><FormField label="Amount (LKR)" required><TextInput type="number" min={1} value={adjustmentAmount} onChange={(e)=>setAdjustmentAmount(e.target.value)}/></FormField><FormField label="Reason" required><TextInput value={adjustmentReason} onChange={(e)=>setAdjustmentReason(e.target.value)} placeholder="Reason for adjustment"/></FormField></div>
    </Modal>
    <Modal open={!!invoiceDraft} title={invoiceDraft?.id ? "Edit invoice" : "Create invoice"} description="Issue or update a client invoice with real billing state." onClose={()=>setInvoiceDraft(null)} footer={<><Button onClick={()=>setInvoiceDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveInvoice}>Save invoice</Button></>}>
      {invoiceDraft && <div className="form-grid form-grid--two"><FormField label="Client" required><SelectInput value={invoiceDraft.clientId} onChange={(e)=>setInvoiceDraft({...invoiceDraft,clientId:e.target.value})}>{clients.map((client)=><option key={client.id} value={client.id}>{client.company || client.name}</option>)}</SelectInput></FormField><FormField label="Project"><SelectInput value={invoiceDraft.projectId} onChange={(e)=>setInvoiceDraft({...invoiceDraft,projectId:e.target.value})}><option value="">No project</option>{projects.filter((project)=>project.clientId===invoiceDraft.clientId).map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</SelectInput></FormField><FormField label="Amount (LKR)" required><TextInput type="number" min={1} value={invoiceDraft.amount} onChange={(e)=>setInvoiceDraft({...invoiceDraft,amount:e.target.value})}/></FormField><FormField label="Due date" required><TextInput type="date" value={invoiceDraft.dueAt} onChange={(e)=>setInvoiceDraft({...invoiceDraft,dueAt:e.target.value})}/></FormField><FormField label="Status"><SelectInput value={invoiceDraft.status} onChange={(e)=>setInvoiceDraft({...invoiceDraft,status:e.target.value as DigitalInvoice["status"]})}><option value="draft">Draft</option><option value="issued">Issued</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></SelectInput></FormField></div>}
    </Modal>
    <Modal open={!!paymentDraft} title="Record payment" description="Capture a full or partial payment against the selected invoice." onClose={()=>setPaymentDraft(null)} footer={<><Button onClick={()=>setPaymentDraft(null)}>Cancel</Button><Button variant="primary" onClick={savePayment}>Record payment</Button></>}>
      {paymentDraft && <FormField label="Payment amount (LKR)" required><TextInput type="number" min={1} value={paymentDraft.amount} onChange={(e)=>setPaymentDraft({...paymentDraft,amount:e.target.value})}/></FormField>}
    </Modal>
    <Modal open={!!subscriptionDraft} title="Edit subscription" description="Update recurring service amount, billing cadence and renewal state." onClose={()=>setSubscriptionDraft(null)} footer={<><Button onClick={()=>setSubscriptionDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveSubscription}>Save subscription</Button></>}>
      {subscriptionDraft && <div className="form-grid form-grid--two"><FormField label="Service name" required><TextInput value={subscriptionDraft.name} onChange={(e)=>setSubscriptionDraft({...subscriptionDraft,name:e.target.value})}/></FormField><FormField label="Amount (LKR)" required><TextInput type="number" min={1} value={subscriptionDraft.amount} onChange={(e)=>setSubscriptionDraft({...subscriptionDraft,amount:e.target.value})}/></FormField><FormField label="Frequency"><SelectInput value={subscriptionDraft.frequency} onChange={(e)=>setSubscriptionDraft({...subscriptionDraft,frequency:e.target.value as DigitalSubscription["frequency"]})}><option value="monthly">Monthly</option><option value="annual">Annual</option></SelectInput></FormField><FormField label="Next renewal"><TextInput type="date" value={subscriptionDraft.nextRenewalAt} onChange={(e)=>setSubscriptionDraft({...subscriptionDraft,nextRenewalAt:e.target.value})}/></FormField><FormField label="Status"><SelectInput value={subscriptionDraft.status} onChange={(e)=>setSubscriptionDraft({...subscriptionDraft,status:e.target.value as DigitalSubscription["status"]})}><option value="active">Active</option><option value="paused">Paused</option><option value="past_due">Past due</option><option value="cancelled">Cancelled</option></SelectInput></FormField><FormField label="Grace days"><TextInput type="number" min={0} value={subscriptionDraft.graceDays} onChange={(e)=>setSubscriptionDraft({...subscriptionDraft,graceDays:e.target.value})}/></FormField></div>}
    </Modal>
  </div>;
}

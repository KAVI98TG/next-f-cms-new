import { useMemo, useState } from "react";
import { Badge, Card, DataTable, ExportCsvButton, PageToolbar, SectionHeader, SelectInput, type DataTableColumn } from "../../shared/components";
import { useCommercePayments } from "../../services/shared/useCommerceCenter";
import type { BusinessDomain, SharedPayment } from "../../services/shared/commerceCenter";

export function PaymentsPage() {
  const payments = useCommercePayments();
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<"all"|BusinessDomain>("all");
  const filtered = useMemo(() => payments.filter((payment) => (domain === "all" || payment.domain === domain) && `${payment.reference} ${payment.status} ${payment.domain}`.toLowerCase().includes(query.toLowerCase())), [payments, query, domain]);
  const paidLkr = payments.filter((p)=>p.status==="paid"&&p.currency==="LKR").reduce((sum,p)=>sum+p.amount,0);
  const paidUsd = payments.filter((p)=>p.status==="paid"&&p.currency==="USD").reduce((sum,p)=>sum+p.amount,0);
  const columns: DataTableColumn<SharedPayment>[] = [
    { key:"ref",header:"Reference",render:(payment)=><div className="entity-button"><strong>{payment.reference}</strong><small>{payment.sourceType}</small></div> },
    { key:"domain",header:"Domain",render:(payment)=><Badge tone="info">{payment.domain}</Badge> },
    { key:"amount",header:"Amount",render:(payment)=><strong>{payment.currency === "LKR" ? `LKR ${Math.round(payment.amount).toLocaleString("en-LK")}` : `$${payment.amount.toFixed(2)}`}</strong> },
    { key:"status",header:"Status",render:(payment)=><Badge tone={payment.status === "paid" ? "success" : payment.status === "refunded" || payment.status === "failed" ? "danger" : "warning"}>{payment.status}</Badge> },
    { key:"date",header:"Recorded",render:(payment)=><span className="muted-cell">{new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString("en-LK")}</span> },
  ];
  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Unified payments" description="A provider-independent payment ledger view normalized from the three business engines. Payment gateway wiring remains intentionally deferred." action={<ExportCsvButton filename="next-f-unified-payments" rows={filtered} columns={[{header:"Reference",value:(row)=>row.reference},{header:"Domain",value:(row)=>row.domain},{header:"Source",value:(row)=>row.sourceType},{header:"Amount",value:(row)=>row.amount},{header:"Currency",value:(row)=>row.currency},{header:"Status",value:(row)=>row.status},{header:"Recorded",value:(row)=>row.paidAt??row.createdAt}]}/>} />
    <div className="compact-metrics"><Card><span>Payment records</span><strong>{payments.length}</strong></Card><Card><span>Paid LKR</span><strong>{Math.round(paidLkr).toLocaleString("en-LK")}</strong></Card><Card><span>Paid USD</span><strong>${paidUsd.toFixed(2)}</strong></Card><Card><span>Needs action</span><strong>{payments.filter((p)=>p.status!=="paid").length}</strong></Card></div>
    <Card className="table-card"><PageToolbar query={query} onQueryChange={setQuery} placeholder="Search payment or order reference"><SelectInput value={domain} onChange={(event)=>setDomain(event.target.value as "all"|BusinessDomain)}><option value="all">All businesses</option><option value="digital">Digital</option><option value="gaming">Gaming</option><option value="software">Software</option></SelectInput></PageToolbar><DataTable columns={columns} rows={filtered} getKey={(payment)=>payment.id} empty="No payment records match this filter."/></Card>
  </div>;
}

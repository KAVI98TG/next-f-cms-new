import { useMemo, useState } from "react";
import { Badge, Card, DataTable, ExportCsvButton, PageToolbar, SectionHeader, type DataTableColumn } from "../../shared/components";
import { useCommerceAccounts } from "../../services/shared/useCommerceCenter";
import type { SharedAccount } from "../../services/shared/commerceCenter";

const domainLabel = (domain: string) => domain === "digital" ? "Digital" : domain === "gaming" ? "Gaming" : "Software";

export function AccountsPage() {
  const accounts = useCommerceAccounts();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => accounts.filter((account) => `${account.name} ${account.email} ${account.company ?? ""} ${account.domains.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [accounts, query]);
  const multi = accounts.filter((account) => account.domains.length > 1).length;
  const columns: DataTableColumn<SharedAccount>[] = [
    { key: "account", header: "Unified account", render: (account) => <div className="record-primary"><span className="record-avatar">{account.name.slice(0,1).toUpperCase()}</span><span><strong>{account.name}</strong><small>{account.email}{account.company ? ` · ${account.company}` : ""}</small></span></div> },
    { key: "domains", header: "Business relationships", render: (account) => <div className="table-actions">{account.domains.map((domain) => <Badge key={domain} tone="info">{domainLabel(domain)}</Badge>)}</div> },
    { key: "refs", header: "Profiles", render: (account) => <span className="muted-cell">{account.refs.length} linked profile{account.refs.length === 1 ? "" : "s"}</span> },
    { key: "lkr", header: "LKR value", render: (account) => <strong>LKR {Math.round(account.lifetimeValueLkr).toLocaleString("en-LK")}</strong> },
    { key: "usd", header: "USD value", render: (account) => <strong>${account.lifetimeValueUsd.toFixed(2)}</strong> },
  ];
  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Shared customer profiles" description="Legacy cross-business profile aggregation across Digital, Gaming and Software. This is not the NEXT F Account authentication identity directory." action={<ExportCsvButton filename="next-f-shared-accounts" rows={filtered} columns={[{header:"Name",value:(row)=>row.name},{header:"Email",value:(row)=>row.email},{header:"Company",value:(row)=>row.company??""},{header:"Domains",value:(row)=>row.domains.join(" | ")},{header:"Linked profiles",value:(row)=>row.refs.length},{header:"LKR value",value:(row)=>row.lifetimeValueLkr},{header:"USD value",value:(row)=>row.lifetimeValueUsd}]}/>} />
    <div className="compact-metrics"><Card><span>Unified accounts</span><strong>{accounts.length}</strong></Card><Card><span>Multi-business</span><strong>{multi}</strong></Card><Card><span>Digital profiles</span><strong>{accounts.filter((a)=>a.domains.includes("digital")).length}</strong></Card><Card><span>Commerce profiles</span><strong>{accounts.filter((a)=>a.domains.includes("gaming")||a.domains.includes("software")).length}</strong></Card></div>
    <Card className="table-card"><PageToolbar query={query} onQueryChange={setQuery} placeholder="Search account, company or email"/><DataTable columns={columns} rows={filtered} getKey={(account)=>account.id} empty="No unified accounts match this search."/></Card>
    <Card className="architecture-callout"><strong>Profile aggregation boundary</strong><p>This page does not grant authentication or authorization. Email-normalized commerce/customer profiles remain useful for cross-business context, while canonical NEXT F Account identity is managed separately under Platform → NEXT F Accounts.</p></Card>
  </div>;
}

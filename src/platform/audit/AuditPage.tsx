import { useMemo, useState } from "react";
import { Download, ScrollText } from "lucide-react";
import { Badge, Button, Card, DataTable, PageToolbar, SectionHeader, SelectInput, type DataTableColumn } from "../../shared/components";
import { platformStore, type AuditEvent } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";

const time = (value: string) => new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function AuditPage() {
  const reader = () => platformStore.getAudit();
  const [events] = usePlatformStore(reader);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const domains = Array.from(new Set(events.map((event) => event.domain)));
  const filtered = useMemo(() => events.filter((event) => {
    const matches = `${event.actor} ${event.action} ${event.target} ${event.detail}`.toLowerCase().includes(query.toLowerCase());
    return matches && (domain === "all" || event.domain === domain);
  }), [events, query, domain]);

  const columns: DataTableColumn<AuditEvent>[] = [
    { key: "event", header: "Event", render: (event) => <div className="audit-event"><span className="audit-event__icon"><ScrollText size={16}/></span><span><strong>{event.action}</strong><small>{event.detail}</small></span></div> },
    { key: "actor", header: "Actor", render: (event) => <span>{event.actor}</span> },
    { key: "target", header: "Target", render: (event) => <span className="muted-cell">{event.target}</span> },
    { key: "domain", header: "Domain", render: (event) => <Badge tone={event.tone === "danger" ? "danger" : event.tone === "warning" ? "warning" : event.tone === "info" ? "info" : "neutral"}>{event.domain}</Badge> },
    { key: "time", header: "Time", render: (event) => <span className="muted-cell">{time(event.timestamp)}</span> },
  ];

  const exportCsv = () => {
    const rows = [["Time","Actor","Action","Target","Domain","Detail"], ...filtered.map((e) => [e.timestamp,e.actor,e.action,e.target,e.domain,e.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "next-f-platform-audit.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Audit trail" description="Administrative activity for sensitive CMS actions." action={<Button onClick={exportCsv}><Download size={16}/>Export CSV</Button>} />
    <Card className="table-card">
      <PageToolbar query={query} onQueryChange={setQuery} placeholder="Search audit events">
        <SelectInput value={domain} onChange={(event) => setDomain(event.target.value)}><option value="all">All domains</option>{domains.map((item) => <option key={item} value={item}>{item}</option>)}</SelectInput>
      </PageToolbar>
      <DataTable columns={columns} rows={filtered} getKey={(event) => event.id}/>
    </Card>
  </div>;
}

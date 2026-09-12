import { useMemo, useState } from "react";
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, PageToolbar, SectionHeader } from "../../shared/components";
import type { PlatformNotification } from "../services/platformStore";
import { getOperationsNotifications, markAllOperationsNotifications, markOperationsNotification } from "../../services/shared/operationsCenter";
import { useOperationsCenter } from "../../services/shared/useOperationsCenter";

const iconFor = (item: PlatformNotification) => item.tone === "danger" ? <CircleAlert size={18}/> : item.tone === "warning" ? <TriangleAlert size={18}/> : item.tone === "success" ? <CircleCheck size={18}/> : <Info size={18}/>;

export function NotificationsPage() {
  const items = useOperationsCenter();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => items.filter((item) => `${item.title} ${item.detail} ${item.domain}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const unread = items.filter((item) => !item.read).length;
  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Operations inbox" description="One actionable notification center combining Platform events with live Digital, Gaming and Software operational conditions." action={<Button onClick={() => markAllOperationsNotifications()} disabled={unread === 0}><CheckCheck size={16}/>Mark all read</Button>} />
    <div className="compact-metrics"><Card><span><Bell size={17}/>Total</span><strong>{items.length}</strong></Card><Card><span><CircleAlert size={17}/>Unread</span><strong>{unread}</strong></Card><Card><span><TriangleAlert size={17}/>Warnings</span><strong>{items.filter((item)=>item.tone==="warning"||item.tone==="danger").length}</strong></Card><Card><span><CircleCheck size={17}/>Acknowledged</span><strong>{items.filter((item)=>item.read).length}</strong></Card></div>
    <Card className="notification-card"><PageToolbar query={query} onQueryChange={setQuery} placeholder="Search operational notifications"/><div className="notification-list">{filtered.length === 0 ? <div className="command-empty">No notifications match this search.</div> : filtered.map((item)=><button key={item.id} className={`notification-row ${item.read ? "is-read" : ""}`} onClick={()=>markOperationsNotification(item.id,!item.read)}><span className={`notification-row__icon notification-row__icon--${item.tone}`}>{iconFor(item)}</span><span className="notification-row__content"><span><strong>{item.title}</strong>{!item.read&&<i/>}</span><small>{item.detail}</small><em>{new Intl.DateTimeFormat("en-LK",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.createdAt))}</em></span><Badge tone={item.id.startsWith("ops:") ? "info" : "neutral"}>{item.domain}</Badge></button>)}</div></Card>
  </div>;
}

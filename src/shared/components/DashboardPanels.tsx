import { AlertTriangle, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { SectionHeader } from "./SectionHeader";

export type DashboardActivityItem = { id: string; domain: string; title: string; detail: string; tone: "neutral" | "success" | "warning" | "danger" | "info" };

export function AttentionPanel({ items }: { items: { title: string; detail: string; tone: "warning" | "danger" | "info" }[] }) {
  return <Card><SectionHeader title="Attention required" description="Items that could affect operations or revenue." /><div className="attention-list">{items.length ? items.map((item) => <div key={item.title} className="attention-item"><span className={`attention-item__icon attention-item__icon--${item.tone}`}><AlertTriangle size={17} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRight size={16} /></div>) : <p className="empty-copy">No immediate production attention items.</p>}</div></Card>;
}

export function ActivityPanel({ items = [] }: { items?: DashboardActivityItem[] }) {
  return <Card><SectionHeader title="Recent activity" description="A cross-business view of notable CMS events." />{items.length ? <div className="activity-list">{items.map((item) => <div className="activity-item" key={item.id}><span className="activity-item__rail"><span /></span><div><div className="activity-item__meta"><Badge tone={item.tone}>{item.domain}</Badge><small>{item.detail.split("·").at(-1)}</small></div><strong>{item.title}</strong><p>{item.detail.split("·")[0]}</p></div></div>)}</div> : <p className="empty-copy">No recent production activity.</p>}</Card>;
}

export function ReadinessPanel({ rows }: { rows: { label: string; value: string; state: "good" | "pending" }[] }) {
  return <Card><SectionHeader title="Foundation readiness" description="Production readiness across source, runtime and infrastructure gates." /><div className="readiness-list">{rows.map((row) => <div className="readiness-row" key={row.label}><span>{row.state === "good" ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}{row.label}</span><strong>{row.value}</strong></div>)}</div></Card>;
}
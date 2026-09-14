import { AlertTriangle, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { SectionHeader } from "./SectionHeader";

export function AttentionPanel({ items }: { items: { title: string; detail: string; tone: "warning" | "danger" | "info" }[] }) {
  return <Card><SectionHeader title="Attention required" description="Items that could affect operations or revenue." /><div className="attention-list">{items.length?items.map((item) => <div key={item.title} className="attention-item"><span className={`attention-item__icon attention-item__icon--${item.tone}`}><AlertTriangle size={17} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRight size={16} /></div>):<p className="empty-copy">No production attention items are currently recorded.</p>}</div></Card>;
}

export type DashboardActivityItem = {
  id: string;
  domain: string;
  title: string;
  detail: string;
  meta?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
};

export function ActivityPanel({ items = [] }: { items?: DashboardActivityItem[] }) {
  return <Card><SectionHeader title="Recent activity" description="A cross-business view of notable CMS events." />{items.length?<div className="activity-list">{items.map((item) => <div className="activity-item" key={item.id}><span className="activity-item__rail"><span /></span><div><div className="activity-item__meta"><Badge tone={item.tone??"neutral"}>{item.domain}</Badge>{item.meta&&<small>{item.meta}</small>}</div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}</div>:<p className="empty-copy">No recent production activity has been recorded.</p>}</Card>;
}

export function ReadinessPanel({ rows }: { rows: { label: string; value: string; state: "good" | "pending" }[] }) {
  return <Card><SectionHeader title="Foundation readiness" description="Runtime and product readiness for the current environment." /><div className="readiness-list">{rows.map((row) => <div className="readiness-row" key={row.label}><span>{row.state === "good" ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}{row.label}</span><strong>{row.value}</strong></div>)}</div></Card>;
}

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./Card";

export function MetricCard({ label, value, detail, icon: Icon, trend }: { label: string; value: string; detail: string; icon: LucideIcon; trend?: { value: string; direction: "up" | "down" } }) {
  return (
    <Card className="metric-card">
      <div className="metric-card__top"><span className="metric-card__label">{label}</span><span className="metric-card__icon"><Icon size={18} /></span></div>
      <strong className="metric-card__value">{value}</strong>
      <div className="metric-card__footer">
        <span>{detail}</span>
        {trend && <span className={`metric-card__trend metric-card__trend--${trend.direction}`}>{trend.direction === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{trend.value}</span>}
      </div>
    </Card>
  );
}

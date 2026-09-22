import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

export function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="metric-card">
      <div className="metric-card__top"><span className="metric-card__label">{label}</span><span className="metric-card__icon"><Icon size={18} /></span></div>
      <strong className="metric-card__value">{value}</strong>
    </Card>
  );
}

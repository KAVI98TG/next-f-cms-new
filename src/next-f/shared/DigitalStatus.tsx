import { Badge } from "../../shared/components";

const toneMap: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  new: "info", contacted: "neutral", qualified: "success", lost: "danger",
  discovery: "info", proposal: "warning", negotiation: "warning", won: "success",
  draft: "neutral", sent: "info", accepted: "success", declined: "danger", expired: "danger",
  active: "success", prospect: "info", inactive: "neutral", paused: "neutral", past_due: "danger",
  issued: "info", partially_paid: "warning", paid: "success", overdue: "danger", cancelled: "neutral", refunded: "warning",
  planned: "neutral", blocked: "danger", awaiting_client: "warning", completed: "success",
  todo: "neutral", in_progress: "info", done: "success",
  ready: "info", approved: "success", rejected: "danger", changes_requested: "warning", pending: "warning",
  online: "success", degraded: "warning", offline: "danger", maintenance: "info",
  valid: "success", expiring: "warning", issue: "danger", due: "warning",
  open: "info", waiting_client: "warning", resolved: "success", closed: "neutral",
  low: "neutral", normal: "info", high: "warning", urgent: "danger",
};

export function DigitalStatus({ value }: { value: string }) {
  const label = value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return <Badge tone={toneMap[value] ?? "neutral"}>{label}</Badge>;
}

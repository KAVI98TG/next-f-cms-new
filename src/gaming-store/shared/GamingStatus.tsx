import { Badge } from "../../shared/components";
export function GamingStatus({ value }: { value: string }) {
  const success = ["connected","available","completed","reconciled","resolved","active","paid"].includes(value);
  const danger = ["failed","unavailable","supplier_only","urgent","disabled"].includes(value);
  const warning = ["processing","submitted","validating","payment_only","refund_pending","degraded","open","high","not_configured"].includes(value);
  return <Badge tone={success ? "success" : danger ? "danger" : warning ? "warning" : "neutral"}>{value.replace(/_/g, " ")}</Badge>;
}

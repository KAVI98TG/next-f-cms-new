export function StatusDot({ status = "success" }: { status?: "success" | "warning" | "danger" | "neutral" }) {
  return <span className={`status-dot status-dot--${status}`} aria-hidden="true" />;
}

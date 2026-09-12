export function formatLkr(value: number) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-LK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatRelative(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function gamingLkr(value: number) { return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(value); }
export function gamingMoney(value: number, currency: string) { return currency === "LKR" ? gamingLkr(value) : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }
export function gamingDate(value?: string) { return value ? new Intl.DateTimeFormat("en-LK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "-"; }
export function gamingLabel(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }

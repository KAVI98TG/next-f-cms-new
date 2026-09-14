import type { DigitalDeliverable, GamingFulfillmentStatus } from "../types";

export type NormalizedSupplierWebhook = { providerKey: string; supplierOrderId: string; status: GamingFulfillmentStatus; deliverables: DigitalDeliverable[]; rawEventId?: string };

/** Keep provider payload parsing server-side and normalize before writing NEXT F orders. */
export function normalizeFazerCardsWebhook(payload: Record<string, unknown>): NormalizedSupplierWebhook {
  const order = (payload.order ?? payload.data ?? payload) as Record<string, unknown>;
  const statusRaw = String(order.status ?? payload.status ?? "processing").toLowerCase();
  const status: GamingFulfillmentStatus = statusRaw === "completed" ? "completed" : statusRaw === "failed" ? "failed" : statusRaw === "refunded" ? "refunded" : "processing";
  const deliverables: DigitalDeliverable[] = [];
  const candidate = order.code ?? order.pin ?? order.key ?? order.serial;
  if (typeof candidate === "string" && candidate) deliverables.push({ type: order.pin ? "pin" : order.serial ? "serial" : order.key ? "code" : "code", value: candidate, label: "Digital delivery" });
  return { providerKey: "fazercards", supplierOrderId: String(order.id ?? order.order_id ?? payload.order_id ?? ""), status, deliverables, rawEventId: typeof payload.id === "string" ? payload.id : undefined };
}

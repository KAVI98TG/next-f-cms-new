import { platformStore, type PlatformNotification } from "../../platform/services/platformStore";
import { digitalStore } from "../../next-f/data/digitalStore";
import { gamingStore } from "../../gaming-store/data/gamingStore";
import { softwareStore } from "../../software/data/softwareStore";
import { helpCenterStore } from "../../platform/help-center/data/helpCenterStore";

const ACK_KEY = "nextf.v0.7.operations.acknowledged";
const acked = () => { try { return JSON.parse(window.localStorage.getItem(ACK_KEY) ?? "[]") as string[]; } catch { return []; } };
const generated = (id: string, title: string, detail: string, domain: string, tone: PlatformNotification["tone"], createdAt: string): PlatformNotification => ({ id, title, detail, domain, tone, read: acked().includes(id), createdAt });

export function getOperationsNotifications(): PlatformNotification[] {
  const items: PlatformNotification[] = [...platformStore.getNotifications()];
  helpCenterStore.getRequests().filter((request) => ["high", "urgent"].includes(request.priority) && !["resolved", "closed"].includes(request.status)).forEach((request) => items.push(generated(`ops:help:${request.id}`, `${request.number} · ${request.subject}`, `${request.customerName} · ${request.business} · ${request.status.replace(/_/g, " ")}`, "Help Center", request.priority === "urgent" ? "danger" : "warning", request.updatedAt)));
  digitalStore.getSites().filter((site) => site.status === "offline" || site.status === "degraded").forEach((site) => items.push(generated(`ops:site:${site.id}`, `${site.domain} is ${site.status}`, `${site.name} requires Digital operations attention.`, "Digital", site.status === "offline" ? "danger" : "warning", site.updatedAt)));
  digitalStore.getTickets().filter((ticket) => ["high", "urgent"].includes(ticket.priority) && !["resolved", "closed"].includes(ticket.status)).forEach((ticket) => items.push(generated(`ops:ticket:${ticket.id}`, `${ticket.priority.toUpperCase()} support ticket`, `${ticket.number} · ${ticket.subject}`, "Digital", ticket.priority === "urgent" ? "danger" : "warning", ticket.updatedAt)));
  const now = Date.now();
  digitalStore.getSubscriptions().filter((sub) => sub.status === "active" && new Date(sub.nextRenewalAt).getTime() - now < 14 * 86400000).forEach((sub) => items.push(generated(`ops:renewal:${sub.id}`, "Digital renewal approaching", `${sub.name} renews ${new Date(sub.nextRenewalAt).toLocaleDateString()}.`, "Digital", "info", sub.nextRenewalAt)));
  const gs = gamingStore.getSettings();
  gamingStore.getSuppliers().filter((supplier) => supplier.enabled && (supplier.status !== "connected" || (supplier.currency === "USD" && supplier.balance < gs.lowSupplierBalanceUsd))).forEach((supplier) => items.push(generated(`ops:supplier:${supplier.id}`, `${supplier.name} needs attention`, supplier.status !== "connected" ? `Supplier status is ${supplier.status}.` : `Balance is $${supplier.balance.toFixed(2)}.`, "Gaming", supplier.status !== "connected" ? "danger" : "warning", supplier.lastTestAt ?? supplier.lastSyncAt ?? new Date().toISOString())));
  gamingStore.getOrders().filter((order) => order.status === "failed" || order.status === "refund_pending").forEach((order) => items.push(generated(`ops:gaming-order:${order.id}`, `${order.number} · ${order.status.replace(/_/g, " ")}`, order.failureReason ?? "Order requires manual review.", "Gaming", order.status === "failed" ? "danger" : "warning", order.updatedAt)));
  softwareStore.getLicenses().filter((license) => license.status === "active" && license.expiresAt && new Date(license.expiresAt).getTime() - now < 30 * 86400000).forEach((license) => items.push(generated(`ops:license:${license.id}`, "Software license expiring", `${license.key} expires ${new Date(license.expiresAt!).toLocaleDateString()}.`, "Software", "info", license.expiresAt!)));
  softwareStore.getSupportCases().filter((ticket) => ticket.status !== "closed" && ticket.priority !== "normal").forEach((ticket) => items.push(generated(`ops:software-support:${ticket.id}`, `${ticket.priority.toUpperCase()} software support`, `${ticket.number} · ${ticket.subject}`, "Software", ticket.priority === "urgent" ? "danger" : "warning", ticket.updatedAt)));
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markOperationsNotification(id: string, readState = true) {
  if (!id.startsWith("ops:")) return platformStore.markNotification(id, readState);
  const set = new Set(acked());
  if (readState) set.add(id); else set.delete(id);
  window.localStorage.setItem(ACK_KEY, JSON.stringify([...set]));
  window.dispatchEvent(new CustomEvent("nextf:operations-center"));
}

export function markAllOperationsNotifications() {
  platformStore.markAllNotifications();
  const generatedIds = getOperationsNotifications().filter((item) => item.id.startsWith("ops:")).map((item) => item.id);
  window.localStorage.setItem(ACK_KEY, JSON.stringify(generatedIds));
  window.dispatchEvent(new CustomEvent("nextf:operations-center"));
}

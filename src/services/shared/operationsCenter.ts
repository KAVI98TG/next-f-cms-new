import { platformStore, type PlatformNotification } from "../../platform/services/platformStore";
import { digitalStore } from "../../next-f/data/digitalStore";
import { softwareStore } from "../../software/data/softwareStore";
import { helpCenterStore } from "../../platform/help-center/data/helpCenterStore";
import { readDurableValue, writeDurableValue } from "../production/durableStorage";

const ACK_PREFIX = "nextf.v0.7.operations.acknowledged.";
const ackKey = (staffUserId = "local") => `${ACK_PREFIX}${staffUserId}`;
const acked = (staffUserId = "local") => readDurableValue<string[]>(ackKey(staffUserId), []);
const generated = (staffUserId: string, id: string, title: string, detail: string, domain: string, tone: PlatformNotification["tone"], createdAt: string, href?: string): PlatformNotification => ({ id, title, detail, domain, tone, read: acked(staffUserId).includes(id), createdAt, ...(href ? { href } : {}) });

function staticOperationalNotifications(staffUserId: string): PlatformNotification[] {
  const items: PlatformNotification[] = [...platformStore.getNotifications()];
  helpCenterStore.getRequests().filter((request) => ["high", "urgent"].includes(request.priority) && !["resolved", "closed"].includes(request.status)).forEach((request) => items.push(generated(staffUserId, `ops:help:${request.id}`, `${request.number} · ${request.subject}`, `${request.customerName} · ${request.business} · ${request.status.replace(/_/g, " ")}`, "Help Center", request.priority === "urgent" ? "danger" : "warning", request.updatedAt, "/platform/help-center")));
  digitalStore.getSites().filter((site) => site.status === "offline" || site.status === "degraded").forEach((site) => items.push(generated(staffUserId, `ops:site:${site.id}`, `${site.domain} is ${site.status}`, `${site.name} requires Digital operations attention.`, "Digital", site.status === "offline" ? "danger" : "warning", site.updatedAt, "/next-f-digital/sites")));
  digitalStore.getTickets().filter((ticket) => ["high", "urgent"].includes(ticket.priority) && !["resolved", "closed"].includes(ticket.status)).forEach((ticket) => items.push(generated(staffUserId, `ops:ticket:${ticket.id}`, `${ticket.priority.toUpperCase()} support ticket`, `${ticket.number} · ${ticket.subject}`, "Digital", ticket.priority === "urgent" ? "danger" : "warning", ticket.updatedAt, "/next-f-digital/support")));
  const now = Date.now();
  digitalStore.getSubscriptions().filter((sub) => sub.status === "active" && new Date(sub.nextRenewalAt).getTime() - now < 14 * 86400000).forEach((sub) => items.push(generated(staffUserId, `ops:renewal:${sub.id}`, "Digital renewal approaching", `${sub.name} renews ${new Date(sub.nextRenewalAt).toLocaleDateString()}.`, "Digital", "info", sub.nextRenewalAt, "/next-f-digital/billing")));
  softwareStore.getLicenses().filter((license) => license.status === "active" && license.expiresAt && new Date(license.expiresAt).getTime() - now < 30 * 86400000).forEach((license) => items.push(generated(staffUserId, `ops:license:${license.id}`, "Software license expiring", `${license.key} expires ${new Date(license.expiresAt!).toLocaleDateString()}.`, "Software", "info", license.expiresAt!, "/next-f-software/licenses")));
  softwareStore.getSupportCases().filter((ticket) => ticket.status !== "closed" && ticket.priority !== "normal").forEach((ticket) => items.push(generated(staffUserId, `ops:software-support:${ticket.id}`, `${ticket.priority.toUpperCase()} software support`, `${ticket.number} · ${ticket.subject}`, "Software", ticket.priority === "urgent" ? "danger" : "warning", ticket.updatedAt, "/next-f-software/support")));
  return items;
}
export function getOperationsNotifications(staffUserId="local"):PlatformNotification[]{const byId=new Map<string,PlatformNotification>();for(const item of staticOperationalNotifications(staffUserId))byId.set(item.id,item);return[...byId.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export function markOperationsNotification(staffUserId:string,id:string,readState=true){if(!id.startsWith("ops:"))return platformStore.markNotification(id,readState);const set=new Set(acked(staffUserId));if(readState)set.add(id);else set.delete(id);writeDurableValue(ackKey(staffUserId),[...set]);window.dispatchEvent(new CustomEvent("nextf:operations-center"));}
export function markAllOperationsNotifications(staffUserId:string,items?:PlatformNotification[]){platformStore.markAllNotifications();const generatedIds=(items??getOperationsNotifications(staffUserId)).filter((item)=>item.id.startsWith("ops:")).map((item)=>item.id);writeDurableValue(ackKey(staffUserId),generatedIds);window.dispatchEvent(new CustomEvent("nextf:operations-center"));}
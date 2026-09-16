import { digitalStore } from "../../next-f/data/digitalStore";
import { softwareStore } from "../../software/data/softwareStore";

export type BusinessDomain = "digital" | "gaming" | "software";
export type SharedAccountRef = { domain: BusinessDomain; entityId: string; kind: "client" | "customer" };
export type SharedAccount = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  domains: BusinessDomain[];
  refs: SharedAccountRef[];
  lifetimeValueLkr: number;
  lifetimeValueUsd: number;
  lastActivityAt?: string;
};

export type SharedPayment = {
  id: string;
  domain: BusinessDomain;
  sourceType: "invoice" | "order";
  sourceId: string;
  reference: string;
  accountId?: string;
  amount: number;
  currency: "LKR" | "USD";
  status: "pending" | "paid" | "refunded" | "failed";
  paidAt?: string;
  createdAt: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const accountId = (email: string) => `acct_${normalizeEmail(email).replace(/[^a-z0-9]+/g, "_")}`;

export function getSharedAccounts(): SharedAccount[] {
  const map = new Map<string, SharedAccount>();
  const upsert = (input: Omit<SharedAccount, "id" | "domains" | "refs" | "lifetimeValueLkr" | "lifetimeValueUsd"> & { domain: BusinessDomain; ref: SharedAccountRef; lkr?: number; usd?: number }) => {
    const key = normalizeEmail(input.email);
    if (!key) return;
    const existing = map.get(key) ?? {
      id: accountId(key), name: input.name, email: key, phone: input.phone, company: input.company,
      domains: [], refs: [], lifetimeValueLkr: 0, lifetimeValueUsd: 0, lastActivityAt: input.lastActivityAt,
    };
    if (!existing.domains.includes(input.domain)) existing.domains.push(input.domain);
    if (!existing.refs.some((ref) => ref.domain === input.ref.domain && ref.entityId === input.ref.entityId)) existing.refs.push(input.ref);
    existing.lifetimeValueLkr += input.lkr ?? 0;
    existing.lifetimeValueUsd += input.usd ?? 0;
    existing.phone ||= input.phone;
    existing.company ||= input.company;
    if (input.lastActivityAt && (!existing.lastActivityAt || new Date(input.lastActivityAt) > new Date(existing.lastActivityAt))) existing.lastActivityAt = input.lastActivityAt;
    map.set(key, existing);
  };

  digitalStore.getClients().forEach((client) => {
    const paid = digitalStore.getInvoices().filter((invoice) => invoice.clientId === client.id && invoice.status === "paid").reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    upsert({ name: client.name, company: client.company, email: client.email, phone: client.phone, domain: "digital", ref: { domain: "digital", entityId: client.id, kind: "client" }, lkr: paid, lastActivityAt: client.since });
  });
  softwareStore.getCustomers().forEach((customer) => upsert({ name: customer.name, company: customer.company, email: customer.email, domain: "software", ref: { domain: "software", entityId: customer.id, kind: "customer" }, usd: customer.lifetimeValue, lastActivityAt: customer.lastOrderAt ?? customer.createdAt }));
  return [...map.values()].sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));
}

export function getSharedPayments(): SharedPayment[] {
  const accounts = getSharedAccounts();
  const byRef = new Map<string, string>();
  accounts.forEach((account) => account.refs.forEach((ref) => byRef.set(`${ref.domain}:${ref.entityId}`, account.id)));
  const digital = digitalStore.getInvoices().map<SharedPayment>((invoice) => ({
    id: `pay_digital_${invoice.id}`, domain: "digital", sourceType: "invoice", sourceId: invoice.id, reference: invoice.number,
    accountId: byRef.get(`digital:${invoice.clientId}`), amount: invoice.paidAmount || invoice.amount, currency: "LKR",
    status: invoice.status === "paid" ? "paid" : invoice.status === "refunded" ? "refunded" : "pending", paidAt: invoice.paidAt, createdAt: invoice.issuedAt,
  }));
  const software = softwareStore.getOrders().map<SharedPayment>((order) => ({
    id: `pay_software_${order.id}`, domain: "software", sourceType: "order", sourceId: order.id, reference: order.number,
    accountId: byRef.get(`software:${order.customerId}`), amount: order.amount, currency: "USD",
    status: order.status === "paid" ? "paid" : order.status === "refunded" ? "refunded" : "pending", paidAt: order.paidAt, createdAt: order.createdAt,
  }));
  return [...digital, ...software].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const commerceCenter = { getAccounts: getSharedAccounts, getPayments: getSharedPayments };

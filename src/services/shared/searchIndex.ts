import { allNavigation } from "../../app/navigation";
import { platformStore } from "../../platform/services/platformStore";
import { digitalStore } from "../../next-f/data/digitalStore";
import { gamingStore } from "../../gaming-store/data/gamingStore";
import { softwareStore } from "../../software/data/softwareStore";
import { helpCenterStore } from "../../platform/help-center/data/helpCenterStore";
import { websitePlatformStore } from "../../next-f/website-platform/websitePlatformStore";
import { identityStore } from "../../platform/identity/identityStore";
import { customerAccessStore } from "../../platform/customer-access/customerAccessStore";

export type GlobalSearchResult = { id: string; label: string; detail: string; domain: string; type: string; path: string; keywords: string };

export function buildGlobalSearchIndex(): GlobalSearchResult[] {
  const results: GlobalSearchResult[] = allNavigation.map((item) => ({ id: `nav:${item.path}`, label: item.label, detail: item.description, domain: item.domain.shortLabel, type: "Module", path: item.path, keywords: `${item.label} ${item.description} ${item.domain.label}` }));
  platformStore.getUsers().forEach((user) => results.push({ id: `user:${user.id}`, label: user.name, detail: user.email, domain: "Platform", type: "Staff", path: "/platform/users", keywords: `${user.name} ${user.email} ${user.status}` }));
  identityStore.getAccounts().forEach((account) => results.push({ id: `acct:${account.id}`, label: account.displayName, detail: account.primaryEmail, domain: "Platform", type: "NEXT F Account", path: "/platform/identity", keywords: `${account.displayName} ${account.primaryEmail} ${account.verificationState} ${account.state}` }));
  customerAccessStore.getMemberships().forEach((membership) => results.push({ id: `membership:${membership.id}`, label: membership.id, detail: `${membership.status} · ${membership.invitationState}`, domain: "Digital", type: "Customer Membership", path: "/next-f/website-platform", keywords: `${membership.accountId} ${membership.workspaceId} ${membership.customerRoleId} ${membership.status}` }));
  digitalStore.getClients().forEach((client) => results.push({ id: `dc:${client.id}`, label: client.company || client.name, detail: client.email, domain: "Digital", type: "Client", path: "/next-f/clients", keywords: `${client.name} ${client.company} ${client.email} ${client.phone}` }));
  digitalStore.getInvoices().forEach((invoice) => results.push({ id: `di:${invoice.id}`, label: invoice.number, detail: `${invoice.status} · LKR ${invoice.amount.toLocaleString("en-LK")}`, domain: "Digital", type: "Invoice", path: "/next-f/billing", keywords: `${invoice.number} ${invoice.status}` }));
  digitalStore.getProjects().forEach((project) => results.push({ id: `dp:${project.id}`, label: project.name, detail: `${project.status} · ${project.progress}%`, domain: "Digital", type: "Project", path: "/next-f/projects", keywords: `${project.name} ${project.status}` }));
  digitalStore.getSites().forEach((site) => results.push({ id: `ds:${site.id}`, label: site.domain, detail: `${site.name} · ${site.status}`, domain: "Digital", type: "Site", path: "/next-f/sites", keywords: `${site.domain} ${site.name} ${site.status}` }));
  websitePlatformStore.getWorkspaces().forEach((workspace) => results.push({ id: `cws:${workspace.id}`, label: workspace.name, detail: `${workspace.status} · ${workspace.key}`, domain: "Digital", type: "Customer Workspace", path: "/next-f/website-platform", keywords: `${workspace.name} ${workspace.key} ${workspace.status}` }));
  gamingStore.getCustomers().forEach((customer) => results.push({ id: `gc:${customer.id}`, label: customer.name, detail: customer.email, domain: "Gaming", type: "Customer", path: "/gaming-store/customers", keywords: `${customer.name} ${customer.email} ${customer.phone}` }));
  gamingStore.getOrders().forEach((order) => results.push({ id: `go:${order.id}`, label: order.number, detail: `${order.status} · LKR ${Math.round(order.sellingPrice).toLocaleString("en-LK")}`, domain: "Gaming", type: "Order", path: "/gaming-store/orders", keywords: `${order.number} ${order.status} ${order.validationName ?? ""}` }));
  gamingStore.getProducts().forEach((product) => results.push({ id: `gp:${product.id}`, label: product.name, detail: `${product.game} · LKR ${Math.round(product.sellingPrice).toLocaleString("en-LK")}`, domain: "Gaming", type: "Product", path: "/gaming-store/products", keywords: `${product.name} ${product.game} ${product.slug}` }));
  softwareStore.getCustomers().forEach((customer) => results.push({ id: `sc:${customer.id}`, label: customer.name, detail: customer.email, domain: "Software", type: "Customer", path: "/software/customers", keywords: `${customer.name} ${customer.email} ${customer.company}` }));
  softwareStore.getOrders().forEach((order) => results.push({ id: `so:${order.id}`, label: order.number, detail: `${order.status} · $${order.amount}`, domain: "Software", type: "Order", path: "/software/orders", keywords: `${order.number} ${order.status}` }));
  softwareStore.getLicenses().forEach((license) => results.push({ id: `sl:${license.id}`, label: license.key, detail: `${license.status} · ${license.activationLimit} activations`, domain: "Software", type: "License", path: "/software/licenses", keywords: `${license.key} ${license.status}` }));
  softwareStore.getProducts().forEach((product) => results.push({ id: `sp:${product.id}`, label: product.name, detail: `${product.type} · ${product.status}`, domain: "Software", type: "Product", path: "/software/products", keywords: `${product.name} ${product.slug} ${product.type}` }));
  helpCenterStore.getArticles().forEach((article) => results.push({ id: `ha:${article.id}`, label: article.title, detail: article.summary, domain: "Platform", type: "Help Article", path: "/platform/help-center", keywords: `${article.title} ${article.summary} ${article.slug} ${article.audience}` }));
  helpCenterStore.getFaqs().forEach((faq) => results.push({ id: `hf:${faq.id}`, label: faq.question, detail: faq.answer, domain: "Platform", type: "Help FAQ", path: "/platform/help-center", keywords: `${faq.question} ${faq.answer} ${faq.audience}` }));
  helpCenterStore.getRequests().forEach((request) => results.push({ id: `hr:${request.id}`, label: request.number, detail: `${request.subject} · ${request.email}`, domain: "Platform", type: "Help Request", path: "/platform/help-center", keywords: `${request.number} ${request.customerName} ${request.email} ${request.subject} ${request.business} ${request.status}` }));
  return results;
}

export function searchGlobal(query: string, limit = 12) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return buildGlobalSearchIndex().slice(0, limit);
  return buildGlobalSearchIndex().map((item) => {
    const haystack = `${item.label} ${item.detail} ${item.domain} ${item.type} ${item.keywords}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? (item.label.toLowerCase().includes(term) ? 4 : 1) : -20), 0);
    return { item, score };
  }).filter(({ score }) => score >= 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ item }) => item);
}

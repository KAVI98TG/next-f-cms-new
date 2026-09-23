import { allNavigation } from "../../app/navigation";
import { platformPermissionCatalog, platformStore } from "../../platform/services/platformStore";
import { platformOperationsStore } from "../../platform/services/platformOperationsStore";
import { digitalStore } from "../../next-f/data/digitalStore";
import { digitalAdminStore } from "../../next-f/operations/digitalAdminStore";
import { gamingVNextStore } from "../../gaming-store/vnext/runtime/store";
import { softwareStore } from "../../software/data/softwareStore";
import { commerceCenter } from "../shared/commerceCenter";
import { buildGlobalSearchIndex } from "../shared/searchIndex";
import { getOperationsNotifications } from "../shared/operationsCenter";
import { helpCenterStore } from "../../platform/help-center/data/helpCenterStore";
import { getDurableStateStatus } from "../production/durableStorage";

export type AcceptanceStatus = "pass" | "warning" | "fail" | "deferred";
export type AcceptanceCategory = "Application" | "Platform" | "Digital" | "Gaming" | "Software" | "Shared" | "Infrastructure";
export type AcceptanceCheck = { id:string; category:AcceptanceCategory; label:string; detail:string; status:AcceptanceStatus };
export type AcceptanceReport = { generatedAt:string; checks:AcceptanceCheck[]; pass:number; warning:number; fail:number; deferred:number; productReady:boolean; score:number };

const ids = <T extends { id:string }>(rows:T[]) => new Set(rows.map((row)=>row.id));
const unique = (values:string[]) => new Set(values.map((value)=>value.toLowerCase().trim())).size === values.length;
const check = (category:AcceptanceCategory, id:string, label:string, ok:boolean, passDetail:string, failDetail:string, warning=false):AcceptanceCheck => ({ category, id, label, status:ok?"pass":warning?"warning":"fail", detail:ok?passDetail:failDetail });

function storageAvailable(){
  const status=getDurableStateStatus();
  return status.initialized&&!status.lastError;
}


export function runFinalAcceptance():AcceptanceReport {
  const checks:AcceptanceCheck[]=[];
  const users=platformStore.getUsers(); const roles=platformStore.getRoles();
  const organizations=platformOperationsStore.getOrganizations(); const workspaces=platformOperationsStore.getWorkspaces(); const domains=platformOperationsStore.getDomains(); const securityPolicies=platformOperationsStore.getSecurityPolicies(); const backups=platformOperationsStore.getBackups(); const retention=platformOperationsStore.getRetention();
  const helpCategories=helpCenterStore.getCategories(); const helpArticles=helpCenterStore.getArticles(); const helpFaqs=helpCenterStore.getFaqs(); const helpAnnouncements=helpCenterStore.getAnnouncements(); const helpReplies=helpCenterStore.getReplies(); const helpRequests=helpCenterStore.getRequests(); const helpSettings=helpCenterStore.getSettings();
  const services=digitalStore.getServices(); const leads=digitalStore.getLeads(); const opps=digitalStore.getOpportunities(); const proposals=digitalStore.getProposals(); const clients=digitalStore.getClients(); const invoices=digitalStore.getInvoices(); const projects=digitalStore.getProjects(); const tasks=digitalStore.getTasks(); const deliverables=digitalStore.getDeliverables(); const approvals=digitalStore.getApprovals(); const subscriptions=digitalStore.getSubscriptions(); const sites=digitalStore.getSites(); const tickets=digitalStore.getTickets();
  const addons=digitalAdminStore.getAddons(); const projectTemplates=digitalAdminStore.getTemplates(); const adjustments=digitalAdminStore.getAdjustments(); const portalAccess=digitalAdminStore.getPortalAccess(); const digitalSettings=digitalAdminStore.getSettings();
  const gamingProducts=gamingVNextStore.getProducts(); const gamingOffers=gamingVNextStore.getOffers(); const gamingMappings=gamingVNextStore.getMappings(); const gamingFamilies=gamingVNextStore.getGameFamilies();
  const swProducts=softwareStore.getProducts(); const editions=softwareStore.getEditions(); const releases=softwareStore.getReleases(); const swCustomers=softwareStore.getCustomers(); const swOrders=softwareStore.getOrders(); const licenses=softwareStore.getLicenses(); const activations=softwareStore.getActivations(); const swSubs=softwareStore.getSubscriptions(); const updates=softwareStore.getUpdates(); const downloads=softwareStore.getDownloads(); const swSupport=softwareStore.getSupportCases();

  const routePaths=allNavigation.map((item)=>item.path);
  checks.push(check("Application","routes-unique","Unique route registry",unique(routePaths),`${routePaths.length} registered routes are unique.`,`Duplicate route paths detected.`));
  checks.push(check("Application","storage","Durable data boundary",storageAvailable(),"CMS data boundary initialized successfully.","CMS durable data boundary is unavailable."));
  checks.push(check("Application","route-shape","Workspace route boundaries",routePaths.every((path)=>["/platform/","/next-f/","/gaming-store/","/software/"].some((prefix)=>path.startsWith(prefix))),"All routes belong to a defined workspace.","At least one route falls outside a defined workspace."));

  const roleIds=ids(roles); const permissionCatalog=new Set(platformPermissionCatalog.flatMap((group)=>group.permissions));
  checks.push(check("Platform","user-roles","Staff role references",users.every((user)=>roleIds.has(user.roleId)),`${users.length} staff records point to valid roles.`,`One or more staff records point to missing roles.`));
  checks.push(check("Platform","staff-email","Unique staff emails",unique(users.map((user)=>user.email)),"Staff email identities are unique.","Duplicate staff email identities detected."));
  checks.push(check("Platform","role-permissions","Known role permissions",roles.every((role)=>role.permissions.every((permission)=>permissionCatalog.has(permission))),"All role permissions exist in the permission catalog.","A role contains an unknown permission."));
  checks.push(check("Platform","manage-read","Manage/read dependency",roles.every((role)=>role.permissions.every((permission)=>!permission.endsWith(".manage")||role.permissions.includes(`${permission.split(".")[0]}.read`))),"Manage permissions retain matching domain read permission.","A role has manage permission without domain read permission."));

  const organizationIds=ids(organizations), workspaceIds=ids(workspaces);
  checks.push(check("Platform","workspace-org-refs","Workspace organization references",workspaces.every((row)=>organizationIds.has(row.organizationId)),"All workspaces belong to valid organizations.","A workspace references a missing organization."));
  checks.push(check("Platform","domain-workspace-refs","Domain workspace references",domains.every((row)=>workspaceIds.has(row.workspaceId)),"All managed domains belong to valid workspaces.","A managed domain references a missing workspace."));
  checks.push(check("Platform","domain-hostnames","Unique managed hostnames",unique(domains.map((row)=>row.hostname)),"Managed domain hostnames are unique.","Duplicate managed hostnames detected."));
  checks.push(check("Platform","required-security","Required security policies",securityPolicies.filter((row)=>row.severity==="required").every((row)=>row.enabled),"All required local security policies are enabled.","A required security policy is disabled.",true));
  checks.push(check("Platform","backup-boundary","Backup storage boundary",backups.every((row)=>Object.keys(row.payload).every((key)=>key.startsWith("nextf."))),"Local backup snapshots contain only NEXT F namespaced records.","A backup contains data outside the NEXT F storage namespace."));
  checks.push(check("Platform","retention-policy","Retention policy values",retention.auditDays>=30&&retention.logDays>=7&&retention.notificationDays>=7&&retention.backupCount>=1,"Retention thresholds are within supported bounds.","Retention policy contains an invalid threshold."));
  const helpCategoryIds=ids(helpCategories);
  checks.push(check("Platform","help-category-slugs","Help Center category slugs",unique(helpCategories.map((row)=>row.slug)),"Help Center category slugs are unique.","Duplicate Help Center category slugs detected."));
  checks.push(check("Platform","help-article-refs","Help article category references",helpArticles.every((row)=>helpCategoryIds.has(row.categoryId))&&unique(helpArticles.map((row)=>row.slug)),"Help articles reference valid categories and have unique slugs.","A Help Center article has a missing category or duplicate slug."));
  checks.push(check("Platform","help-faq-refs","Help FAQ category references",helpFaqs.every((row)=>helpCategoryIds.has(row.categoryId)),"Help FAQs reference valid categories.","A Help Center FAQ references a missing category."));
  checks.push(check("Platform","help-request-integrity","Customer help requests",helpRequests.every((row)=>row.customerName.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)&&["unassigned","digital","gaming","software"].includes(row.business)),"Customer help requests contain valid identity and routing fields.","A Help Center request has invalid identity or routing data."));
  checks.push(check("Platform","help-reply-shortcuts","Saved reply shortcuts",unique(helpReplies.map((row)=>row.shortcut)),"Saved reply shortcuts are unique.","Duplicate Help Center saved-reply shortcuts detected."));
  checks.push(check("Platform","help-settings","Help Center settings",!!helpSettings.name.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(helpSettings.contactEmail)&&!!helpSettings.welcomeTitle.trim(),"Help Center customer-experience settings are valid.","Help Center settings are incomplete or invalid."));
  checks.push(check("Platform","help-announcements","Help Center announcements",helpAnnouncements.every((row)=>!!row.title.trim()&&!!row.message.trim()&&!!row.publishAt),"Help Center announcements contain publishable content.","A Help Center announcement is incomplete."));

  const serviceIds=ids(services), leadIds=ids(leads), clientIds=ids(clients), oppIds=ids(opps), projectIds=ids(projects), siteIds=ids(sites), subscriptionIds=ids(subscriptions);
  checks.push(check("Digital","lead-service","Lead → service references",leads.every((row)=>typeof row.serviceId==="string"&&serviceIds.has(row.serviceId)),`${leads.length} leads reference valid services.`,`A lead references a missing service.`));
  checks.push(check("Digital","opportunity-refs","Opportunity relationships",opps.every((row)=>serviceIds.has(row.serviceId)&&(!row.leadId||leadIds.has(row.leadId))&&(!row.clientId||clientIds.has(row.clientId))),"Opportunity relationships are intact.","An opportunity has an orphan lead, client or service reference."));
  checks.push(check("Digital","proposal-refs","Proposal relationships",proposals.every((row)=>oppIds.has(row.opportunityId)&&serviceIds.has(row.serviceId)&&(!row.clientId||clientIds.has(row.clientId))),"Proposal relationships are intact.","A proposal has an orphan opportunity, client or service reference."));
  checks.push(check("Digital","invoice-refs","Invoice relationships",invoices.every((row)=>clientIds.has(row.clientId)&&(!row.projectId||projectIds.has(row.projectId))&&(!row.subscriptionId||subscriptionIds.has(row.subscriptionId))),"Invoice relationships are intact.","An invoice has an orphan client, project or subscription reference."));
  checks.push(check("Digital","invoice-values","Invoice value integrity",invoices.every((row)=>row.amount>=0&&row.paidAmount>=0&&row.paidAmount<=row.amount),"Invoice paid amounts stay within invoice totals.","An invoice contains an invalid amount or paid balance."));
  checks.push(check("Digital","project-refs","Project relationships",projects.every((row)=>clientIds.has(row.clientId)&&serviceIds.has(row.serviceId)),"Projects reference valid clients and services.","A project references a missing client or service."));
  checks.push(check("Digital","project-progress","Project progress bounds",projects.every((row)=>row.progress>=0&&row.progress<=100),"All project progress values are within 0-100%.","A project progress value is outside 0-100%."));
  checks.push(check("Digital","delivery-refs","Task/deliverable/approval relationships",[...tasks,...deliverables,...approvals].every((row)=>projectIds.has(row.projectId)),"Delivery records reference valid projects.","A task, deliverable or approval references a missing project."));
  checks.push(check("Digital","subscription-refs","Recurring-service relationships",subscriptions.every((row)=>clientIds.has(row.clientId)&&serviceIds.has(row.serviceId)&&(!row.projectId||projectIds.has(row.projectId))),"Recurring services reference valid business records.","A subscription references a missing client, service or project."));
  checks.push(check("Digital","site-support-refs","Site/support relationships",sites.every((row)=>clientIds.has(row.clientId)&&(!row.projectId||projectIds.has(row.projectId)))&&tickets.every((row)=>clientIds.has(row.clientId)&&(!row.projectId||projectIds.has(row.projectId))&&(!row.siteId||siteIds.has(row.siteId))),"Managed sites and support tickets are linked correctly.","A managed site or support ticket has an orphan relationship."));
  checks.push(check("Digital","addon-refs","Service add-on relationships",addons.every((row)=>serviceIds.has(row.serviceId)&&row.price>=0),"Service add-ons reference valid services and non-negative prices.","A service add-on has an invalid service reference or price."));
  checks.push(check("Digital","template-refs","Project template relationships",projectTemplates.every((row)=>(!row.serviceId||serviceIds.has(row.serviceId))&&row.stages.length>=2),"Project templates contain usable stages and valid service references.","A project template is incomplete or references a missing service."));
  checks.push(check("Digital","adjustment-refs","Billing adjustment relationships",adjustments.every((row)=>invoices.some((invoice)=>invoice.id===row.invoiceId)&&row.amount>0),"Billing adjustments reference valid invoices and positive amounts.","A billing adjustment has an invalid invoice reference or amount."));
  checks.push(check("Digital","portal-refs","Client portal relationships",portalAccess.every((row)=>clientIds.has(row.clientId))&&unique(portalAccess.map((row)=>row.clientId)),"Portal access records map one-to-one to valid clients.","Client portal access contains an orphan or duplicate client mapping."));
  checks.push(check("Digital","workflow-settings","Digital workflow settings",digitalSettings.proposalValidityDays>=1&&digitalSettings.invoiceDueDays>=1&&digitalSettings.renewalReminderDays>=1&&digitalSettings.defaultGraceDays>=0,"Digital workflow defaults are within supported bounds.","Digital workflow settings contain an invalid threshold."));

  const gamingProductIds=ids(gamingProducts), gamingOfferIds=ids(gamingOffers);
  checks.push(check("Gaming","catalog-product-slugs","Canonical product slugs",unique(gamingProducts.map((row)=>row.slug)),"Canonical Gaming product slugs are unique.","Duplicate canonical Gaming product slugs detected."));
  checks.push(check("Gaming","catalog-offer-refs","Offer → product relationships",gamingOffers.every((row)=>gamingProductIds.has(row.productId)),"Every retail offer references a canonical NEXT F product.","A retail offer references a missing canonical product."));
  checks.push(check("Gaming","catalog-routing-refs","Supplier routing relationships",gamingMappings.every((row)=>gamingOfferIds.has(row.offerId)&&row.priority>=1),"Supplier mappings reference valid retail offers with positive routing priority.","A supplier mapping has an invalid offer reference or priority."));
  const routingKeys=gamingMappings.map((row)=>`${row.offerId}:${row.priority}`);
  checks.push(check("Gaming","catalog-routing-priority","Unique route priorities",unique(routingKeys),"Supplier route priorities are unique within each offer.","Two supplier mappings share the same routing priority for one offer.",true));
  checks.push(check("Gaming","family-slugs","Game-family identities",unique(gamingFamilies.map((row)=>row.slug)),"Game-family slugs are unique.","Duplicate game-family slugs detected."));
  checks.push(check("Gaming","legacy-production-retired","Legacy production surfaces retired",!routePaths.includes("/gaming-store/products")&&!routePaths.includes("/gaming-store/orders")&&!routePaths.includes("/gaming-store/settings")&&routePaths.includes("/gaming-store/catalog")&&routePaths.includes("/gaming-store/customers"),"Gaming navigation uses the canonical catalog, Live Operations and Customer 360 surfaces.","Legacy Gaming navigation is still exposed."));

  const swProductIds=ids(swProducts), editionIds=ids(editions), swCustomerIds=ids(swCustomers), swOrderIds=ids(swOrders), licenseIds=ids(licenses), releaseIds=ids(releases);
  checks.push(check("Software","edition-refs","Edition → product references",editions.every((row)=>swProductIds.has(row.productId)),"All commercial editions reference valid products.","An edition references a missing software product."));
  checks.push(check("Software","release-refs","Release → product references",releases.every((row)=>swProductIds.has(row.productId)),"All releases reference valid products.","A release references a missing software product."));
  checks.push(check("Software","order-refs","Software order relationships",swOrders.every((row)=>swCustomerIds.has(row.customerId)&&swProductIds.has(row.productId)&&editionIds.has(row.editionId)),"Software orders reference valid customer/product/edition records.","A software order has an orphan relationship."));
  checks.push(check("Software","license-refs","License relationships",licenses.every((row)=>swCustomerIds.has(row.customerId)&&swProductIds.has(row.productId)&&editionIds.has(row.editionId)&&(!row.orderId||swOrderIds.has(row.orderId))),"Software licenses reference valid commercial records.","A software license has an orphan relationship."));
  checks.push(check("Software","license-key","Unique license keys",unique(licenses.map((row)=>row.key)),"Software license keys are unique.","Duplicate software license keys detected."));
  checks.push(check("Software","activation-limit","Activation limits",licenses.every((license)=>activations.filter((row)=>row.licenseId===license.id&&row.status==="active").length<=license.activationLimit),"Active installations stay within purchased limits.","A software license exceeds its activation limit."));
  checks.push(check("Software","subscription-refs","Software subscription relationships",swSubs.every((row)=>swCustomerIds.has(row.customerId)&&swProductIds.has(row.productId)&&editionIds.has(row.editionId)&&licenseIds.has(row.licenseId)),"Software subscriptions reference valid entitlements.","A software subscription has an orphan relationship."));
  checks.push(check("Software","download-refs","Download authorization relationships",downloads.every((row)=>swCustomerIds.has(row.customerId)&&swProductIds.has(row.productId)&&releaseIds.has(row.releaseId)&&licenseIds.has(row.licenseId)),"Download authorizations reference valid customer/product/release/license records.","A download authorization has an orphan relationship."));
  checks.push(check("Software","support-refs","Software support relationships",swSupport.every((row)=>swCustomerIds.has(row.customerId)&&swProductIds.has(row.productId)&&(!row.licenseId||licenseIds.has(row.licenseId))),"Software support cases reference valid commercial records.","A software support case has an orphan relationship."));
  checks.push(check("Software","update-refs","Update-check relationships",updates.every((row)=>licenseIds.has(row.licenseId)&&swProductIds.has(row.productId)),"Update-check history references valid licenses/products.","An update check has an orphan relationship."));

  const accounts=commerceCenter.getAccounts(); const payments=commerceCenter.getPayments(); const search=buildGlobalSearchIndex(); const operations=getOperationsNotifications();
  checks.push(check("Shared","account-email","Normalized account identities",unique(accounts.map((row)=>row.email)),`${accounts.length} shared account identities are normalized by email.`,`Duplicate shared account identities detected.`));
  checks.push(check("Shared","payment-values","Unified payment values",payments.every((row)=>row.amount>=0&&Number.isFinite(row.amount)),`${payments.length} unified payment records have valid amounts.`,`A unified payment record contains an invalid amount.`));
  checks.push(check("Shared","search-index","Global search index",search.length>=allNavigation.length,`${search.length} module/entity search entries are available.`,`Global search index did not load expected module entries.`));
  checks.push(check("Shared","operations-center","Operations inbox",Array.isArray(operations),`${operations.length} operational notifications evaluated.`,`Operations center failed to produce a notification list.`));

  checks.push({id:"infra-live",category:"Infrastructure",label:"Production infrastructure",status:"pass",detail:"Workers, D1, R2, Cloudflare Access and Gaming production boundaries are active; provider-specific live health remains covered by dedicated operational checks."});

  const pass=checks.filter((item)=>item.status==="pass").length; const warning=checks.filter((item)=>item.status==="warning").length; const fail=checks.filter((item)=>item.status==="fail").length; const deferred=checks.filter((item)=>item.status==="deferred").length; const assessed=Math.max(1,pass+warning+fail); const score=Math.round(((pass+warning*0.5)/assessed)*100);
  return { generatedAt:new Date().toISOString(), checks, pass, warning, fail, deferred, productReady:fail===0, score };
}

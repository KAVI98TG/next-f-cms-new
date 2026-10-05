import { useEffect, type ReactNode } from "react";
import { AppShell } from "./layout/AppShell";
import { useRouter } from "./router/RouterProvider";
import { PlatformDashboard } from "../platform/dashboard/PlatformDashboard";
import { FirstPartyAnalyticsPage } from "../platform/dashboard/FirstPartyAnalyticsPage";
import { UsersPage } from "../platform/users/UsersPage";
import { AccessPage } from "../platform/roles/AccessPage";
import { AuditPage } from "../platform/audit/AuditPage";
import { NotificationsPage } from "../platform/notifications/NotificationsPage";
import { IntegrationsPage } from "../platform/integrations/IntegrationsPage";
import { InfrastructurePage } from "../platform/infrastructure/InfrastructurePage";
import { HealthPage } from "../platform/health/HealthPage";
import { AcceptancePage } from "../platform/acceptance/AcceptancePage";
import { SettingsPage } from "../platform/settings/SettingsPage";
import { AccountsPage } from "../platform/accounts/AccountsPage";
import { IdentityPage } from "../platform/identity/IdentityPage";
import { PaymentsPage } from "../platform/payments/PaymentsPage";
import { DataManagementPage } from "../platform/data-management/DataManagementPage";
import { OrganizationsPage } from "../platform/organizations/OrganizationsPage";
import { DomainsPage } from "../platform/domains/DomainsPage";
import { SecurityPage } from "../platform/security/SecurityPage";
import { LogsPage } from "../platform/logs/LogsPage";
import { BackupPage } from "../platform/backup/BackupPage";
import { CleanupPage } from "../platform/cleanup/CleanupPage";
import { HelpCenterPage } from "../platform/help-center/HelpCenterPage";
import { DigitalDashboard } from "../next-f/dashboard/DigitalDashboard";
import { SalesPage } from "../next-f/sales/SalesPage";
import { ClientsPage } from "../next-f/clients/ClientsPage";
import { ServicesPage } from "../next-f/services/ServicesPage";
import { ProjectsPage } from "../next-f/projects/ProjectsPage";
import { BillingPage } from "../next-f/billing/BillingPage";
import { SitesPage } from "../next-f/sites/SitesPage";
import { WebsitePlatformPage } from "../next-f/website-platform/WebsitePlatformPage";
import { SupportPage } from "../next-f/support/SupportPage";
import { AutomationPage } from "../next-f/automation/AutomationPage";
import { ReportsPage } from "../next-f/reports/ReportsPage";
import { DigitalSettingsPage } from "../next-f/settings/DigitalSettingsPage";
import { GamingSummaryPage } from "../gaming-store/summary/GamingSummaryPage";
import { SoftwareDashboard } from "../software/dashboard/SoftwareDashboard";
import { ProductsPage as SoftwareProductsPage } from "../software/products/ProductsPage";
import { ReleasesPage as SoftwareReleasesPage } from "../software/releases/ReleasesPage";
import { LicensesPage as SoftwareLicensesPage } from "../software/licenses/LicensesPage";
import { CustomersPage as SoftwareCustomersPage } from "../software/customers/CustomersPage";
import { OrdersPage as SoftwareOrdersPage } from "../software/orders/OrdersPage";
import { SubscriptionsPage as SoftwareSubscriptionsPage } from "../software/subscriptions/SubscriptionsPage";
import { UpdatesPage as SoftwareUpdatesPage } from "../software/updates/UpdatesPage";
import { DownloadsPage as SoftwareDownloadsPage } from "../software/downloads/DownloadsPage";
import { SupportPage as SoftwareSupportPage } from "../software/support/SupportPage";
import { AnalyticsPage as SoftwareAnalyticsPage } from "../software/analytics/AnalyticsPage";
import { SoftwareSettingsPage } from "../software/settings/SettingsPage";
import { ModuleOverviewPage } from "../shared/pages/ModuleOverviewPage";
import { NotFoundPage } from "../shared/pages/NotFoundPage";
import { domains } from "./navigation";
import { permissionForPath } from "./auth/permissions";
import { useSession } from "./auth/SessionProvider";
import { AccessDeniedPage } from "../shared/pages/AccessDeniedPage";
import { AppErrorBoundary } from "../shared/components";

function LegacyGamingRedirect({to}:{to:string}){
  const {navigate}=useRouter();
  useEffect(()=>navigate(to,{replace:true}),[navigate,to]);
  return null;
}

const routes: Record<string, ReactNode> = {
  "/platform/dashboard": <PlatformDashboard />,
  "/platform/analytics": <FirstPartyAnalyticsPage />,
  "/platform/users": <UsersPage />,
  "/platform/organizations": <OrganizationsPage />,
  "/platform/domains": <DomainsPage />,
  "/platform/security": <SecurityPage />,
  "/platform/logs": <LogsPage />,
  "/platform/backup": <BackupPage />,
  "/platform/cleanup": <CleanupPage />,
  "/platform/identity": <IdentityPage />,
  "/platform/accounts": <AccountsPage />,
  "/platform/payments": <PaymentsPage />,
  "/platform/access": <AccessPage />,
  "/platform/audit": <AuditPage />,
  "/platform/notifications": <NotificationsPage />,
  "/platform/help-center": <HelpCenterPage />,
  "/platform/integrations": <IntegrationsPage />,
  "/platform/infrastructure": <InfrastructurePage />,
  "/platform/health": <HealthPage />,
  "/platform/acceptance": <AcceptancePage />,
  "/platform/data": <DataManagementPage />,
  "/platform/settings": <SettingsPage />,
  "/next-f/dashboard": <DigitalDashboard />,
  "/next-f/sales": <SalesPage />,
  "/next-f/clients": <ClientsPage />,
  "/next-f/services": <ServicesPage />,
  "/next-f/projects": <ProjectsPage />,
  "/next-f/billing": <BillingPage />,
  "/next-f/sites": <SitesPage />,
  "/next-f/website-platform": <WebsitePlatformPage />,
  "/next-f/support": <SupportPage />,
  "/next-f/automation": <AutomationPage />,
  "/next-f/reports": <ReportsPage />,
  "/next-f/settings": <DigitalSettingsPage />,
  "/gaming-store/dashboard": <GamingSummaryPage />,
  "/gaming-store/live-operations": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/orders": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/products": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/pricing": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/suppliers": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/customers": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/reviews": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/finance": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/analytics": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/promotions": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/support": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/settings": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/catalog-vnext": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/catalog": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/gaming-store/storefront": <LegacyGamingRedirect to="/gaming-store/dashboard" />,
  "/software/dashboard": <SoftwareDashboard />,
  "/software/products": <SoftwareProductsPage />,
  "/software/releases": <SoftwareReleasesPage />,
  "/software/licenses": <SoftwareLicensesPage />,
  "/software/customers": <SoftwareCustomersPage />,
  "/software/orders": <SoftwareOrdersPage />,
  "/software/subscriptions": <SoftwareSubscriptionsPage />,
  "/software/updates": <SoftwareUpdatesPage />,
  "/software/downloads": <SoftwareDownloadsPage />,
  "/software/support": <SoftwareSupportPage />,
  "/software/analytics": <SoftwareAnalyticsPage />,
  "/software/settings": <SoftwareSettingsPage />,
};

export function App() {
  const { pathname } = useRouter();
  const { can } = useSession();
  const known = domains.some((domain) => domain.navigation.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`)));
  const permission = permissionForPath(pathname);
  const content = permission && !can(permission) ? <AccessDeniedPage permission={permission} /> : routes[pathname] ?? (known ? <ModuleOverviewPage /> : <NotFoundPage />);
  return <AppShell><AppErrorBoundary scope="route" resetKey={pathname}>{content}</AppErrorBoundary></AppShell>;
}
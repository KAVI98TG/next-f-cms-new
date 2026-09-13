import { Activity, CheckCircle2, Database, Route, Search, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { Badge, Card, SectionHeader } from "../../shared/components";
import { allNavigation } from "../../app/navigation";
import { platformStore } from "../services/platformStore";
import { commerceCenter } from "../../services/shared/commerceCenter";
import { buildGlobalSearchIndex } from "../../services/shared/searchIndex";
import { getOperationsNotifications } from "../../services/shared/operationsCenter";
import { helpCenterStore } from "../help-center/data/helpCenterStore";
import { getDurableStateStatus } from "../../services/production";

export function HealthPage() {
  const accounts=commerceCenter.getAccounts(); const payments=commerceCenter.getPayments(); const search=buildGlobalSearchIndex(); const notifications=getOperationsNotifications(); const helpArticles=helpCenterStore.getArticles(); const helpRequests=helpCenterStore.getRequests(); const durable=getDurableStateStatus();
  const checks=[
    {label:"Application shell",detail:"Responsive SaaS shell, skip navigation and global error boundary loaded.",state:"healthy"},
    {label:"Route registry",detail:`${allNavigation.length} registered admin destinations with permission-aware routing.`,state:"healthy"},
    {label:"Durable repository",detail:`${platformStore.getUsers().length} platform staff records loaded through the ${durable.mode === "production-api" ? "D1 production" : "local prototype"} storage boundary.`,state:durable.initialized?"healthy":"deferred"},
    {label:"Permission enforcement",detail:`${platformStore.getRoles().length} role groups control route and sidebar access.`,state:"healthy"},
    {label:"Shared account model",detail:`${accounts.length} normalized identities linked across business domains.`,state:"healthy"},
    {label:"Unified payments",detail:`${payments.length} normalized Digital, Gaming and Software payment records.`,state:"healthy"},
    {label:"Global search index",detail:`${search.length} searchable modules and business records.`,state:"healthy"},
    {label:"Operations center",detail:`${notifications.length} platform and business notifications available.`,state:"healthy"},
    {label:"Customer Help Center",detail:`${helpArticles.filter((item)=>item.status==="published").length} published articles and ${helpRequests.length} customer requests loaded.`,state:"healthy"},
    {label:"Production backend",detail:durable.mode === "production-api" ? `D1 durable state initialized with ${durable.pendingWrites} pending write${durable.pendingWrites === 1 ? "" : "s"}.` : "Production API mode is not selected in this local prototype session.",state:durable.mode === "production-api"&&durable.initialized?"healthy":"deferred"},
  ];
  return <div className="page"><SectionHeader eyebrow="Platform" title="System health" description="Development-time diagnostics for the complete CMS product layer, separate from production infrastructure monitoring."/><div className="health-hero"><Card><span className="health-hero__icon"><Activity size={22}/></span><div><small>Application status</small><strong>Healthy</strong><p>SaaS product-layer checks are active.</p></div></Card><Card><span className="health-hero__icon"><Route size={22}/></span><div><small>Routes</small><strong>{allNavigation.length}</strong><p>Permission-aware destinations.</p></div></Card><Card><span className="health-hero__icon"><UsersRound size={22}/></span><div><small>Unified accounts</small><strong>{accounts.length}</strong><p>Cross-business identity view.</p></div></Card><Card><span className="health-hero__icon"><WalletCards size={22}/></span><div><small>Payments</small><strong>{payments.length}</strong><p>Provider-independent records.</p></div></Card></div><Card><div className="health-list">{checks.map((check)=><div className="health-row" key={check.label}><span className={`health-row__icon ${check.state==="healthy"?"is-good":"is-deferred"}`}>{check.label.includes("Search")?<Search size={17}/>:check.label.includes("repository")?<Database size={17}/>:check.label.includes("Permission")?<ShieldCheck size={17}/>:<CheckCircle2 size={17}/>}</span><span><strong>{check.label}</strong><small>{check.detail}</small></span><Badge tone={check.state==="healthy"?"success":"info"}>{check.state}</Badge></div>)}</div></Card></div>;
}

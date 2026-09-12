import { ArrowRight, CheckCircle2, CircleDashed, Layers3 } from "lucide-react";
import { Card, SectionHeader } from "../components";
import { getDomainByPath } from "../../app/navigation";
import { useRouter } from "../../app/router/RouterProvider";

const domainPrinciples: Record<string, string> = {
  platform: "Keep only capabilities genuinely shared across all NEXT F businesses.",
  "next-f": "Sell → Deliver → Bill → Maintain → Renew.",
  "gaming-store": "Source → Price → Sell → Fulfill → Reconcile.",
  software: "Build → Release → License → Update → Renew.",
};

export function ModuleOverviewPage() {
  const { pathname } = useRouter();
  const domain = getDomainByPath(pathname);
  const item = domain.navigation.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));
  const label = item?.label ?? domain.label;
  return <div className="page"><SectionHeader eyebrow={domain.label} title={label} description={item?.description ?? domain.description} /><div className="module-foundation-grid"><Card className="module-foundation-card"><span className="module-foundation-card__icon"><Layers3 size={20}/></span><h3>Module boundary established</h3><p>This route now belongs to the new {domain.label} domain. Business implementation will be built here instead of being routed through an old monolithic admin page.</p><div className="architecture-principle"><strong>{domainPrinciples[domain.id]}</strong></div></Card><Card><SectionHeader title="Foundation status" description="What the shared foundation establishes for this module." /><div className="check-list"><span><CheckCircle2 size={17}/>Dedicated route and navigation</span><span><CheckCircle2 size={17}/>Domain permission boundary</span><span><CheckCircle2 size={17}/>Shared SaaS design system</span><span><CheckCircle2 size={17}/>Infrastructure-independent data contract</span><span className="is-pending"><CircleDashed size={17}/>Business workflows start in the next vertical slices</span></div></Card></div><Card className="next-slice"><div><span>Next implementation layer</span><strong>Build real {label.toLowerCase()} workflows inside this module.</strong></div><ArrowRight size={20}/></Card></div>;
}

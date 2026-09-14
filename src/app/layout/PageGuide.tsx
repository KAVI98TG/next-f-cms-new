import { X } from "lucide-react";
import { getDomainByPath } from "../navigation";
import { useRouter } from "../router/RouterProvider";
import { readRuntimeTruth } from "../../services/production";

const runtime=readRuntimeTruth();

export function PageGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useRouter();
  const domain = getDomainByPath(pathname);
  const item = domain.navigation.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));
  return <><div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} /><aside className={`guide-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}><div className="guide-drawer__header"><div><span>Page guide</span><h3>{item?.label ?? domain.label}</h3></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="guide-drawer__body"><p>{item?.description ?? domain.description}</p><div className="guide-note"><strong>{runtime.environmentLabel} runtime</strong><p>{runtime.mode==="production-api"?"This workspace is connected to the production API and durable D1-backed CMS state. External operations remain disabled unless a real integration is connected.":"This workspace is using local prototype adapters. Simulated operations are development-only and never represent production success."}</p></div><h4>Architecture rule</h4><p>Features belong to this business domain unless they are truly shared across every NEXT F business. Shared capabilities move to Platform or shared services.</p></div></aside></>;
}

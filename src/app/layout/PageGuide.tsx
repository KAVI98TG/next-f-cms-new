import { X } from "lucide-react";
import { getDomainByPath } from "../navigation";
import { useRouter } from "../router/RouterProvider";

export function PageGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useRouter();
  const domain = getDomainByPath(pathname);
  const item = domain.navigation.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));
  return <><div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} /><aside className={`guide-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}><div className="guide-drawer__header"><div><span>Page guide</span><h3>{item?.label ?? domain.label}</h3></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="guide-drawer__body"><p>{item?.description ?? domain.description}</p><div className="guide-note"><strong>Local product-development build</strong><p>This workspace is running against infrastructure-independent local development adapters. Production data integrations will be connected only after the CMS product is complete.</p></div><h4>Architecture rule</h4><p>Features belong to this business domain unless they are truly shared across every NEXT F business. Shared capabilities move to Platform or shared services.</p></div></aside></>;
}

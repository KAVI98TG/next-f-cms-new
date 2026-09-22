import { CircleAlert } from "lucide-react";
import { getDomainByPath } from "../../app/navigation";
import { useRouter } from "../../app/router/RouterProvider";
import { Card, SectionHeader } from "../components";

export function ModuleOverviewPage() {
  const { pathname } = useRouter();
  const domain = getDomainByPath(pathname);
  const item = domain.navigation.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));
  const label = item?.label ?? domain.label;
  return <div className="page"><SectionHeader eyebrow={domain.label} title={label}/><Card className="state-panel"><CircleAlert size={22}/><strong>Module unavailable</strong><p>This workspace is not available in the current CMS build.</p></Card></div>;
}

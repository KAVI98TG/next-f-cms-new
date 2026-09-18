import { Badge } from "../../shared/components";

const gamingKindLabel = (kind: string) => kind.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());

export function GamingKindBadge({ kind, label }: { kind: string; label?: string }) {
  return <Badge className="gaming-kind-badge" data-kind={kind}>{label ?? gamingKindLabel(kind)}</Badge>;
}

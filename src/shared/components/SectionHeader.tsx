import type { ReactNode } from "react";

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-header"><div>{eyebrow && <span className="section-header__eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <div>{action}</div>}</div>;
}

import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export function Badge({ children, tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`badge badge--${tone} ${className}`.trim()} {...props}>{children}</span>;
}

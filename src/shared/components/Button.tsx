import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ children, className = "", variant = "secondary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={`button button--${variant} ${className}`.trim()} {...props}>{children}</button>;
}

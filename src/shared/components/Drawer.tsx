import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const focusables = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({ open, title, description, children, footer, className, onClose }: { open:boolean; title:string; description?:string; children:ReactNode; footer?:ReactNode; className?:string; onClose:()=>void; }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(focusables)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !ref.current) return;
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(focusables));
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(timer); window.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="detail-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside ref={ref} className={`detail-drawer${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="detail-drawer-title"><header className="detail-drawer__header"><div><span>Record details</span><h3 id="detail-drawer-title">{title}</h3>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18}/></button></header><div className="detail-drawer__body">{children}</div>{footer && <footer className="detail-drawer__footer">{footer}</footer>}</aside></div>;
}

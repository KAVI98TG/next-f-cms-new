import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useOverlayFocus } from "./useOverlayFocus";

export function Drawer({ open, title, description, children, footer, className, onClose }: { open:boolean; title:string; description?:string; children:ReactNode; footer?:ReactNode; className?:string; onClose:()=>void; }) {
  const ref = useOverlayFocus<HTMLElement>(open, onClose);
  if (!open) return null;
  return <div className="detail-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside ref={ref} tabIndex={-1} className={`detail-drawer${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="detail-drawer-title"><header className="detail-drawer__header"><div><span>Record details</span><h3 id="detail-drawer-title">{title}</h3>{description && <p>{description}</p>}</div><button type="button" className="icon-button" data-overlay-close onClick={onClose} aria-label="Close details"><X size={18}/></button></header><div className="detail-drawer__body">{children}</div>{footer && <footer className="detail-drawer__footer">{footer}</footer>}</aside></div>;
}

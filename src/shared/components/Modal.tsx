import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useOverlayFocus } from "./useOverlayFocus";

export function Modal({ open, title, description, children, footer, className, onClose }: { open:boolean; title:string; description?:string; children:ReactNode; footer?:ReactNode; className?:string; onClose:()=>void; }) {
  const ref = useOverlayFocus<HTMLElement>(open, onClose);
  if(!open)return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><section ref={ref} tabIndex={-1} className={`modal${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description?"modal-description":undefined}><header className="modal__header"><div><h3 id="modal-title">{title}</h3>{description&&<p id="modal-description">{description}</p>}</div><button type="button" className="icon-button" data-overlay-close onClick={onClose} aria-label="Close dialog"><X size={18}/></button></header><div className="modal__body">{children}</div>{footer&&<footer className="modal__footer">{footer}</footer>}</section></div>;
}

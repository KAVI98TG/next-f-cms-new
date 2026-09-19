import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

const focusables = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let openModalCount = 0;
let previousBodyOverflow = "";

export function Modal({ open, title, description, children, footer, className, onClose }: { open:boolean; title:string; description?:string; children:ReactNode; footer?:ReactNode; className?:string; onClose:()=>void; }) {
  const ref=useRef<HTMLElement>(null);
  const reactId=useId().replace(/:/g,"");
  const titleId=`modal-title-${reactId}`;
  const descriptionId=`modal-description-${reactId}`;

  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    const timer=requestAnimationFrame(()=>ref.current?.querySelector<HTMLElement>(focusables)?.focus());
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape")onClose();
      if(event.key!=="Tab"||!ref.current)return;
      const nodes=Array.from(ref.current.querySelectorAll<HTMLElement>(focusables));
      if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    if(openModalCount===0){previousBodyOverflow=document.body.style.overflow;document.body.style.overflow="hidden";}
    openModalCount+=1;
    window.addEventListener("keydown",onKey);
    return()=>{
      cancelAnimationFrame(timer);
      window.removeEventListener("keydown",onKey);
      openModalCount=Math.max(0,openModalCount-1);
      if(openModalCount===0)document.body.style.overflow=previousBodyOverflow;
      previous?.focus();
    };
  },[open,onClose]);

  if(!open)return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><section ref={ref} className={`modal${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description?descriptionId:undefined}><header className="modal__header"><div><h3 id={titleId}>{title}</h3>{description&&<p id={descriptionId}>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18}/></button></header><div className="modal__body">{children}</div>{footer&&<footer className="modal__footer">{footer}</footer>}</section></div>;
}

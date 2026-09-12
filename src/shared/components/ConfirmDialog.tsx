import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, onConfirm, onClose }: { open:boolean; title:string; description:string; confirmLabel?:string; cancelLabel?:string; danger?:boolean; onConfirm:()=>void; onClose:()=>void; }) {
  return <Modal open={open} title={title} description={description} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>{cancelLabel}</Button><Button className={danger ? "button--danger" : ""} variant={danger ? "secondary" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}><div className={`confirm-dialog__message ${danger ? "is-danger" : ""}`}><AlertTriangle size={19}/><p>{danger ? "This action changes a protected or financial state. Review the record before continuing." : "Confirm this state change before it is applied."}</p></div></Modal>;
}

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "info" | "danger";
type ToastInput = { title: string; description?: string; tone?: ToastTone; duration?: number };
type ToastItem = ToastInput & { id: string; tone: ToastTone };

type ToastContextValue = { notify: (toast: ToastInput) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const notify = useCallback((toast: ToastInput) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item: ToastItem = { ...toast, id, tone: toast.tone ?? "info" };
    setItems((current) => [...current.slice(-3), item]);
    window.setTimeout(() => dismiss(id), toast.duration ?? 4200);
  }, [dismiss]);
  const value = useMemo(() => ({ notify }), [notify]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-live="polite" aria-relevant="additions removals">{items.map((item) => {
    const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "danger" ? CircleAlert : Info;
    return <div className={`toast toast--${item.tone}`} role="status" key={item.id}><Icon size={18}/><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div><button className="toast__close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification"><X size={15}/></button></div>;
  })}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

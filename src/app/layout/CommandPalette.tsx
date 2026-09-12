import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "../router/RouterProvider";
import { searchGlobal } from "../../services/shared/searchIndex";
import { permissionForPath } from "../auth/permissions";
import { useSession } from "../auth/SessionProvider";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useRouter();
  const { can } = useSession();
  useEffect(() => { if (open) { setQuery(""); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  const results = useMemo(() => searchGlobal(query, 14).filter((item) => { const permission = permissionForPath(item.path); return !permission || can(permission); }), [query, can]);
  useEffect(() => { if (!open) return; const key = (event: KeyboardEvent) => { if (event.key === "Enter" && results[0]) { navigate(results[0].path); onClose(); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [open, results, navigate, onClose]);
  if (!open) return null;
  return <div className="command-backdrop" onMouseDown={onClose}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Global CMS search" onMouseDown={(e) => e.stopPropagation()}><div className="command-palette__input"><Search size={19} /><input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients, orders, licenses, sites and modules…" aria-label="Search the CMS"/><button className="icon-button" onClick={onClose} aria-label="Close search"><X size={17} /></button></div><div className="command-palette__results">{results.length === 0 ? <div className="command-empty">No matching records or modules.</div> : results.map((item) => <button key={item.id} className="command-result" onClick={() => { navigate(item.path); onClose(); }}><span className="command-result__icon"><Search size={17} /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{item.domain} · {item.type}</em></button>)}</div><div className="command-palette__footer"><span><kbd>↵</kbd> Open first result</span><span><kbd>Esc</kbd> Close</span></div></div></div>;
}

import { Search } from "lucide-react";
import type { ReactNode } from "react";

export function PageToolbar({ query, onQueryChange, placeholder = "Search…", children }: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return <div className="page-toolbar"><label className="toolbar-search"><Search size={16}/><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder}/></label>{children && <div className="page-toolbar__actions">{children}</div>}</div>;
}

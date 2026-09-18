import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export type DataTableColumn<T> = { key:string; header:ReactNode; width?:string; render:(row:T)=>ReactNode; };
export function DataTable<T>({ columns, rows, getKey, empty="No records found." }: { columns:DataTableColumn<T>[]; rows:T[]; getKey:(row:T)=>string; empty?:string; }) {
  return <div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column)=><th scope="col" key={column.key} style={column.width?{width:column.width}:undefined}>{column.header}</th>)}</tr></thead><tbody>{rows.length===0?<tr><td className="data-table__empty" colSpan={columns.length}><div className="table-empty-state"><Inbox size={20}/><span>{empty}</span></div></td></tr>:rows.map((row)=><tr key={getKey(row)}>{columns.map((column)=><td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}

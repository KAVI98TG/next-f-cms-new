import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export type DataTableColumn<T> = {
  key:string;
  header:ReactNode;
  render:(row:T)=>ReactNode;
  sizing?:"grow"|"content";
};

const utilityColumnKeys = new Set(["select","action","actions"]);

export function DataTable<T>({ columns, rows, getKey, empty="No records found." }: { columns:DataTableColumn<T>[]; rows:T[]; getKey:(row:T)=>string; empty?:string; }) {
  const explicitGrow = columns.findIndex((column)=>column.sizing==="grow");
  const inferredGrow = columns.findIndex((column)=>column.sizing!=="content"&&!utilityColumnKeys.has(column.key));
  const growIndex = explicitGrow >= 0 ? explicitGrow : inferredGrow;
  const cellClass = (column:DataTableColumn<T>, index:number) => `data-table__cell ${column.sizing==="grow"||index===growIndex?"data-table__cell--grow":"data-table__cell--content"}${utilityColumnKeys.has(column.key)?" data-table__cell--utility":""}`;

  return <div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column,index)=><th scope="col" key={column.key} data-column={column.key} className={cellClass(column,index)}>{column.header}</th>)}</tr></thead><tbody>{rows.length===0?<tr><td className="data-table__empty" colSpan={columns.length}><div className="table-empty-state"><Inbox size={20}/><span>{empty}</span></div></td></tr>:rows.map((row)=><tr key={getKey(row)}>{columns.map((column,index)=><td key={column.key} data-column={column.key} className={cellClass(column,index)}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}

import { Download } from "lucide-react";
import { Button } from "./Button";
import { downloadCsv, type CsvColumn } from "../utils/csv";
import { useToast } from "../feedback/ToastProvider";

export function ExportCsvButton<T>({ filename, rows, columns, label = "Export CSV" }: { filename:string; rows:T[]; columns:CsvColumn<T>[]; label?:string }) {
  const { notify } = useToast();
  const exportRows = () => {
    downloadCsv(filename, rows, columns);
    notify({ title: "CSV exported", description: `${rows.length} record${rows.length === 1 ? "" : "s"} exported.`, tone: "success" });
  };
  return <Button onClick={exportRows} disabled={rows.length === 0}><Download size={15}/>{label}</Button>;
}

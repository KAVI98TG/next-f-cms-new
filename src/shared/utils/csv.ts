export type CsvColumn<T> = { header: string; value: (row: T) => string | number | boolean | null | undefined };

function escapeCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function createCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  return [
    columns.map((column) => escapeCell(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(",")),
  ].join("\n");
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const blob = new Blob([createCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

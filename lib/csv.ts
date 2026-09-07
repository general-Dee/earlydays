// Shared CSV export helpers for the admin list views. Each list still owns its
// own column choices — it maps its rows to string cells and passes them here —
// but the escaping and the browser download are the same everywhere.

export function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map(escapeCsvField).join(","));
  return lines.join("\n");
}

// Triggers a client-side download of `content` as `<baseName>-YYYY-MM-DD.csv`.
export function downloadCsv(baseName: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

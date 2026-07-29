"use client";

import { Download } from "lucide-react";

export interface CsvRow {
  [key: string]: string | number | null | undefined;
}

interface ExportButtonProps {
  /** Section label shown in button tooltip / filename */
  label: string;
  /** Function that returns the rows to export */
  getData: () => CsvRow[];
  className?: string;
  variant?: "ghost" | "outlined";
}

function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = headers.map(escape).join(",");
  const body = rows.map((row) => headers.map((h) => escape(row[h])).join(",")).join("\n");
  return header + "\n" + body;
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ label, getData, className = "", variant = "ghost" }: ExportButtonProps) {
  const handleClick = () => {
    const rows = getData();
    const csv = toCsv(rows);
    const slug = label.toLowerCase().replace(/\s+/g, "-");
    download(`zaloon-${slug}-${new Date().toISOString().split("T")[0]}.csv`, csv);
  };

  const base =
    "inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer rounded-md px-2.5 py-1.5";
  const styles =
    variant === "outlined"
      ? `${base} border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40`
      : `${base} text-muted-foreground hover:text-foreground hover:bg-secondary/80`;

  return (
    <button type="button" onClick={handleClick} className={`${styles} ${className}`}>
      <Download className="w-3.5 h-3.5" />
      Export CSV
    </button>
  );
}

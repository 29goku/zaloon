"use client";

import { Download } from "lucide-react";

export interface ExportSection {
  title: string;
  rows: Record<string, string | number | null | undefined>[];
}

interface ExportAllButtonProps {
  sections: ExportSection[];
  dateFrom: string;
  dateTo: string;
}

function toCsvSection(title: string, rows: ExportSection["rows"]): string {
  if (rows.length === 0) return `# ${title}\n(no data)\n`;
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
  return `# ${title}\n${header}\n${body}\n`;
}

export function ExportAllButton({ sections, dateFrom, dateTo }: ExportAllButtonProps) {
  const handleClick = () => {
    const parts: string[] = [
      `# Zaloon Reports Export\n# Period: ${dateFrom} to ${dateTo}\n# Generated: ${new Date().toLocaleString()}\n`,
    ];
    for (const s of sections) {
      parts.push(toCsvSection(s.title, s.rows));
    }
    const csv = parts.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zaloon-full-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
    >
      <Download className="w-4 h-4" />
      Export All
    </button>
  );
}

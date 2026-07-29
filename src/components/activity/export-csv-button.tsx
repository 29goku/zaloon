"use client";

import { Download } from "lucide-react";
import type { ActivityItem } from "@/lib/activity-feed-utils";

interface ExportCsvButtonProps {
  items: ActivityItem[];
}

export function ExportCsvButton({ items }: ExportCsvButtonProps) {
  function handleExport() {
    const header = ["Timestamp", "Type", "Entity Name", "Detail", "Amount"];
    const rows = items.map((item) => [
      item.timestamp,
      item.type,
      `"${item.entityName.replace(/"/g, '""')}"`,
      item.detail ? `"${item.detail.replace(/"/g, '""')}"` : "",
      item.amount != null ? item.amount.toFixed(2) : "",
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const date = new Date().toISOString().split("T")[0];
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/40 text-sm font-semibold text-foreground transition-colors"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  );
}

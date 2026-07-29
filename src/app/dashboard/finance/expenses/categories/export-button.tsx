"use client";

import { Download } from "lucide-react";

interface CategoryExportButtonProps {
  month: string;
  monthLabel: string;
  data: {
    category: string;
    total: number;
    count: number;
    avg: number;
    largest: number;
    pct: number;
  }[];
  currency: string;
}

export function CategoryExportButton({
  month,
  monthLabel,
  data,
  currency,
}: CategoryExportButtonProps) {
  function handleExport() {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(n);

    const headers = ["Category", "Total Spent", "# Expenses", "Avg Expense", "Largest", "% of Total"];
    const rows = data.map((row) => [
      row.category,
      fmt(row.total),
      String(row.count),
      row.count > 0 ? fmt(row.avg) : "0",
      row.largest > 0 ? fmt(row.largest) : "0",
      `${row.pct.toFixed(2)}%`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-by-category-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      title={`Export category report for ${monthLabel} as CSV`}
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  );
}

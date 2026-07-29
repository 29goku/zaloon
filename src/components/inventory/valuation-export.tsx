"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ValuationRow {
  id: string;
  name: string;
  category: string;
  qty: number;
  costPrice: number;
  salePrice: number;
  costValue: number;
  retailValue: number;
  margin: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  HAIR_PRODUCTS: "Hair Products",
  COLOR: "Color",
  TOOLS: "Tools",
  RETAIL: "Retail",
  CONSUMABLES: "Consumables",
  OTHER: "Other",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function escapeCSV(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ValuationExport({ rows }: { rows: ValuationRow[] }) {
  function handleExport() {
    const headers = [
      "Name",
      "Category",
      "Qty",
      "Cost Price",
      "Retail Price",
      "Cost Value",
      "Retail Value",
      "Margin %",
    ];

    const csvRows = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) =>
        [
          escapeCSV(row.name),
          escapeCSV(categoryLabel(row.category)),
          escapeCSV(row.qty),
          escapeCSV(row.costPrice > 0 ? row.costPrice.toFixed(2) : ""),
          escapeCSV(row.salePrice > 0 ? row.salePrice.toFixed(2) : ""),
          escapeCSV(row.costValue > 0 ? row.costValue.toFixed(2) : "0"),
          escapeCSV(row.retailValue > 0 ? row.retailValue.toFixed(2) : "0"),
          escapeCSV(row.margin != null ? row.margin.toFixed(1) : ""),
        ].join(",")
      ),
      // Totals row
      [
        escapeCSV("TOTAL"),
        escapeCSV(""),
        escapeCSV(rows.reduce((s, r) => s + r.qty, 0)),
        escapeCSV(""),
        escapeCSV(""),
        escapeCSV(rows.reduce((s, r) => s + r.costValue, 0).toFixed(2)),
        escapeCSV(rows.reduce((s, r) => s + r.retailValue, 0).toFixed(2)),
        escapeCSV(""),
      ].join(","),
    ].join("\r\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-valuation-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
}

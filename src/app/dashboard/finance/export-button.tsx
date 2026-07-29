"use client";

import { Download } from "lucide-react";

interface FinanceExportData {
  from: string;
  to: string;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  staffCommissions: number;
  netProfit: number;
  profitMarginPct: number;
  taxRate: number;
  taxCollected: number;
  netOfTax: number;
  revenuePerClient: number;
  revenuePerStaff: number;
  avgInvoiceValue: number;
  uniqueClients: number;
  paidInvoicesCount: number;
  currency: string;
}

export function FinanceExportButton({ data }: { data: FinanceExportData }) {
  function handleExport() {
    const rows: [string, string][] = [
      ["Financial Report", ""],
      ["Period", `${data.from} to ${data.to}`],
      ["Currency", data.currency],
      ["Generated At", new Date().toISOString()],
      ["", ""],
      ["=== PROFIT & LOSS STATEMENT ===", ""],
      ["Gross Revenue", data.grossRevenue.toFixed(2)],
      ["Refunds / Voids", (-data.refunds).toFixed(2)],
      ["Net Revenue", data.netRevenue.toFixed(2)],
      ["", ""],
      ["Total Operating Expenses", (-data.totalExpenses).toFixed(2)],
      ["Gross Profit", data.grossProfit.toFixed(2)],
      ["", ""],
      ["Staff Commissions", (-data.staffCommissions).toFixed(2)],
      ["Net Profit", data.netProfit.toFixed(2)],
      ["Profit Margin %", `${data.profitMarginPct.toFixed(2)}%`],
      ["", ""],
      ["=== KEY PERFORMANCE INDICATORS ===", ""],
      ["Revenue per Client", data.revenuePerClient.toFixed(2)],
      ["Revenue per Staff Member", data.revenuePerStaff.toFixed(2)],
      ["Average Invoice Value", data.avgInvoiceValue.toFixed(2)],
      ["Unique Clients Served", String(data.uniqueClients)],
      ["Total Paid Invoices", String(data.paidInvoicesCount)],
      ["", ""],
      ["=== TAX SUMMARY ===", ""],
      ["Tax Rate (%)", String(data.taxRate)],
      ["Taxable Revenue (Net Revenue)", data.netRevenue.toFixed(2)],
      ["Tax Collected", data.taxCollected.toFixed(2)],
      ["Revenue Net of Tax", data.netOfTax.toFixed(2)],
    ];

    const csvContent = rows
      .map(([label, value]) => {
        const escapedLabel = `"${label.replace(/"/g, '""')}"`;
        const escapedValue = `"${String(value).replace(/"/g, '""')}"`;
        return `${escapedLabel},${escapedValue}`;
      })
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${data.from}-to-${data.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors flex-shrink-0"
    >
      <Download className="w-4 h-4" />
      Export Financial Report
    </button>
  );
}

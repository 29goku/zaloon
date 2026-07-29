"use client";

import { Download } from "lucide-react";

interface ExportRow {
  staffId: string;
  staffName: string;
  commissionPct: number;
  servicesCount: number;
  totalRevenue: number;
  commissionEarned: number;
  tips: number;
  netPay: number;
  status: string;
}

interface PayrollExportButtonProps {
  rows: ExportRow[];
  from: string;
  to: string;
}

export function PayrollExportButton({ rows, from, to }: PayrollExportButtonProps) {
  function handleExport() {
    const header = ["Name", "Commission %", "Appointments", "Revenue", "Commission", "Tips", "Net Pay", "Status"];
    const csvRows = rows.map((r) => [
      `"${r.staffName.replace(/"/g, '""')}"`,
      r.commissionPct.toFixed(1),
      r.servicesCount,
      r.totalRevenue.toFixed(2),
      r.commissionEarned.toFixed(2),
      r.tips.toFixed(2),
      r.netPay.toFixed(2),
      r.status,
    ]);
    const csv = [header.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
    >
      <Download className="w-3.5 h-3.5" />
      Export CSV
    </button>
  );
}

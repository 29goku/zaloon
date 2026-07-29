"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PnLData {
  serviceRevenue: number;
  productSales: number;
  tipsReceived: number;
  costOfGoods: number;
  staffCommission: number;
  rent: number;
  utilities: number;
  marketing: number;
  otherExpenses: number;
  currency: string;
  periodLabel: string;
}

interface PnLStatementProps extends PnLData {
  onRangeChange?: (range: "this-month" | "last-month" | "custom") => void;
  currentRange?: "this-month" | "last-month" | "custom";
}

function Row({
  label,
  value,
  fmt,
  indent = false,
  subtotal = false,
  total = false,
  negative = false,
}: {
  label: string;
  value: number;
  fmt: (n: number) => string;
  indent?: boolean;
  subtotal?: boolean;
  total?: boolean;
  negative?: boolean;
}) {
  return (
    <tr
      className={`${
        total
          ? "border-t-2 border-border"
          : subtotal
          ? "border-t border-border"
          : ""
      }`}
    >
      <td
        className={`py-2 pr-6 ${
          total
            ? "text-base font-bold text-foreground"
            : subtotal
            ? "font-semibold text-foreground"
            : indent
            ? "pl-4 text-sm text-muted-foreground"
            : "text-sm text-muted-foreground"
        }`}
      >
        {label}
      </td>
      <td
        className={`py-2 text-right tabular-nums ${
          total
            ? `text-base font-bold ${value >= 0 ? "text-emerald-500" : "text-destructive"}`
            : subtotal
            ? "font-semibold text-foreground"
            : negative
            ? "text-destructive text-sm"
            : "text-sm text-foreground"
        }`}
      >
        {negative && value !== 0 ? `(${fmt(Math.abs(value))})` : fmt(Math.abs(value))}
      </td>
    </tr>
  );
}

function Divider() {
  return (
    <tr>
      <td colSpan={2} className="py-1">
        <div className="h-px bg-border" />
      </td>
    </tr>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="pt-4 pb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </td>
    </tr>
  );
}

export function PnLStatement({
  serviceRevenue,
  productSales,
  tipsReceived,
  costOfGoods,
  staffCommission,
  rent,
  utilities,
  marketing,
  otherExpenses,
  currency,
  periodLabel,
  onRangeChange,
  currentRange = "this-month",
}: PnLStatementProps) {
  const [downloading, setDownloading] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const totalRevenue = serviceRevenue + productSales + tipsReceived;
  const totalExpenses = costOfGoods + staffCommission + rent + utilities + marketing + otherExpenses;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  function exportCSV() {
    setDownloading(true);
    const rows = [
      ["Category", "Item", "Amount"],
      ["Revenue", "Service Revenue", serviceRevenue.toFixed(2)],
      ["Revenue", "Product Sales", productSales.toFixed(2)],
      ["Revenue", "Tips Received", tipsReceived.toFixed(2)],
      ["Revenue", "Total Revenue", totalRevenue.toFixed(2)],
      ["Expenses", "Cost of Goods", costOfGoods.toFixed(2)],
      ["Expenses", "Staff Commission", staffCommission.toFixed(2)],
      ["Expenses", "Rent", rent.toFixed(2)],
      ["Expenses", "Utilities", utilities.toFixed(2)],
      ["Expenses", "Marketing", marketing.toFixed(2)],
      ["Expenses", "Other", otherExpenses.toFixed(2)],
      ["Expenses", "Total Expenses", totalExpenses.toFixed(2)],
      ["Summary", "Net Profit", netProfit.toFixed(2)],
      ["Summary", "Profit Margin %", profitMargin.toFixed(1)],
    ];

    const csv =
      `P&L Statement — ${periodLabel}\n` +
      rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnl-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(false), 1000);
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Profit &amp; Loss Statement
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Range selector */}
            {onRangeChange && (
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                {(
                  [
                    { key: "this-month" as const, label: "This Month" },
                    { key: "last-month" as const, label: "Last Month" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onRangeChange(key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      currentRange === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {/* Export CSV */}
            <button
              type="button"
              onClick={exportCSV}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="max-w-lg">
          <table className="w-full text-sm">
            <tbody>
              <SectionHeader label="Revenue" />
              <Row label="Service Revenue" value={serviceRevenue} fmt={fmt} indent />
              <Row label="Product Sales" value={productSales} fmt={fmt} indent />
              <Row label="Tips Received" value={tipsReceived} fmt={fmt} indent />
              <Divider />
              <Row label="Total Revenue" value={totalRevenue} fmt={fmt} subtotal />

              <SectionHeader label="Expenses" />
              <Row label="Cost of Goods" value={costOfGoods} fmt={fmt} indent negative />
              <Row label="Staff Commission" value={staffCommission} fmt={fmt} indent negative />
              <Row label="Rent" value={rent} fmt={fmt} indent negative />
              <Row label="Utilities" value={utilities} fmt={fmt} indent negative />
              <Row label="Marketing" value={marketing} fmt={fmt} indent negative />
              {otherExpenses > 0 && (
                <Row label="Other Expenses" value={otherExpenses} fmt={fmt} indent negative />
              )}
              <Divider />
              <Row label="Total Expenses" value={totalExpenses} fmt={fmt} subtotal negative />

              <Row label="Net Profit" value={netProfit} fmt={fmt} total />
            </tbody>
          </table>

          {/* Margin summary */}
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Profit Margin
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  profitMargin >= 0 ? "text-emerald-500" : "text-destructive"
                }`}
              >
                {profitMargin.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Net Profit
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  netProfit >= 0 ? "text-emerald-500" : "text-destructive"
                }`}
              >
                {fmt(netProfit)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

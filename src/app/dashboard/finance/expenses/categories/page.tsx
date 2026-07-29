import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/app/actions/expenses-constants";
import { CategoryExportButton } from "./export-button";
import { MonthPicker } from "./month-picker";

export const dynamic = "force-dynamic";

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DONUT_COLORS: Record<string, string> = {
  RENT_UTILITIES: "#8b5cf6",
  PRODUCTS_SUPPLIES: "#3b82f6",
  STAFF: "#10b981",
  MARKETING: "#ec4899",
  EQUIPMENT: "#f59e0b",
  OTHER: "#64748b",
};

// ── SVG donut chart ────────────────────────────────────────────────────────────

function DonutChart({
  slices,
}: {
  slices: { label: string; color: string; pct: number; amount: number; fmt: (n: number) => string }[];
}) {
  const r = 80;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const nonZero = slices.filter((s) => s.pct > 0);

  if (nonZero.length === 0) {
    return (
      <svg viewBox="0 0 200 200" className="w-full max-w-[200px]">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--secondary)" strokeWidth="28" />
        <text x={cx} y={cy + 5} textAnchor="middle" className="fill-muted-foreground text-xs" style={{ font: "12px system-ui" }}>
          No data
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px]" aria-label="Category spending donut chart">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--secondary)" strokeWidth="28" />
      {nonZero.map((slice) => {
        const dashLength = (slice.pct / 100) * circumference;
        const dashGap = circumference - dashLength;
        const strokeDashoffset = circumference - offset * circumference;
        const el = (
          <circle
            key={slice.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth="28"
            strokeDasharray={`${dashLength} ${dashGap}`}
            strokeDashoffset={-offset * circumference + circumference * 0.25}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          >
            <title>{`${slice.label}: ${slice.fmt(slice.amount)} (${slice.pct.toFixed(1)}%)`}</title>
          </circle>
        );
        offset += slice.pct / 100;
        return el;
      })}
      {/* Center label */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        style={{ font: "bold 12px system-ui, sans-serif", fill: "currentColor" }}
        className="fill-foreground"
      >
        {nonZero.length}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        style={{ font: "10px system-ui, sans-serif" }}
        className="fill-muted-foreground"
      >
        categories
      </text>
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ExpenseCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const now = new Date();

  // Build available months (last 12)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = toDateString(d).slice(0, 7); // "YYYY-MM"
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    monthOptions.push({ value, label });
  }

  const selectedMonth =
    typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month)
      ? sp.month
      : monthOptions[0].value;

  const [year, month] = selectedMonth.split("-").map(Number);
  const fromDate = toDateString(new Date(year, month - 1, 1));
  const toDate = toDateString(new Date(year, month, 0));

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Fetch all expenses in the selected month
  const expenses = await prisma.expense.findMany({
    where: {
      salonId: salon?.id ?? "",
      date: { gte: fromDate, lte: toDate },
    },
    select: { category: true, amount: true, description: true },
  });

  // Group by category
  type CategoryStats = {
    cat: ExpenseCategory;
    label: string;
    total: number;
    count: number;
    avg: number;
    largest: number;
    color: string;
  };

  const statsMap: Record<string, { total: number; count: number; largest: number }> = {};
  for (const exp of expenses) {
    if (!statsMap[exp.category]) {
      statsMap[exp.category] = { total: 0, count: 0, largest: 0 };
    }
    statsMap[exp.category].total += exp.amount;
    statsMap[exp.category].count += 1;
    if (exp.amount > statsMap[exp.category].largest) {
      statsMap[exp.category].largest = exp.amount;
    }
  }

  const grandTotal = Object.values(statsMap).reduce((s, v) => s + v.total, 0);

  const categoryStats: CategoryStats[] = EXPENSE_CATEGORIES.map((cat) => {
    const s = statsMap[cat] ?? { total: 0, count: 0, largest: 0 };
    return {
      cat,
      label: CATEGORY_LABELS[cat],
      total: s.total,
      count: s.count,
      avg: s.count > 0 ? s.total / s.count : 0,
      largest: s.largest,
      color: DONUT_COLORS[cat] ?? "#64748b",
    };
  }).sort((a, b) => b.total - a.total);

  const donutSlices = categoryStats
    .filter((c) => c.total > 0)
    .map((c) => ({
      label: c.label,
      color: c.color,
      pct: grandTotal > 0 ? (c.total / grandTotal) * 100 : 0,
      amount: c.total,
      fmt,
    }));

  // Data for CSV export
  const csvData = categoryStats.map((c) => ({
    category: c.label,
    total: c.total,
    count: c.count,
    avg: c.avg,
    largest: c.largest,
    pct: grandTotal > 0 ? (c.total / grandTotal) * 100 : 0,
  }));

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/finance/expenses"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Expenses
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-7 h-7 text-primary" />
            Category Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Spending breakdown by category for{" "}
            <span className="text-foreground font-semibold">
              {monthOptions.find((m) => m.value === selectedMonth)?.label ?? selectedMonth}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker options={monthOptions} selectedMonth={selectedMonth} />
          <CategoryExportButton
            month={selectedMonth}
            monthLabel={monthOptions.find((m) => m.value === selectedMonth)?.label ?? selectedMonth}
            data={csvData}
            currency={currency}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 · Donut + Legend
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Spending Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-48 flex-shrink-0">
                <DonutChart slices={donutSlices} />
              </div>
              <div className="flex-1 space-y-2 w-full">
                {donutSlices.map((slice) => (
                  <div key={slice.label} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-foreground flex-1 truncate">{slice.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {slice.pct.toFixed(1)}%
                    </span>
                    <span className="text-foreground font-semibold tabular-nums ml-2">
                      {fmt(slice.amount)}
                    </span>
                  </div>
                ))}
                {donutSlices.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No expenses recorded for this month.
                  </p>
                )}
                {donutSlices.length > 0 && (
                  <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>Total</span>
                    <span className="tabular-nums">{fmt(grandTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary stats */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  label: "Total Expenses",
                  value: fmt(grandTotal),
                  sub: `${expenses.length} transactions`,
                },
                {
                  label: "Avg per Transaction",
                  value:
                    expenses.length > 0
                      ? fmt(grandTotal / expenses.length)
                      : "—",
                  sub: "across all categories",
                },
                {
                  label: "Largest Single Expense",
                  value:
                    categoryStats.length > 0
                      ? fmt(Math.max(...categoryStats.map((c) => c.largest), 0))
                      : "—",
                  sub: "across all categories",
                },
                {
                  label: "Active Categories",
                  value: `${categoryStats.filter((c) => c.count > 0).length} / ${EXPENSE_CATEGORIES.length}`,
                  sub: "with at least one expense",
                },
              ].map(({ label, value, sub }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 · Category Detail Table
      ════════════════════════════════════════════════════════════════════ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Category Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left">
                    Category
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Total Spent
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    # Expenses
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Avg Expense
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Largest
                  </th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((row) => {
                  const pct = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
                  return (
                    <tr
                      key={row.cat}
                      className={`border-b border-border/50 transition-colors ${
                        row.count > 0 ? "hover:bg-secondary/30" : "opacity-50"
                      }`}
                    >
                      <td className="py-3 pr-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: row.color }}
                          />
                          {row.label}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-foreground tabular-nums">
                        {row.total > 0 ? fmt(row.total) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right text-muted-foreground tabular-nums">
                        {row.count}
                      </td>
                      <td className="py-3 pr-4 text-right text-muted-foreground tabular-nums">
                        {row.count > 0 ? fmt(row.avg) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right text-muted-foreground tabular-nums">
                        {row.largest > 0 ? fmt(row.largest) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        {pct > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: row.color,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-foreground tabular-nums w-10 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="pt-3 pb-1 font-bold text-foreground">Total</td>
                  <td className="pt-3 pb-1 text-right font-bold text-foreground tabular-nums">
                    {fmt(grandTotal)}
                  </td>
                  <td className="pt-3 pb-1 text-right font-bold text-foreground tabular-nums">
                    {expenses.length}
                  </td>
                  <td className="pt-3 pb-1 text-right font-bold text-foreground tabular-nums">
                    {expenses.length > 0 ? fmt(grandTotal / expenses.length) : "—"}
                  </td>
                  <td className="pt-3 pb-1 text-right font-bold text-foreground tabular-nums">
                    {categoryStats.length > 0 ? fmt(Math.max(...categoryStats.map((c) => c.largest), 0)) : "—"}
                  </td>
                  <td className="pt-3 pb-1 text-right font-bold text-foreground">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Receipt,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
} from "lucide-react";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/app/actions/expenses-constants";
import { getBudgets } from "@/app/actions/budget";

export const dynamic = "force-dynamic";

// ── Category style map ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  RENT_UTILITIES: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  PRODUCTS_SUPPLIES: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  STAFF: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  MARKETING: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  EQUIPMENT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  OTHER: "bg-secondary text-muted-foreground",
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  RENT_UTILITIES: "#8b5cf6",
  PRODUCTS_SUPPLIES: "#3b82f6",
  STAFF: "#10b981",
  MARKETING: "#ec4899",
  EQUIPMENT: "#f59e0b",
  OTHER: "#64748b",
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  CASH: "💵",
  CARD: "💳",
  TRANSFER: "🏦",
};

const CATEGORIES_WITH_ALL = ["ALL", ...EXPENSE_CATEGORIES] as const;
type CategoryFilter = (typeof CATEGORIES_WITH_ALL)[number];

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function FinanceExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const categoryFilter: CategoryFilter =
    typeof sp.category === "string" &&
    CATEGORIES_WITH_ALL.includes(sp.category as CategoryFilter)
      ? (sp.category as CategoryFilter)
      : "ALL";

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);

  const from =
    typeof sp.from === "string" && sp.from.match(/^\d{4}-\d{2}-\d{2}$/)
      ? sp.from
      : toDateString(defaultFrom);
  const to =
    typeof sp.to === "string" && sp.to.match(/^\d{4}-\d{2}-\d{2}$/)
      ? sp.to
      : toDateString(now);

  const effectiveFrom = from <= to ? from : to;
  const effectiveTo = from <= to ? to : from;

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // ── Date boundaries ──────────────────────────────────────────────────────────

  const thisMonthStart = toDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonthEnd = toDateString(now);
  const lastMonthStart = toDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = toDateString(new Date(now.getFullYear(), now.getMonth(), 0));
  const sixMonthsAgoStr = toDateString(new Date(now.getFullYear(), now.getMonth() - 5, 1));

  // ── Parallel data fetches ────────────────────────────────────────────────────

  const [
    allExpensesInRange,
    filteredExpenses,
    thisMonthAgg,
    lastMonthAgg,
    thisMonthExpenses,
    trendExpenses,
    recurringExpenses,
    budgets,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: effectiveFrom, lte: effectiveTo },
      },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: effectiveFrom, lte: effectiveTo },
        ...(categoryFilter !== "ALL" && { category: categoryFilter }),
      },
      orderBy: { date: "desc" },
    }),
    prisma.expense.aggregate({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      select: { category: true, amount: true },
    }),
    prisma.expense.findMany({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: sixMonthsAgoStr, lte: toDateString(now) },
      },
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { salonId: salon?.id ?? "", isRecurring: true },
      orderBy: { recurringDay: "asc" },
    }),
    getBudgets(),
  ]);

  // ── Calculations ─────────────────────────────────────────────────────────────

  const totalExpenses = allExpensesInRange.reduce((s, e) => s + e.amount, 0);

  const categoryTotals: Record<string, number> = {};
  for (const exp of allExpensesInRange) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] ?? 0) + exp.amount;
  }

  const thisMonthTotal = thisMonthAgg._sum.amount ?? 0;
  const lastMonthTotal = lastMonthAgg._sum.amount ?? 0;

  const monthChangePct =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : null;

  // This-month category totals for budget comparison
  const thisMonthCategoryTotals: Record<string, number> = {};
  for (const exp of thisMonthExpenses) {
    thisMonthCategoryTotals[exp.category] =
      (thisMonthCategoryTotals[exp.category] ?? 0) + exp.amount;
  }

  const overBudgetCategories = EXPENSE_CATEGORIES.filter((cat) => {
    const spent = thisMonthCategoryTotals[cat] ?? 0;
    return spent > budgets[cat];
  });

  // Top 6 categories this month for SVG bar chart
  const topCategories = EXPENSE_CATEGORIES.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    amount: thisMonthCategoryTotals[cat] ?? 0,
    color: CATEGORY_BAR_COLORS[cat] ?? "#64748b",
  }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const maxCategoryAmount = Math.max(...topCategories.map((c) => c.amount), 1);

  // Budget utilization for total this month
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const budgetUsedPct = totalBudget > 0 ? Math.min((thisMonthTotal / totalBudget) * 100, 100) : null;

  // Monthly trend (last 6 months)
  const monthlyTotals: Record<string, number> = {};
  for (const exp of trendExpenses) {
    const month = exp.date.slice(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] ?? 0) + exp.amount;
  }

  const trendMonths: { label: string; key: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toDateString(d).slice(0, 7);
    const label = d.toLocaleString("default", { month: "short" });
    trendMonths.push({ label, key, total: monthlyTotals[key] ?? 0 });
  }
  const maxTrendTotal = Math.max(...trendMonths.map((m) => m.total), 1);

  const recurringTotal = recurringExpenses.reduce((s, e) => s + e.amount, 0);

  // ── URL helpers ──────────────────────────────────────────────────────────────

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams({
      from: effectiveFrom,
      to: effectiveTo,
      category: categoryFilter,
      ...params,
    });
    return `?${p.toString()}`;
  }

  return (
    <div className="p-4 md:p-8">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and manage salon expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/finance/expenses/categories"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Tag className="w-4 h-4" />
            Category Analysis
          </Link>
          <Link
            href="/dashboard/finance/budget"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Manage Budgets
          </Link>
          <ExpenseFormDialog />
        </div>
      </div>

      {/* ── Over-budget alert ── */}
      {overBudgetCategories.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Over budget this month</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {overBudgetCategories
                .map((c) => {
                  const spent = thisMonthCategoryTotals[c] ?? 0;
                  const budget = budgets[c];
                  return `${CATEGORY_LABELS[c]} (${fmt(spent)} / ${fmt(budget)})`;
                })
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 · Summary Cards
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* This Month */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  This Month
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{fmt(thisMonthTotal)}</p>
                {monthChangePct !== null ? (
                  <p
                    className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                      monthChangePct > 0 ? "text-[#F41666]" : "text-emerald-500"
                    }`}
                  >
                    {monthChangePct > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {monthChangePct > 0 ? "+" : ""}
                    {monthChangePct.toFixed(1)}% vs last month
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">No data last month</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-[#F41666]/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-[#F41666]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Month */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Last Month
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{fmt(lastMonthTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lastMonthStart.slice(0, 7)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#F48E16]/10 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-5 h-5 text-[#F48E16]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Month-over-Month change */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  MoM Change
                </p>
                {monthChangePct !== null ? (
                  <>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        monthChangePct > 0 ? "text-[#F41666]" : "text-emerald-500"
                      }`}
                    >
                      {monthChangePct > 0 ? "+" : ""}
                      {monthChangePct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {monthChangePct > 0 ? "Spending up" : "Spending down"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-muted-foreground mt-1">—</p>
                    <p className="text-xs text-muted-foreground mt-1">No prior month data</p>
                  </>
                )}
              </div>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  monthChangePct !== null && monthChangePct > 0
                    ? "bg-[#F41666]/10"
                    : "bg-emerald-500/10"
                }`}
              >
                {monthChangePct !== null && monthChangePct > 0 ? (
                  <TrendingUp className="w-5 h-5 text-[#F41666]" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-emerald-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget utilization */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Budget Utilization
                </p>
                {budgetUsedPct !== null ? (
                  <>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {budgetUsedPct.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmt(thisMonthTotal)} of {fmt(totalBudget)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-muted-foreground mt-1">—</p>
                    <p className="text-xs text-muted-foreground mt-1">No budget set</p>
                  </>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
            </div>
            {budgetUsedPct !== null && (
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetUsedPct >= 100
                      ? "bg-destructive"
                      : budgetUsedPct >= 75
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 · Category Breakdown SVG Chart + Trend
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* SVG Horizontal bar chart — top categories this month */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top Categories — This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No expenses recorded this month.
              </p>
            ) : (
              <svg
                viewBox={`0 0 400 ${topCategories.length * 44 + 8}`}
                className="w-full"
                aria-label="Category spending chart"
              >
                {topCategories.map((c, i) => {
                  const barW = Math.max((c.amount / maxCategoryAmount) * 280, 4);
                  const y = i * 44 + 4;
                  return (
                    <g key={c.cat}>
                      {/* Label */}
                      <text
                        x="0"
                        y={y + 14}
                        className="fill-foreground"
                        style={{ font: "500 11px system-ui, sans-serif" }}
                        fill="currentColor"
                      >
                        {c.label.length > 18 ? c.label.slice(0, 17) + "…" : c.label}
                      </text>
                      {/* Bar track */}
                      <rect
                        x="0"
                        y={y + 20}
                        width="280"
                        height="16"
                        rx="4"
                        fill="var(--secondary)"
                      />
                      {/* Bar fill */}
                      <rect
                        x="0"
                        y={y + 20}
                        width={barW}
                        height="16"
                        rx="4"
                        fill={c.color}
                        fillOpacity="0.85"
                      />
                      {/* Amount label */}
                      <text
                        x="288"
                        y={y + 32}
                        className="fill-foreground"
                        style={{ font: "600 11px system-ui, sans-serif", fill: "currentColor" }}
                      >
                        {fmt(c.amount)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend (last 6 months) */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              6-Month Expense Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {trendMonths.map((m) => {
                const heightPct = (m.total / maxTrendTotal) * 100;
                const isCurrentMonth = m.key === toDateString(now).slice(0, 7);
                return (
                  <div key={m.key} className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {m.total > 0 ? fmt(m.total) : ""}
                    </span>
                    <div
                      className="w-full flex items-end justify-center"
                      style={{ height: 80 }}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isCurrentMonth ? "bg-primary" : "bg-primary/40"
                        }`}
                        style={{
                          height: `${heightPct}%`,
                          minHeight: m.total > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        isCurrentMonth ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 · Recurring Expenses
      ════════════════════════════════════════════════════════════════════ */}
      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Recurring Expenses
            {recurringExpenses.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {recurringExpenses.length} items ·{" "}
                <span className="text-foreground font-semibold">{fmt(recurringTotal)}/mo est.</span>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recurringExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recurring expenses set up. Mark an expense as recurring when creating it.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Description
                    </th>
                    <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Category
                    </th>
                    <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Day of Month
                    </th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recurringExpenses.map((exp) => {
                    const badgeClass =
                      CATEGORY_COLORS[exp.category] ?? "bg-secondary text-muted-foreground";
                    return (
                      <tr
                        key={exp.id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-foreground">{exp.description}</div>
                          {exp.vendor && (
                            <div className="text-xs text-muted-foreground">{exp.vendor}</div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
                          >
                            {CATEGORY_LABELS[exp.category as ExpenseCategory] ?? exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-sm">
                          {exp.recurringDay ? `Day ${exp.recurringDay}` : "—"}
                        </td>
                        <td className="py-2.5 font-semibold text-foreground text-right">
                          {fmt(exp.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td
                      colSpan={3}
                      className="pt-3 text-sm font-semibold text-foreground"
                    >
                      Monthly Total (est.)
                    </td>
                    <td className="pt-3 text-right font-bold text-foreground">
                      {fmt(recurringTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Date range presets ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {[
          {
            label: "This Month",
            from: thisMonthStart,
            to: thisMonthEnd,
          },
          {
            label: "Last Month",
            from: lastMonthStart,
            to: lastMonthEnd,
          },
          {
            label: "Last 30 Days",
            from: toDateString(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)),
            to: toDateString(now),
          },
        ].map((preset) => {
          const isActive = effectiveFrom === preset.from && effectiveTo === preset.to;
          return (
            <Link
              key={preset.label}
              href={buildUrl({ from: preset.from, to: preset.to })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
        <span className="text-xs text-muted-foreground ml-1">
          {effectiveFrom} — {effectiveTo}
        </span>
      </div>

      {/* ── Category filter tabs ── */}
      <div className="mb-4 flex items-center gap-1 bg-secondary/60 rounded-lg p-1 w-fit flex-wrap">
        {CATEGORIES_WITH_ALL.map((cat) => {
          const isActive = categoryFilter === cat;
          return (
            <Link
              key={cat}
              href={buildUrl({ category: cat })}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "ALL" ? "All" : CATEGORY_LABELS[cat as ExpenseCategory]}
            </Link>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 · Expenses Table
      ════════════════════════════════════════════════════════════════════ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            {filteredExpenses.length} Expense
            {filteredExpenses.length !== 1 ? "s" : ""}
            {categoryFilter !== "ALL" && (
              <span className="text-muted-foreground font-normal">
                · {CATEGORY_LABELS[categoryFilter as ExpenseCategory]}
              </span>
            )}
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              Total:{" "}
              <span className="text-foreground font-semibold">
                {fmt(filteredExpenses.reduce((s, e) => s + e.amount, 0))}
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="No expenses found"
              description="Add your first expense to start tracking salon costs."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Category
                    </th>
                    <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Description
                    </th>
                    <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Vendor
                    </th>
                    <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Method
                    </th>
                    <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Amount
                    </th>
                    <th className="pb-3 pl-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => {
                    const badgeClass =
                      CATEGORY_COLORS[exp.category] ?? "bg-secondary text-muted-foreground";
                    return (
                      <tr
                        key={exp.id}
                        className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap">
                          {exp.date}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${badgeClass}`}
                            >
                              {CATEGORY_LABELS[exp.category as ExpenseCategory] ?? exp.category}
                            </span>
                            {exp.subcategory && (
                              <span className="text-xs text-muted-foreground pl-0.5">
                                {exp.subcategory}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-foreground max-w-[200px]">
                          <div className="truncate">{exp.description}</div>
                          {exp.notes && (
                            <div className="text-xs text-muted-foreground truncate">
                              {exp.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground text-xs whitespace-nowrap">
                          {exp.vendor ?? "—"}
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                          <span
                            title={
                              PAYMENT_METHOD_LABELS[exp.paymentMethod as PaymentMethod] ??
                              exp.paymentMethod
                            }
                          >
                            {PAYMENT_METHOD_ICONS[exp.paymentMethod] ?? "—"}{" "}
                            {PAYMENT_METHOD_LABELS[exp.paymentMethod as PaymentMethod] ??
                              exp.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          {exp.isRecurring ? (
                            <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                              <RefreshCw className="w-2.5 h-2.5" />
                              Recurring
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              One-time
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-semibold text-foreground text-right whitespace-nowrap">
                          {fmt(exp.amount)}
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-1">
                            {exp.receipt && (
                              <a
                                href={exp.receipt}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="View receipt"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <ExpenseFormDialog
                              expense={{
                                id: exp.id,
                                category: exp.category,
                                subcategory: exp.subcategory,
                                description: exp.description,
                                amount: exp.amount,
                                date: exp.date,
                                vendor: exp.vendor,
                                paymentMethod: exp.paymentMethod,
                                isRecurring: exp.isRecurring,
                                recurringDay: exp.recurringDay,
                                notes: exp.notes,
                                receipt: exp.receipt,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={6} className="pt-3 pr-3 text-sm font-semibold text-foreground">
                      Total
                    </td>
                    <td className="pt-3 text-right font-bold text-foreground">
                      {fmt(filteredExpenses.reduce((s, e) => s + e.amount, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

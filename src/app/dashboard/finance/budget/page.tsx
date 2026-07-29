import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/app/actions/expenses-constants";
import { getBudgets } from "@/app/actions/budget";
import { BudgetSettingsForm } from "./budget-settings-form";

export const dynamic = "force-dynamic";

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default async function BudgetPage() {
  const now = new Date();
  const thisMonthStart = toDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonthEnd = toDateString(now);

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Parallel fetch: budgets + this month's expenses by category
  const [budgets, thisMonthExpenses] = await Promise.all([
    getBudgets(),
    prisma.expense.findMany({
      where: {
        salonId: salon?.id ?? "",
        date: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      select: { category: true, amount: true },
    }),
  ]);

  // Category totals this month
  const spentByCategory: Record<string, number> = {};
  for (const exp of thisMonthExpenses) {
    spentByCategory[exp.category] = (spentByCategory[exp.category] ?? 0) + exp.amount;
  }

  // Build budget rows
  const budgetRows = EXPENSE_CATEGORIES.map((cat) => {
    const budget = budgets[cat] ?? 0;
    const spent = spentByCategory[cat] ?? 0;
    const remaining = budget - spent;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    const status: "green" | "amber" | "red" =
      pct >= 100 ? "red" : pct >= 75 ? "amber" : "green";
    return { cat, label: CATEGORY_LABELS[cat], budget, spent, remaining, pct, status };
  });

  const totalBudget = budgetRows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = budgetRows.reduce((s, r) => s + r.spent, 0);
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Target className="w-7 h-7 text-primary" />
          Budget Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Set monthly spending budgets and track utilization per category.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 · Budget vs Actual Table
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          Budget vs Actual — {now.toLocaleString("default", { month: "long", year: "numeric" })}
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left">
                      Category
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Budget
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Spent
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Remaining
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      % Used
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((row) => (
                    <tr
                      key={row.cat}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-foreground">{row.label}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {row.budget > 0 ? fmt(row.budget) : <span className="italic">Not set</span>}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-foreground font-medium">
                        {fmt(row.spent)}
                      </td>
                      <td
                        className={`py-3 pr-4 text-right tabular-nums font-semibold ${
                          row.remaining < 0
                            ? "text-destructive"
                            : row.remaining === 0
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {row.budget > 0 ? fmt(row.remaining) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                            row.status === "red"
                              ? "bg-destructive/15 text-destructive"
                              : row.status === "amber"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {row.status === "red" ? (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          ) : (
                            <CheckCircle className="w-2.5 h-2.5" />
                          )}
                          {row.budget > 0 ? `${row.pct.toFixed(0)}%` : "—"}
                        </span>
                      </td>
                      <td className="py-3 min-w-[120px]">
                        {row.budget > 0 ? (
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                row.status === "red"
                                  ? "bg-destructive"
                                  : row.status === "amber"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(row.pct, 100)}%` }}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No budget</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="pt-3 pb-1 font-bold text-foreground">Total</td>
                    <td className="pt-3 pb-1 text-right font-bold text-foreground tabular-nums">
                      {fmt(totalBudget)}
                    </td>
                    <td className="pt-3 pb-1 text-right font-bold text-foreground tabular-nums">
                      {fmt(totalSpent)}
                    </td>
                    <td
                      className={`pt-3 pb-1 text-right font-bold tabular-nums ${
                        totalBudget - totalSpent < 0
                          ? "text-destructive"
                          : "text-emerald-500"
                      }`}
                    >
                      {fmt(totalBudget - totalSpent)}
                    </td>
                    <td className="pt-3 pb-1 text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          totalPct >= 100
                            ? "bg-destructive/15 text-destructive"
                            : totalPct >= 75
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {totalPct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="pt-3 pb-1">
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            totalPct >= 100
                              ? "bg-destructive"
                              : totalPct >= 75
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(totalPct, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 · Budget Settings Form (client component)
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Set Monthly Budgets
        </h2>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">
              Monthly budget per category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetSettingsForm
              budgets={budgets}
              categories={EXPENSE_CATEGORIES.map((cat) => ({
                key: cat,
                label: CATEGORY_LABELS[cat],
              }))}
              currency={currency}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

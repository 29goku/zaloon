"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Copy, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateBudgets } from "@/app/actions/budget";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/app/actions/expenses-constants";

interface BudgetManagerProps {
  budgets: Record<ExpenseCategory, number>;
  spentByCategory: Record<string, number>;
  currency: string;
  lastMonthBudgets?: Record<string, number>;
}

export function BudgetManager({
  budgets: initialBudgets,
  spentByCategory,
  currency,
  lastMonthBudgets,
}: BudgetManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [budgets, setBudgets] =
    useState<Record<ExpenseCategory, number>>(initialBudgets);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  function startEdit(cat: ExpenseCategory) {
    setEditingKey(cat);
    setEditValue(String(budgets[cat] ?? 0));
    setSavedMsg(null);
    setErrorMsg(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditValue("");
  }

  function commitEdit(cat: ExpenseCategory) {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) {
      setErrorMsg("Please enter a valid non-negative number.");
      return;
    }
    const updated = { ...budgets, [cat]: val };
    setBudgets(updated as Record<ExpenseCategory, number>);
    setEditingKey(null);
    persistBudgets(updated as Record<ExpenseCategory, number>);
  }

  function persistBudgets(data: Record<ExpenseCategory, number>) {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await updateBudgets(data as Record<string, number>);
      if (result.success) {
        setSavedMsg("Budgets saved.");
        router.refresh();
        setTimeout(() => setSavedMsg(null), 3000);
      } else {
        setErrorMsg(result.error ?? "Failed to save budgets.");
      }
    });
  }

  function copyLastMonth() {
    if (!lastMonthBudgets) return;
    const updated: Record<ExpenseCategory, number> = { ...budgets };
    for (const cat of EXPENSE_CATEGORIES) {
      if (typeof lastMonthBudgets[cat] === "number") {
        updated[cat] = lastMonthBudgets[cat];
      }
    }
    setBudgets(updated);
    persistBudgets(updated);
  }

  const rows = EXPENSE_CATEGORIES.map((cat) => {
    const budget = budgets[cat] ?? 0;
    const spent = spentByCategory[cat] ?? 0;
    const remaining = budget - spent;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    const status: "green" | "amber" | "red" =
      pct >= 100 ? "red" : pct >= 80 ? "amber" : "green";
    return { cat, label: CATEGORY_LABELS[cat], budget, spent, remaining, pct, status };
  });

  const overBudgetCount = rows.filter((r) => r.status === "red").length;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {overBudgetCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"} over budget
            </span>
          )}
          {overBudgetCount === 0 && rows.some((r) => r.budget > 0) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              All categories within budget
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastMonthBudgets && (
            <button
              type="button"
              onClick={copyLastMonth}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy last month&apos;s budgets
            </button>
          )}
          {isPending && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          {savedMsg && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{savedMsg}</span>
          )}
        </div>
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Budget cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((row) => {
          const isEditing = editingKey === row.cat;
          const barColor =
            row.status === "red"
              ? "bg-destructive"
              : row.status === "amber"
              ? "bg-amber-500"
              : "bg-emerald-500";
          const badgeClass =
            row.status === "red"
              ? "bg-destructive/15 text-destructive"
              : row.status === "amber"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

          return (
            <Card key={row.cat} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                    {row.label}
                  </span>
                  {row.budget > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}>
                      {row.budget > 0
                        ? row.status === "red"
                          ? "Over budget"
                          : row.status === "amber"
                          ? "Near limit"
                          : "On track"
                        : "—"}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Spent vs Budget display */}
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {fmt(row.spent)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {row.budget > 0 ? `/ ${fmt(row.budget)}` : "No budget set"}
                  </span>
                </div>

                {/* Progress bar */}
                {row.budget > 0 && (
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(row.pct, 100)}%` }}
                    />
                  </div>
                )}

                {row.budget > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{row.pct.toFixed(0)}% used</span>
                    <span
                      className={
                        row.remaining < 0
                          ? "text-destructive font-medium"
                          : "text-foreground"
                      }
                    >
                      {row.remaining >= 0
                        ? `${fmt(row.remaining)} remaining`
                        : `${fmt(Math.abs(row.remaining))} over`}
                    </span>
                  </div>
                )}

                {/* Inline edit */}
                {isEditing ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(row.cat);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 h-8 px-2.5 rounded-lg border border-ring bg-background text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      placeholder="Budget amount"
                    />
                    <button
                      type="button"
                      onClick={() => commitEdit(row.cat)}
                      className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="w-8 h-8 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(row.cat)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {row.budget > 0 ? "Edit budget" : "Set budget"}
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

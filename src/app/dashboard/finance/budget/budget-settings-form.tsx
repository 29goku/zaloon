"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBudgets } from "@/app/actions/budget";
import { type ExpenseCategory } from "@/app/actions/expenses-constants";

interface BudgetSettingsFormProps {
  budgets: Record<ExpenseCategory, number>;
  categories: { key: string; label: string }[];
  currency: string;
}

export function BudgetSettingsForm({
  budgets,
  categories,
  currency,
}: BudgetSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(categories.map(({ key }) => [key, String(budgets[key as ExpenseCategory] ?? 0)]))
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: string, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw }));
    setSaved(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);

    const parsed: Record<string, number> = {};
    for (const { key } of categories) {
      const val = parseFloat(values[key] ?? "0");
      if (isNaN(val) || val < 0) {
        setError(`Invalid value for ${key}. Please enter a non-negative number.`);
        return;
      }
      parsed[key] = val;
    }

    startTransition(async () => {
      const result = await saveBudgets(parsed);
      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const currencySymbol = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? "$";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label
              htmlFor={`budget-${key}`}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                {currencySymbol}
              </span>
              <input
                id={`budget-${key}`}
                type="number"
                min="0"
                step="0.01"
                value={values[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full h-10 pl-8 pr-3 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
                placeholder="0"
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {saved && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">
          Budgets saved successfully.
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : "Save Budgets"}
        </button>
        {saved && (
          <span className="text-xs text-muted-foreground">
            Changes will be reflected in the budget table above.
          </span>
        )}
      </div>
    </form>
  );
}

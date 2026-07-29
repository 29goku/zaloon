"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateRevenueGoals } from "@/app/actions/settings";

interface RevenueGoals {
  weekly: number;
  monthly: number;
  annual: number;
}

interface RevenueGoalWidgetProps {
  goals: RevenueGoals;
  monthActual: number;
  weekActual: number;
  annualActual: number;
  currency: string;
  daysInMonth: number;
  dayOfMonth: number;
}

function CircularProgress({
  pct,
  size = 120,
  stroke = 10,
  color,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-secondary"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-500"
      />
    </svg>
  );
}

export function RevenueGoalWidget({
  goals: initialGoals,
  monthActual,
  weekActual,
  annualActual,
  currency,
  daysInMonth,
  dayOfMonth,
}: RevenueGoalWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goals, setGoals] = useState<RevenueGoals>(initialGoals);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ weekly: string; monthly: string; annual: string }>({
    weekly: String(initialGoals.weekly),
    monthly: String(initialGoals.monthly),
    annual: String(initialGoals.annual),
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const monthPct =
    goals.monthly > 0
      ? Math.round((monthActual / goals.monthly) * 100)
      : 0;

  const daysRemaining = daysInMonth - dayOfMonth;
  const dailyPace = dayOfMonth > 0 ? monthActual / dayOfMonth : 0;
  const projectedMonth = dailyPace * daysInMonth;

  const goalStatus =
    goals.monthly === 0
      ? "no-goal"
      : projectedMonth >= goals.monthly * 1.05
      ? "ahead"
      : projectedMonth >= goals.monthly * 0.95
      ? "on-track"
      : "behind";

  const ringColor =
    goalStatus === "ahead"
      ? "#10b981" // emerald-500
      : goalStatus === "on-track"
      ? "#6366f1" // primary-ish
      : goalStatus === "behind"
      ? "#ef4444" // red
      : "#6b7280"; // gray

  function openEdit() {
    setDraft({
      weekly: String(goals.weekly),
      monthly: String(goals.monthly),
      annual: String(goals.annual),
    });
    setEditing(true);
    setErrorMsg(null);
  }

  function cancelEdit() {
    setEditing(false);
    setErrorMsg(null);
  }

  function saveEdit() {
    const weekly = parseFloat(draft.weekly);
    const monthly = parseFloat(draft.monthly);
    const annual = parseFloat(draft.annual);

    if (isNaN(weekly) || weekly < 0 || isNaN(monthly) || monthly < 0 || isNaN(annual) || annual < 0) {
      setErrorMsg("All values must be non-negative numbers.");
      return;
    }

    const updated = { weekly, monthly, annual };
    startTransition(async () => {
      const result = await updateRevenueGoals(updated);
      if (result.success) {
        setGoals(updated);
        setEditing(false);
        setSavedMsg("Goals saved.");
        router.refresh();
        setTimeout(() => setSavedMsg(null), 3000);
      } else {
        setErrorMsg(result.error ?? "Failed to save goals.");
      }
    });
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Revenue Goals
          <button
            type="button"
            onClick={openEdit}
            className="ml-auto w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Edit revenue goals"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Edit dialog */}
        {editing && (
          <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">Set Revenue Goals</p>
            {[
              { key: "weekly" as const, label: "Weekly Goal" },
              { key: "monthly" as const, label: "Monthly Goal" },
              { key: "annual" as const, label: "Annual Goal" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground w-32 flex-shrink-0">
                  {label}
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
            ))}
            {errorMsg && (
              <p className="text-xs text-destructive">{errorMsg}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={saveEdit}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {savedMsg && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{savedMsg}</p>
        )}

        {/* Monthly goal ring */}
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <CircularProgress pct={monthPct} size={120} stroke={11} color={ringColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground tabular-nums leading-none">
                {monthPct}%
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">of goal</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Monthly Goal
              </p>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {goals.monthly > 0 ? fmt(goals.monthly) : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Current
              </p>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {fmt(monthActual)}
              </p>
            </div>
            {goalStatus !== "no-goal" && (
              <div className="flex items-center gap-1.5">
                {goalStatus === "ahead" ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : goalStatus === "on-track" ? (
                  <Minus className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    goalStatus === "ahead"
                      ? "text-emerald-500"
                      : goalStatus === "on-track"
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {goalStatus === "ahead"
                    ? "Ahead of pace"
                    : goalStatus === "on-track"
                    ? "On track"
                    : "Behind pace"}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {daysRemaining}d remaining
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Weekly + Annual goals */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              Weekly Goal
            </p>
            {goals.weekly > 0 ? (
              <>
                <p className="text-base font-bold text-foreground tabular-nums">
                  {fmt(goals.weekly)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Actual: {fmt(weekActual)}{" "}
                  <span
                    className={`font-semibold ${
                      weekActual >= goals.weekly
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }`}
                  >
                    ({Math.round((weekActual / goals.weekly) * 100)}%)
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not set</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              Annual Goal
            </p>
            {goals.annual > 0 ? (
              <>
                <p className="text-base font-bold text-foreground tabular-nums">
                  {fmt(goals.annual)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Actual: {fmt(annualActual)}{" "}
                  <span
                    className={`font-semibold ${
                      annualActual >= goals.annual
                        ? "text-emerald-500"
                        : "text-primary"
                    }`}
                  >
                    ({Math.round((annualActual / goals.annual) * 100)}%)
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not set</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

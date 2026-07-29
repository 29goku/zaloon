"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { saveRevenueGoals } from "@/app/actions/settings";

interface RevenueGoals {
  weekly: number;
  monthly: number;
  annual: number;
}

interface GoalsFormProps {
  initialGoals: RevenueGoals;
  currency: string;
}

function ProgressBar({
  current,
  target,
  fmt,
}: {
  current: number;
  target: number;
  fmt: (n: number) => string;
}) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isOver = target > 0 && current >= target;
  const color =
    isOver
      ? "bg-emerald-500"
      : pct >= 75
      ? "bg-primary"
      : pct >= 40
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-semibold tabular-nums">{fmt(current)}</span>
        <span
          className={`font-bold tabular-nums ${
            isOver ? "text-emerald-500" : "text-primary"
          }`}
        >
          {target > 0 ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: target > 0 ? `${pct}%` : "0%" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>{target > 0 ? fmt(target) : "No target set"}</span>
      </div>
    </div>
  );
}

export function RevenueGoalsForm({ initialGoals, currency }: GoalsFormProps) {
  const [goals, setGoals] = useState<RevenueGoals>(initialGoals);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Auto-calculate weekly from monthly
  const weeklyCalc = goals.monthly > 0 ? Math.round(goals.monthly / 4.33) : 0;

  function handleMonthlyChange(val: number) {
    setGoals((prev) => ({
      ...prev,
      monthly: val,
      weekly: Math.round(val / 4.33),
      annual: prev.annual,
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveRevenueGoals({
        weekly: weeklyCalc,
        monthly: goals.monthly,
        annual: goals.annual,
      });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Set Revenue Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Monthly target */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Monthly Revenue Target
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              step={100}
              value={goals.monthly || ""}
              onChange={(e) => handleMonthlyChange(Number(e.target.value))}
              placeholder="e.g. 10000"
              className="flex-1 h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <span className="text-sm text-muted-foreground font-medium">{currency}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100000}
            step={500}
            value={goals.monthly}
            onChange={(e) => handleMonthlyChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Weekly (auto-calculated) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Weekly Target</p>
            <p className="text-xs text-muted-foreground">Auto-calculated: monthly ÷ 4.33</p>
          </div>
          <p className="text-lg font-bold text-primary tabular-nums">
            {fmt(weeklyCalc)}
          </p>
        </div>

        {/* Annual target */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Annual Revenue Target
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              step={1000}
              value={goals.annual || ""}
              onChange={(e) =>
                setGoals((prev) => ({ ...prev, annual: Number(e.target.value) }))
              }
              placeholder="e.g. 120000"
              className="flex-1 h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <span className="text-sm text-muted-foreground font-medium">{currency}</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : saved ? "Saved!" : "Save Goals"}
        </button>
      </CardContent>
    </Card>
  );
}

// ── Progress section shown on goals page ──────────────────────────────────────

interface ProgressSectionProps {
  weekly: { actual: number; target: number };
  monthly: { actual: number; target: number };
  annual: { actual: number; target: number };
  currency: string;
}

export function GoalsProgressSection({
  weekly,
  monthly,
  annual,
  currency,
}: ProgressSectionProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const sections = [
    { label: "This Week", ...weekly },
    { label: "This Month", ...monthly },
    { label: "This Year", ...annual },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground">
          Current Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((s) => (
          <div key={s.label} className="space-y-1">
            <p className="text-sm font-medium text-foreground">{s.label}</p>
            <ProgressBar current={s.actual} target={s.target} fmt={fmt} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

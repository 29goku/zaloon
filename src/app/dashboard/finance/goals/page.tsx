import { prisma } from "@/lib/prisma";
import { Target, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getRevenueGoals, getStaffGoals } from "@/app/actions/settings";
import { RevenueGoalsForm, GoalsProgressSection } from "./goals-client";

export const dynamic = "force-dynamic";

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function GoalsPage() {
  const now = new Date();

  const salon = await prisma.salon.findFirst({
    select: { id: true, currency: true },
  });
  const currency = salon?.currency ?? "USD";
  const salonId = salon?.id ?? "";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  // ── Date ranges ────────────────────────────────────────────────────────────

  // Start of week (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // ── Revenue actuals ────────────────────────────────────────────────────────

  const [weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { salonId, status: "PAID", createdAt: { gte: weekStart } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { salonId, status: "PAID", createdAt: { gte: monthStart } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { salonId, status: "PAID", createdAt: { gte: yearStart } },
      _sum: { total: true },
    }),
  ]);

  const weekActual = weekAgg._sum.total ?? 0;
  const monthActual = monthAgg._sum.total ?? 0;
  const yearActual = yearAgg._sum.total ?? 0;

  // ── Goals ──────────────────────────────────────────────────────────────────

  const [revenueGoals, staffGoals] = await Promise.all([
    getRevenueGoals(),
    getStaffGoals(),
  ]);

  // ── Staff data for leaderboard ─────────────────────────────────────────────

  const staffAll = await prisma.staff.findMany({
    where: { salonId },
    select: { id: true, name: true },
  });

  // Revenue per staff this month
  const staffMonthRevRaw = await prisma.invoice.findMany({
    where: {
      salonId,
      status: "PAID",
      createdAt: { gte: monthStart },
      Appointment: { isNot: null },
    },
    select: {
      total: true,
      Appointment: { select: { staffId: true } },
    },
  });

  const staffRevMap: Record<string, number> = {};
  for (const inv of staffMonthRevRaw) {
    const sid = inv.Appointment?.staffId;
    if (sid) {
      staffRevMap[sid] = (staffRevMap[sid] ?? 0) + inv.total;
    }
  }

  // Build leaderboard
  const leaderboard = staffAll
    .map((s) => {
      const actual = staffRevMap[s.id] ?? 0;
      const target = staffGoals[s.id] ?? 0;
      const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
      return { id: s.id, name: s.name, actual, target, pct };
    })
    .sort((a, b) => {
      // Sort by closest to goal (highest pct first, but don't overflow beyond 100)
      if (b.target === 0 && a.target === 0) return b.actual - a.actual;
      if (b.target === 0) return -1;
      if (a.target === 0) return 1;
      return b.pct - a.pct;
    });

  const staffGoalSet = leaderboard.filter((s) => s.target > 0).length;

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Target className="w-7 h-7 text-primary" />
          Goals Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Track revenue targets and staff performance goals
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Goals Form (client component) */}
        <RevenueGoalsForm initialGoals={revenueGoals} currency={currency} />

        {/* Current Progress (client component) */}
        <GoalsProgressSection
          weekly={{ actual: weekActual, target: revenueGoals.weekly }}
          monthly={{ actual: monthActual, target: revenueGoals.monthly }}
          annual={{ actual: yearActual, target: revenueGoals.annual }}
          currency={currency}
        />
      </div>

      {/* Staff Goals Leaderboard */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Staff Leaderboard
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {staffGoalSet}/{staffAll.length} staff have goals set
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No staff found.
            </p>
          ) : (
            <div className="space-y-4">
              {staffGoalSet === 0 && (
                <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg px-4 py-2.5 mb-4">
                  No staff goals are set. Configure per-staff monthly targets under{" "}
                  <Link
                    href="/dashboard/staff/performance"
                    className="text-primary underline underline-offset-2"
                  >
                    Staff Performance
                  </Link>
                  .
                </div>
              )}
              {leaderboard.map((s, rank) => (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        rank === 0
                          ? "bg-amber-500/20 text-amber-500"
                          : rank === 1
                          ? "bg-secondary text-muted-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {rank + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {s.name}
                        </p>
                        <p className="text-sm font-semibold text-foreground tabular-nums ml-3 flex-shrink-0">
                          {fmt(s.actual)}
                          {s.target > 0 && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {" "}/ {fmt(s.target)}
                            </span>
                          )}
                        </p>
                      </div>
                      {s.target > 0 ? (
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.pct >= 100
                                ? "bg-emerald-500"
                                : s.pct >= 75
                                ? "bg-primary"
                                : s.pct >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                      ) : (
                        <div className="h-2 w-full rounded-full bg-secondary/50">
                          <div
                            className="h-full rounded-full bg-muted-foreground/30"
                            style={{ width: "100%" }}
                          />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold w-10 text-right flex-shrink-0 tabular-nums ${
                        s.target === 0
                          ? "text-muted-foreground"
                          : s.pct >= 100
                          ? "text-emerald-500"
                          : "text-primary"
                      }`}
                    >
                      {s.target > 0 ? `${s.pct}%` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/finance/forecast"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <TrendingUp className="w-4 h-4 text-amber-500" />
          View Forecast
        </Link>
        <Link
          href="/dashboard/finance"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <TrendingUp className="w-4 h-4 text-primary" />
          Financial Overview
        </Link>
      </div>
    </div>
  );
}

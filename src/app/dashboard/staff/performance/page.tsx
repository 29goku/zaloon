import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart2,
  Users,
  Star,
  Crown,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceDateControls } from "./performance-date-controls";
import { LeaderboardClient, type StaffStat } from "./leaderboard-client";
import { RevenueChart, type RevenueChartData } from "./revenue-chart";
import { getStaffGoals } from "@/app/actions/settings";

export const dynamic = "force-dynamic";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay());
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function presetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "this-week":
      return { from: toDateString(startOfWeek(today)), to: toDateString(today) };
    case "last-3-months": {
      const start = addMonths(today, -3);
      return { from: toDateString(start), to: toDateString(today) };
    }
    case "this-month":
    default:
      return { from: toDateString(startOfMonth(today)), to: toDateString(today) };
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const PRESETS = [
  { id: "this-week", label: "This Week" },
  { id: "this-month", label: "This Month" },
  { id: "last-3-months", label: "Last 3 Months" },
] as const;

// ── page ──────────────────────────────────────────────────────────────────────

interface PerformancePageProps {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}

export default async function StaffPerformancePage({ searchParams }: PerformancePageProps) {
  const sp = await searchParams;

  const activePreset =
    typeof sp.preset === "string" && PRESETS.some((p) => p.id === sp.preset)
      ? sp.preset
      : null;

  let from: string;
  let to: string;

  if (activePreset) {
    const range = presetRange(activePreset);
    from = range.from;
    to = range.to;
  } else if (typeof sp.from === "string" && typeof sp.to === "string") {
    from = sp.from <= sp.to ? sp.from : sp.to;
    to = sp.from <= sp.to ? sp.to : sp.from;
  } else {
    const defaults = presetRange("this-month");
    from = defaults.from;
    to = defaults.to;
  }

  const today = new Date();
  const thisMonthStart = toDateString(startOfMonth(today));
  const thisMonthEnd = toDateString(today);
  const lastMonthStart = toDateString(addMonths(today, -1));
  const lastMonthEnd = toDateString(new Date(today.getFullYear(), today.getMonth(), 0));

  // Build date ranges for last 3 months (for chart)
  const chartMonths = Array.from({ length: 3 }, (_, i) => {
    const d = addMonths(today, -(2 - i));
    return {
      label: d.toLocaleString("en", { month: "short" }),
      start: toDateString(d),
      end: toDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    };
  });

  // ── Parallel DB fetch ─────────────────────────────────────────────────────

  const salon = await prisma.salon.findFirst({ select: { id: true, currency: true } });
  const currency = salon?.currency ?? "USD";
  const salonFilter = salon ? { salonId: salon.id } : {};

  const [staffList, currentMonthAppts, lastMonthAppts, reviews, initialGoals] =
    await Promise.all([
      prisma.staff.findMany({
        where: salonFilter,
        orderBy: { name: "asc" },
        include: { Shift: true, StaffService: true },
      }),
      prisma.appointment.findMany({
        where: {
          ...salonFilter,
          status: "COMPLETED",
          date: { gte: thisMonthStart, lte: thisMonthEnd },
        },
        include: { AppointmentService: { include: { Service: true } } },
      }),
      prisma.appointment.findMany({
        where: {
          ...salonFilter,
          status: "COMPLETED",
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        include: { AppointmentService: { include: { Service: true } } },
      }),
      prisma.review.findMany({
        where: { ...salonFilter, staffId: { not: null } },
      }),
      getStaffGoals(),
    ]);

  // Fetch date-range appointments for the selected period (for existing table)
  const rangeAppts = await prisma.appointment.findMany({
    where: {
      ...salonFilter,
      date: { gte: from, lte: to },
    },
    include: { AppointmentService: { include: { Service: true } } },
  });

  // Fetch chart month data (all 3 months)
  const chartApptsByMonth = await Promise.all(
    chartMonths.map((m) =>
      prisma.appointment.findMany({
        where: {
          ...salonFilter,
          status: "COMPLETED",
          date: { gte: m.start, lte: m.end },
        },
        select: { staffId: true, totalAmount: true },
      })
    )
  );

  // ── Per-staff stats for leaderboard ──────────────────────────────────────

  const staffStats: StaffStat[] = staffList.map((member) => {
    // Current month
    const curAppts = currentMonthAppts.filter((a) => a.staffId === member.id);
    const curRevenue = curAppts.reduce((s, a) => s + a.totalAmount, 0);
    const curAvgTicket = curAppts.length > 0 ? curRevenue / curAppts.length : 0;
    const curCommission = curRevenue * (member.commissionPct / 100);

    // Last month
    const lastAppts = lastMonthAppts.filter((a) => a.staffId === member.id);
    const lastRevenue = lastAppts.reduce((s, a) => s + a.totalAmount, 0);

    // Attendance: shifts scheduled per week × ~4 weeks vs actual appointments
    // Heuristic: shifts define working days; attendance = (appts w/ status COMPLETED or NO_SHOW) / expected
    const shiftDays = member.Shift.length; // days per week
    const expectedAppts = shiftDays * 4; // rough monthly expected
    const actualWorked = curAppts.length;
    const attendanceRate =
      expectedAppts > 0 ? Math.min(100, (actualWorked / Math.max(actualWorked, expectedAppts)) * 100) : 100;

    // Reviews
    const memberReviews = reviews.filter((r) => r.staffId === member.id);
    const avgRating =
      memberReviews.length > 0
        ? memberReviews.reduce((s, r) => s + r.rating, 0) / memberReviews.length
        : 0;

    return {
      id: member.id,
      name: member.name,
      role: `${member.commissionPct}% commission`,
      commissionPct: member.commissionPct,
      currentMonth: {
        appointments: curAppts.length,
        revenue: curRevenue,
        avgTicket: curAvgTicket,
        commission: curCommission,
      },
      lastMonth: {
        revenue: lastRevenue,
      },
      attendanceRate,
      avgRating,
      reviewCount: memberReviews.length,
    };
  });

  // ── Summary header stats ──────────────────────────────────────────────────

  const totalActiveStaff = staffList.length;

  const allRatings = reviews;
  const avgRatingOverall =
    allRatings.length > 0
      ? allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length
      : 0;

  const topPerformer = [...staffStats].sort(
    (a, b) => b.currentMonth.revenue - a.currentMonth.revenue
  )[0] ?? null;

  const totalAppts = currentMonthAppts.length;

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData: RevenueChartData[] = staffList.map((member) => ({
    staffId: member.id,
    name: member.name,
    months: chartMonths.map((cm, mi) => {
      const monthAppts = chartApptsByMonth[mi];
      const revenue = monthAppts
        .filter((a) => a.staffId === member.id)
        .reduce((s, a) => s + a.totalAmount, 0);
      return { label: cm.label, revenue };
    }),
  }));

  // ── Range-based data for existing legacy table ────────────────────────────

  type ServiceCount = { name: string; count: number };

  const rangeRows = staffList.map((member) => {
    const all = rangeAppts.filter((a) => a.staffId === member.id);
    const completed = all.filter((a) => a.status === "COMPLETED");
    const noShows = all.filter((a) => a.status === "NO_SHOW").length;
    const cancelled = all.filter(
      (a) => a.status === "CANCELLED" || a.status === "CANCELED"
    ).length;
    const totalScheduled = all.length;
    const revenue = completed.reduce((sum, a) => sum + a.totalAmount, 0);
    const avgTicket = completed.length > 0 ? revenue / completed.length : 0;
    const denominator = completed.length + noShows + cancelled;
    const utilizationRate = denominator > 0 ? (completed.length / denominator) * 100 : 0;
    const noShowRate = totalScheduled > 0 ? (noShows / totalScheduled) * 100 : 0;
    const commissionEarned = revenue * (member.commissionPct / 100);
    const svcMap: Record<string, ServiceCount> = {};
    for (const appt of completed) {
      for (const as of appt.AppointmentService) {
        const n = as.Service.name;
        svcMap[n] = svcMap[n] ?? { name: n, count: 0 };
        svcMap[n].count += 1;
      }
    }
    const topServices = Object.values(svcMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return {
      id: member.id,
      name: member.name,
      commissionPct: member.commissionPct,
      completed: completed.length,
      noShows,
      cancelled,
      totalScheduled,
      revenue,
      avgTicket,
      utilizationRate,
      noShowRate,
      commissionEarned,
      topServices,
    };
  });

  const sortedRangeRows = [...rangeRows].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = rangeRows.reduce((s, r) => s + r.revenue, 0);
  const totalCompleted = rangeRows.reduce((s, r) => s + r.completed, 0);
  const totalCommission = rangeRows.reduce((s, r) => s + r.commissionEarned, 0);
  const avgUtilization =
    rangeRows.length > 0
      ? rangeRows.reduce((s, r) => s + r.utilizationRate, 0) / rangeRows.length
      : 0;
  const rangeTopPerformer = sortedRangeRows[0] ?? null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/staff"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Staff
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Performance</h1>
            <p className="text-muted-foreground mt-1">
              Staff analytics &middot; {from} &mdash; {to}
            </p>
          </div>
        </div>
      </div>

      {/* ── Header KPI cards (4) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total active staff */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Active Staff</p>
              <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {totalActiveStaff}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total active members</p>
          </CardContent>
        </Card>

        {/* Average rating */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Avg Rating</p>
              <div className="bg-amber-500/10 p-2 rounded-lg flex-shrink-0">
                <Star className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {avgRatingOverall > 0 ? avgRatingOverall.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {allRatings.length} review{allRatings.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Top performer */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Top Performer</p>
              <div className="bg-amber-500/10 p-2 rounded-lg flex-shrink-0">
                <Crown className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">
              {topPerformer?.name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {topPerformer ? fmt(topPerformer.currentMonth.revenue) + " this month" : "No data"}
            </p>
          </CardContent>
        </Card>

        {/* Total appointments this month */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">Appts This Month</p>
              <div className="bg-[#F41666]/10 p-2 rounded-lg flex-shrink-0">
                <Calendar className="w-4 h-4 text-[#F41666]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{totalAppts}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Leaderboard + Cards (client, sortable) ───────────────────────── */}
      <LeaderboardClient
        staff={staffStats}
        initialGoals={initialGoals}
        currency={currency}
      />

      {/* ── Revenue Comparison Chart ─────────────────────────────────────── */}
      {chartData.some((s) => s.months.some((m) => m.revenue > 0)) && (
        <Card className="bg-card border-border mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Revenue Comparison — Last 3 Months
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Side-by-side revenue per staff member across {chartMonths.map((m) => m.label).join(", ")}
            </p>
          </CardHeader>
          <CardContent>
            <RevenueChart
              data={chartData}
              months={chartMonths.map((m) => m.label)}
              currency={currency}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Date range controls + legacy detailed table ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1">
          {PRESETS.map((preset) => {
            const isActive =
              activePreset === preset.id ||
              (!activePreset && !sp.from && preset.id === "this-month");
            return (
              <Link
                key={preset.id}
                href={`?preset=${preset.id}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
          <Link
            href={`?from=${from}&to=${to}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !activePreset && sp.from
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom
          </Link>
        </div>
        <Suspense fallback={null}>
          <PerformanceDateControls from={from} to={to} />
        </Suspense>
      </div>

      {/* Period summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Revenue (Period)</p>
            <p className="text-xl font-bold text-primary tabular-nums">{fmt(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Completed (Period)</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{totalCompleted}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Utilization</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{avgUtilization.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Commission (Period)</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{fmt(totalCommission)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top performer highlight for the selected period */}
      {rangeTopPerformer && rangeTopPerformer.completed > 0 && (
        <Card className="bg-card border-border mb-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Top Performer &mdash; Selected Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary text-lg font-bold flex-shrink-0">
                  {getInitials(rangeTopPerformer.name)}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{rangeTopPerformer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {rangeTopPerformer.completed} completed &middot; {rangeTopPerformer.commissionPct}% commission
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 sm:ml-auto">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary tabular-nums">{fmt(rangeTopPerformer.revenue)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(rangeTopPerformer.avgTicket)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avg Ticket</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500 tabular-nums">{rangeTopPerformer.utilizationRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Utilization</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(rangeTopPerformer.commissionEarned)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Commission</p>
                </div>
              </div>
            </div>
            {rangeTopPerformer.topServices.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {rangeTopPerformer.topServices.map((svc) => (
                  <span
                    key={svc.name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {svc.name}
                    <span className="text-primary/70">×{svc.count}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed staff table for custom period */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Detailed Stats</h2>
        <span className="text-sm text-muted-foreground">
          {from} &mdash; {to}
        </span>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto mb-8">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Staff Member</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Completed</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenue</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Avg Ticket</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Utilization</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">No-Show Rate</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Commission</th>
            </tr>
          </thead>
          <tbody>
            {sortedRangeRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-muted-foreground">
                  No staff found.
                </td>
              </tr>
            ) : (
              sortedRangeRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                        {getInitials(row.name)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.commissionPct}% commission &middot; {row.totalScheduled} scheduled
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="text-foreground font-medium">{row.completed}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                    {fmt(row.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {row.completed > 0 ? fmt(row.avgTicket) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`tabular-nums font-medium text-sm ${
                          row.utilizationRate >= 75
                            ? "text-emerald-500"
                            : row.utilizationRate >= 50
                            ? "text-[#F48E16]"
                            : "text-[#F41666]"
                        }`}
                      >
                        {row.totalScheduled > 0 ? `${row.utilizationRate.toFixed(0)}%` : "—"}
                      </span>
                      {row.totalScheduled > 0 && (
                        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              row.utilizationRate >= 75
                                ? "bg-emerald-500"
                                : row.utilizationRate >= 50
                                ? "bg-[#F48E16]"
                                : "bg-[#F41666]"
                            }`}
                            style={{ width: `${row.utilizationRate}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.totalScheduled > 0 ? (
                      <span
                        className={`tabular-nums text-sm ${
                          row.noShowRate === 0
                            ? "text-muted-foreground"
                            : row.noShowRate > 20
                            ? "text-[#F41666] font-medium"
                            : "text-foreground"
                        }`}
                      >
                        {row.noShowRate.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground font-semibold">
                    {fmt(row.commissionEarned)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {sortedRangeRows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/40 border-t border-border">
                <td className="px-4 py-3 font-bold text-foreground">Total</td>
                <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">{totalCompleted}</td>
                <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">{fmt(totalRevenue)}</td>
                <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                  {totalCompleted > 0 ? fmt(totalRevenue / totalCompleted) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">{avgUtilization.toFixed(0)}%</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">{fmt(totalCommission)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Service breakdown per staff */}
      {sortedRangeRows.some((r) => r.topServices.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Service Breakdown</h2>
            <span className="text-sm text-muted-foreground">Most-performed services per staff member</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedRangeRows
              .filter((r) => r.topServices.length > 0)
              .map((row) => {
                const maxCount = row.topServices[0]?.count ?? 1;
                return (
                  <Card key={row.id} className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                          {getInitials(row.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.completed} completed &middot; {fmt(row.revenue)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2.5">
                        {row.topServices.map((svc) => {
                          const pct = maxCount > 0 ? (svc.count / maxCount) * 100 : 0;
                          return (
                            <div key={svc.name}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-foreground font-medium truncate mr-2">{svc.name}</span>
                                <span className="text-muted-foreground flex-shrink-0">{svc.count}×</span>
                              </div>
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

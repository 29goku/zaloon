"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  Users,
  Scissors,
  TrendingUp,
  Clock,
  CalendarPlus,
  UserPlus,
  CreditCard,
  CheckCircle2,
  BarChart2,
  Sparkles,
  Target,
  Activity,
} from "lucide-react";
import { WeeklyRevenueBar } from "@/components/dashboard/weekly-revenue-bar";
import { AppointmentFunnel } from "@/components/dashboard/appointment-funnel";
import { TopClientsWidget } from "@/components/dashboard/top-clients-widget";
import { QuickStatsWidget } from "@/components/dashboard/quick-stats-widget";
import { CustomizeDashboardButton } from "@/components/dashboard/customize-dashboard-button";
import { BirthdaysWidget, type BirthdayClient } from "@/components/dashboard/birthdays-widget";
import { TodaySummaryWidget } from "@/components/dashboard/today-summary-widget";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import type { ActivityItem as LibActivityItem } from "@/lib/activity-feed-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Appt = {
  id: string;
  date?: string;
  startTime: string;
  status: string;
  totalAmount: number;
  client: { name: string } | null;
  staff: { name: string; id: string };
  services: { service: { name: string } }[];
};

type StaffDay = {
  id: string;
  name: string;
  appointmentsToday: number;
  shift: string | null;
};

type SparkPoint = { date: string; amount: number };

type WeeklyDay = { day: string; revenue: number };
type ApptFunnel = {
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
};
type TopClient = { name: string; visits: number; spent: number };

type ActivityItem =
  | { type: "new_client"; id: string; name: string; timestamp: string }
  | {
      type: "completed_appt";
      id: string;
      clientName: string;
      staffName: string;
      services: string[];
      timestamp: string;
      amount: number;
    };

type Props = {
  // Existing
  salonName: string;
  currency: string;
  todayAppts: number;
  totalClients: number;
  totalStaff: number;
  revenue: number;
  todayApptsList: Appt[];
  // Extended
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  newClientsThisWeek: number;
  todayScheduledCount: number;
  completionRate: number;
  upcomingAppts: Appt[];
  staffUtilization: {
    working: number;
    total: number;
    staff: StaffDay[];
  };
  revenueSparkline: SparkPoint[];
  // Analytics widgets
  weeklyRevenueData: WeeklyDay[];
  apptFunnel: ApptFunnel;
  topClients: TopClient[];
  // New widgets
  clientsServedToday: number;
  nextHourAppts: Appt[];
  monthlyTarget: number;
  activityFeed: ActivityItem[];
  top3Staff: { id: string; name: string }[];
  serverNow: string;
  // Birthday clients this month
  birthdayClients?: BirthdayClient[];
  // Quick stats extras
  servicesOffered?: number;
  avgRating?: number;
  activeMemberships?: number;
  // Activity feed from lib
  recentActivity?: LibActivityItem[];
  // Budget alert
  overBudgetCount?: number;
};

// ─── Revenue Sparkline ────────────────────────────────────────────────────────

function RevenueSparkline({ data }: { data: SparkPoint[] }) {
  const W = 60;
  const H = 20;
  if (data.length < 2) return null;
  const amounts = data.map((d) => d.amount);
  const max = Math.max(...amounts, 1);
  const min = Math.min(...amounts, 0);
  const range = max - min || 1;

  const pts = amounts
    .map((v, i) => {
      const x = (i / (amounts.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}

// ─── Status helpers ────────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; pill: string; border: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    pill: "bg-[#F48E16]/15 text-[#F48E16]",
    border: "border-l-[#F48E16]",
  },
  COMPLETED: {
    label: "Completed",
    pill: "bg-primary/15 text-primary",
    border: "border-l-primary",
  },
  CANCELLED: {
    label: "Cancelled",
    pill: "bg-[#F41666]/15 text-[#F41666]",
    border: "border-l-[#F41666]",
  },
  NO_SHOW: {
    label: "No Show",
    pill: "bg-muted text-muted-foreground",
    border: "border-l-border",
  },
};

// ─── Staff colour palette (consistent per staff id) ───────────────────────────

const STAFF_COLORS = [
  { bg: "bg-violet-500/20", text: "text-violet-600", ring: "ring-violet-400" },
  { bg: "bg-sky-500/20", text: "text-sky-600", ring: "ring-sky-400" },
  { bg: "bg-emerald-500/20", text: "text-emerald-600", ring: "ring-emerald-400" },
  { bg: "bg-rose-500/20", text: "text-rose-600", ring: "ring-rose-400" },
  { bg: "bg-amber-500/20", text: "text-amber-600", ring: "ring-amber-400" },
  { bg: "bg-cyan-500/20", text: "text-cyan-600", ring: "ring-cyan-400" },
  { bg: "bg-fuchsia-500/20", text: "text-fuchsia-600", ring: "ring-fuchsia-400" },
  { bg: "bg-teal-500/20", text: "text-teal-600", ring: "ring-teal-400" },
];

function staffColor(staffId: string) {
  // Simple hash of the id string → deterministic palette index
  let hash = 0;
  for (let i = 0; i < staffId.length; i++) {
    hash = (hash * 31 + staffId.charCodeAt(i)) & 0xffff;
  }
  return STAFF_COLORS[hash % STAFF_COLORS.length];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  staffId,
  size = "md",
}: {
  name: string;
  staffId?: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const color = staffId
    ? staffColor(staffId)
    : { bg: "bg-primary/20", text: "text-primary", ring: "" };

  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";

  return (
    <div
      className={`${sz} rounded-full ${color.bg} flex items-center justify-center ${color.text} font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

// ─── Revenue Progress Bar ─────────────────────────────────────────────────────

function RevenueProgressBar({
  current,
  target,
  fmt,
}: {
  current: number;
  target: number;
  fmt: (n: number) => string;
}) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const isOver = current >= target;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">{fmt(current)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            of {fmt(target)} target
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-2xl font-bold tabular-nums ${
              isOver ? "text-emerald-500" : "text-primary"
            }`}
          >
            {pct}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">achieved</p>
        </div>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver
              ? "bg-emerald-500"
              : pct >= 75
              ? "bg-primary"
              : pct >= 40
              ? "bg-[#F48E16]"
              : "bg-[#F41666]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isOver && (
        <p className="text-xs text-muted-foreground">
          {fmt(target - current)} remaining to hit target
        </p>
      )}
      {isOver && (
        <p className="text-xs text-emerald-600 font-medium">
          Target exceeded by {fmt(current - target)}
        </p>
      )}
    </div>
  );
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardHome({
  salonName,
  currency,
  todayAppts,
  totalClients,
  totalStaff,
  revenue,
  todayApptsList,
  revenueToday,
  revenueThisWeek,
  revenueThisMonth,
  newClientsThisWeek,
  todayScheduledCount,
  completionRate,
  upcomingAppts,
  staffUtilization,
  revenueSparkline,
  weeklyRevenueData,
  apptFunnel,
  topClients,
  clientsServedToday,
  nextHourAppts,
  monthlyTarget,
  activityFeed,
  top3Staff,
  serverNow,
  birthdayClients = [],
  servicesOffered = 0,
  avgRating = 0,
  activeMemberships = 0,
  recentActivity = [],
  overBudgetCount = 0,
}: Props) {
  const { visible, toggleWidget, resetLayout } = useDashboardLayout();
  const now = new Date(serverNow);
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const formattedDate = now.toLocaleDateString("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Stats cards ────────────────────────────────────────────────────────────

  const stats = [
    {
      title: "Today's Bookings",
      value: todayAppts,
      icon: CalendarDays,
      color: "text-[#F48E16]",
      bg: "bg-[#F48E16]/10",
    },
    {
      title: "Total Clients",
      value: totalClients,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Active Staff",
      value: totalStaff,
      icon: Scissors,
      color: "text-[#F41666]",
      bg: "bg-[#F41666]/10",
    },
    {
      title: "Recent Revenue",
      value: fmt(revenue),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "This Week Revenue",
      value: fmt(revenueThisWeek),
      icon: TrendingUp,
      color: "text-[#F48E16]",
      bg: "bg-[#F48E16]/10",
    },
    {
      title: "New Clients (7d)",
      value: newClientsThisWeek,
      icon: UserPlus,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      icon: CheckCircle2,
      color: "text-[#F41666]",
      bg: "bg-[#F41666]/10",
    },
    {
      title: "Scheduled Today",
      value: todayScheduledCount,
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  const revenueSummary = [
    { label: "Today", amount: revenueToday },
    { label: "This Week", amount: revenueThisWeek },
    { label: "This Month", amount: revenueThisMonth },
  ];

  // ── Group today's appointments by time slot ────────────────────────────────

  type TimeGroup = { time: string; appts: Appt[] };
  const scheduleGroups: TimeGroup[] = [];
  for (const appt of todayApptsList) {
    const existing = scheduleGroups.find((g) => g.time === appt.startTime);
    if (existing) {
      existing.appts.push(appt);
    } else {
      scheduleGroups.push({ time: appt.startTime, appts: [appt] });
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8">

      {/* ── Today at a Glance Header ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                {greeting}, {salonName}!
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">{formattedDate}</p>
          </div>

          {/* Customize button + Quick glance stats */}
          <div className="flex flex-col items-end gap-3">
            <CustomizeDashboardButton
              visible={visible}
              toggleWidget={toggleWidget}
              resetLayout={resetLayout}
            />
            <div className="flex gap-4 sm:gap-6 flex-wrap justify-start sm:justify-end">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {todayAppts}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  appointments today
                </p>
              </div>
              <div className="w-px bg-border hidden sm:block" />
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {fmt(revenueToday)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  revenue today
                </p>
              </div>
              <div className="w-px bg-border hidden sm:block" />
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {clientsServedToday}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  clients served
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Budget Alert Banner ── */}
      {overBudgetCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm">
          <span className="text-destructive">⚠</span>
          <span className="text-destructive font-semibold">
            {overBudgetCount}{" "}
            {overBudgetCount === 1 ? "expense category is" : "expense categories are"} over budget this month.
          </span>
          <Link
            href="/dashboard/finance?tab=budgets"
            className="ml-auto text-xs font-semibold text-destructive underline underline-offset-2 flex-shrink-0"
          >
            Review Budgets →
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      {visible.kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.title} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${s.bg} p-2.5 rounded-xl`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Birthdays Widget ───────────────────────────────────────────────── */}
      {birthdayClients.length > 0 && (
        <BirthdaysWidget clients={birthdayClients} />
      )}

      {/* Revenue Overview + Sparkline */}
      {visible.revenue && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex gap-8 flex-1">
                {revenueSummary.map((r) => (
                  <div key={r.label}>
                    <p className="text-xs text-muted-foreground mb-1">{r.label}</p>
                    <p className="text-xl font-bold text-foreground">{fmt(r.amount)}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs text-muted-foreground">Last 7 days</p>
                <RevenueSparkline data={revenueSparkline} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/appointments"
            className={buttonVariants({ variant: "default", size: "sm" }) + " gap-2"}
          >
            <CalendarPlus className="w-4 h-4" />
            New Appointment
          </Link>
          <Link
            href="/dashboard/clients"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-2"}
          >
            <UserPlus className="w-4 h-4" />
            Add Client
          </Link>
          <Link
            href="/dashboard/quick-pay"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-2"}
          >
            <CreditCard className="w-4 h-4" />
            Quick Pay
          </Link>
        </div>
      </div>

      {/* ── New Widgets Row: Next Hour + Revenue vs Target ─────────────────── */}
      {(visible.nextHour || visible.revenue) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming in Next Hour */}
          {visible.nextHour && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#F48E16]" />
                  Upcoming in Next Hour
                  {nextHourAppts.length > 0 && (
                    <Badge className="ml-auto bg-[#F48E16]/15 text-[#F48E16] border-0 font-normal">
                      {nextHourAppts.length} coming up
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextHourAppts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-medium text-foreground">
                      All clear for now
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No appointments in the next 60 minutes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nextHourAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[#F48E16]/5 border border-[#F48E16]/20 hover:bg-[#F48E16]/10 transition-colors"
                      >
                        <div className="min-w-[52px] text-center flex-shrink-0">
                          <p className="text-sm font-bold text-[#F48E16] tabular-nums">
                            {appt.startTime}
                          </p>
                        </div>
                        <Avatar
                          name={appt.client?.name ?? "WI"}
                          staffId={appt.staff.id}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate text-sm">
                            {appt.client?.name ?? "Walk-in"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {appt.services.map((s) => s.service.name).join(", ") ||
                              "No services"}{" "}
                            · {appt.staff.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Revenue vs Target */}
          {visible.revenue && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Revenue vs Target
                  <Badge className="ml-auto bg-primary/15 text-primary border-0 font-normal">
                    This Month
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyTarget === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                    <Target className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No monthly target set yet.
                    </p>
                    <Link
                      href="/dashboard/finance/goals"
                      className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      Set a goal →
                    </Link>
                  </div>
                ) : (
                  <RevenueProgressBar
                    current={revenueThisMonth}
                    target={monthlyTarget}
                    fmt={fmt}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Analytics Section ──────────────────────────────────────────────── */}
      {(visible.revenue || visible.apptFunnel || visible.topClients) && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Revenue Bar Chart */}
            {visible.revenue && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Revenue This Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <WeeklyRevenueBar data={weeklyRevenueData} currency={currency} />
                </CardContent>
              </Card>
            )}

            {/* Appointment Funnel / Donut */}
            {visible.apptFunnel && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Appointments This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <AppointmentFunnel
                    scheduled={apptFunnel.scheduled}
                    completed={apptFunnel.completed}
                    cancelled={apptFunnel.cancelled}
                    noShow={apptFunnel.noShow}
                  />
                </CardContent>
              </Card>
            )}

            {/* Top Clients */}
            {visible.topClients && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Top Clients
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <TopClientsWidget clients={topClients} currency={currency} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Client Activity Feed ───────────────────────────────────────────── */}
      {visible.activityFeed && <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Client Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityFeed.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No recent activity.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {activityFeed.map((item, idx) => (
                  <div key={`${item.type}-${item.id}-${idx}`} className="flex items-start gap-4 pl-1">
                    {/* Timeline dot */}
                    <div
                      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center z-10 ${
                        item.type === "new_client"
                          ? "bg-emerald-500/15"
                          : "bg-primary/15"
                      }`}
                    >
                      {item.type === "new_client" ? (
                        <UserPlus
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                      ) : (
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-primary"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      {item.type === "new_client" ? (
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{item.name}</span>{" "}
                          <span className="text-muted-foreground">
                            joined as a new client
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">
                            {item.clientName}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            completed{" "}
                            {item.services.length > 0
                              ? item.services.slice(0, 2).join(", ")
                              : "an appointment"}
                            {item.services.length > 2
                              ? ` +${item.services.length - 2} more`
                              : ""}
                            {" "}with {item.staffName}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {relativeTime(item.timestamp)}
                        {item.type === "completed_appt" && item.amount > 0 && (
                          <span className="ml-2 text-foreground font-medium">
                            {fmt(item.amount)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* ── Today Summary Widget ────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <TodaySummaryWidget items={recentActivity} />
      )}

      {/* Upcoming Appointments + Staff Today */}
      {(visible.upcoming || visible.staffUtilization) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        {visible.upcoming && <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppts.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  No upcoming appointments.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingAppts.map((appt) => {
                  const cfg =
                    statusConfig[appt.status] ?? statusConfig.NO_SHOW;
                  return (
                    <div
                      key={appt.id}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors border-l-[3px] ${cfg.border}`}
                    >
                      <div className="text-center min-w-[58px] flex-shrink-0">
                        {appt.date && (
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {new Date(
                              appt.date + "T00:00:00"
                            ).toLocaleDateString("en", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-foreground tabular-nums">
                          {appt.startTime}
                        </p>
                      </div>
                      <Avatar
                        name={appt.client?.name ?? "WI"}
                        staffId={appt.staff.id}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">
                          {appt.client?.name ?? "Walk-in"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {appt.services
                            .map((s) => s.service.name)
                            .join(", ") || "No services"}{" "}
                          · {appt.staff.name}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.pill}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Staff Today */}
        {visible.staffUtilization && <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              Staff Today
              <Badge className="ml-auto bg-primary/20 text-primary border-0 font-normal">
                {staffUtilization.working}/{staffUtilization.total} working
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffUtilization.staff.length === 0 ? (
              <div className="text-center py-8">
                <Scissors className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  No staff scheduled today.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {staffUtilization.staff.map((member) => {
                  const color = staffColor(member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
                    >
                      <Avatar name={member.name} staffId={member.id} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">
                          {member.name}
                        </p>
                        {member.shift && (
                          <p className="text-xs text-muted-foreground">
                            {member.shift}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p
                          className={`text-sm font-bold tabular-nums ${color.text}`}
                        >
                          {member.appointmentsToday}
                        </p>
                        <p className="text-xs text-muted-foreground">appts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>}
        </div>
      )}

      {/* ── Today's Full Schedule (improved) ──────────────────────────────── */}
      {visible.todaySchedule && <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today&apos;s Schedule
            <Badge className="ml-auto bg-primary/20 text-primary border-0 font-normal">
              {todayApptsList.length} appointment{todayApptsList.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduleGroups.length === 0 ? (
            <>
              {/* Empty state with top-3 staff "Available" blocks */}
              <div className="mb-6 text-center">
                <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No appointments today.
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  New bookings will appear here.
                </p>
              </div>
              {top3Staff.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Available Staff
                  </p>
                  {top3Staff.map((s) => {
                    const color = staffColor(s.id);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border opacity-60"
                      >
                        <div
                          className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center ${color.text} font-bold text-xs`}
                        >
                          {s.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium flex-1">
                          {s.name}
                        </p>
                        <span className="text-xs text-muted-foreground/60 italic">
                          Available
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {scheduleGroups.map((group) => (
                <div key={group.time}>
                  {/* Time slot header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-foreground tabular-nums bg-secondary px-2.5 py-1 rounded-full">
                      {group.time}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {group.appts.length} appt{group.appts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Appointments in this time slot */}
                  <div className="space-y-1.5 pl-2">
                    {group.appts.map((appt) => {
                      const cfg =
                        statusConfig[appt.status] ?? statusConfig.NO_SHOW;
                      const color = staffColor(appt.staff.id);
                      return (
                        <div
                          key={appt.id}
                          className={`flex items-start sm:items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors border-l-[3px] ${cfg.border}`}
                        >
                          {/* Staff avatar with per-staff colour */}
                          <div
                            className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center ${color.text} font-bold text-xs flex-shrink-0`}
                            title={`Staff: ${appt.staff.name}`}
                          >
                            {appt.staff.name
                              .split(" ")
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>

                          {/* Client avatar (neutral) */}
                          <Avatar name={appt.client?.name ?? "WI"} size="sm" />

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate text-sm">
                              {appt.client?.name ?? "Walk-in"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {appt.services
                                .map((s) => s.service.name)
                                .join(", ") || "No services"}
                              {" · "}
                              <span className={`font-medium ${color.text}`}>
                                {appt.staff.name}
                              </span>
                            </p>
                            {/* Amount + status badge on mobile (below text) */}
                            <div className="flex items-center gap-2 mt-1 sm:hidden">
                              <p className="text-sm font-semibold text-foreground">
                                {fmt(appt.totalAmount)}
                              </p>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.pill}`}
                              >
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                          {/* Amount + status badge on desktop (inline) */}
                          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            <p className="text-sm font-semibold text-foreground">
                              {fmt(appt.totalAmount)}
                            </p>
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.pill}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* "Available" blocks for top staff not already in schedule */}
              {(() => {
                const scheduledStaffIds = new Set(
                  todayApptsList.map((a) => a.staff.id)
                );
                const availableStaff = top3Staff.filter(
                  (s) => !scheduledStaffIds.has(s.id)
                );
                if (availableStaff.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Also Available Today
                    </p>
                    {availableStaff.map((s) => {
                      const color = staffColor(s.id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border opacity-60"
                        >
                          <div
                            className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center ${color.text} font-bold text-xs`}
                          >
                            {s.name
                              .split(" ")
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium flex-1">
                            {s.name}
                          </p>
                          <span className="text-xs text-muted-foreground/60 italic">
                            Available
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>}

      {/* ── Quick Stats ──────────────────────────────────────────────────────── */}
      {visible.quickStats && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickStatsWidget
              totalClients={totalClients}
              totalStaff={totalStaff}
              servicesOffered={servicesOffered}
              avgRating={avgRating}
              monthlyTargetPct={Math.min(
                Math.round((revenueThisMonth / monthlyTarget) * 100),
                100
              )}
              activeMemberships={activeMemberships}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

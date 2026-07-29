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
} from "lucide-react";
import { WeeklyRevenueBar } from "@/components/dashboard/weekly-revenue-bar";
import { AppointmentFunnel } from "@/components/dashboard/appointment-funnel";
import { TopClientsWidget } from "@/components/dashboard/top-clients-widget";

// ─── Types ────────────────────────────────────────────────────────────────────

type Appt = {
  id: string;
  date?: string;
  startTime: string;
  status: string;
  totalAmount: number;
  client: { name: string } | null;
  staff: { name: string };
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

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
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
}: Props) {
  const now = new Date();
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

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {greeting} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening at{" "}
          <span className="text-primary font-medium">{salonName}</span> today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* Revenue Overview + Sparkline */}
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

      {/* ── Analytics Section ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Revenue Bar Chart */}
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

          {/* Appointment Funnel / Donut */}
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

          {/* Top Clients */}
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
        </div>
      </div>

      {/* Upcoming Appointments + Staff Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card className="bg-card border-border">
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
                      <Avatar name={appt.client?.name ?? "WI"} />
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
        </Card>

        {/* Staff Today */}
        <Card className="bg-card border-border">
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
                {staffUtilization.staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
                  >
                    <Avatar name={member.name} />
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
                      <p className="text-sm font-bold text-foreground">
                        {member.appointmentsToday}
                      </p>
                      <p className="text-xs text-muted-foreground">appts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Full Schedule */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today&apos;s Schedule
            <Badge className="ml-auto bg-primary/20 text-primary border-0 font-normal">
              {todayApptsList.length} appointments
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayApptsList.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No appointments today.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                New bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayApptsList.map((appt) => {
                const cfg = statusConfig[appt.status] ?? statusConfig.NO_SHOW;
                return (
                  <div
                    key={appt.id}
                    className={`flex items-center gap-4 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors border-l-[3px] ${cfg.border}`}
                  >
                    <div className="bg-background/60 rounded-full px-3 py-1.5 min-w-[64px] text-center flex-shrink-0">
                      <p className="text-xs font-semibold text-foreground tabular-nums">
                        {appt.startTime}
                      </p>
                    </div>
                    <Avatar name={appt.client?.name ?? "WI"} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {appt.client?.name ?? "Walk-in"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.services
                          .map((s) => s.service.name)
                          .join(", ") || "No services"}
                        {" · "}
                        {appt.staff.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

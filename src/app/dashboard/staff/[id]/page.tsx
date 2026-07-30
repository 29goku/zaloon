import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  UserX,
  DollarSign,
  Scissors,
  TrendingUp,
  Star,
  Phone,
  BarChart3,
  Receipt,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { ShiftEditor } from "@/components/staff/shift-editor";
import { TimeOffTab } from "@/components/staff/time-off-tab";
import { UnavailabilityTab } from "@/components/staff/unavailability-tab";
import { StaffEditPanel } from "@/components/staff/staff-edit-panel";
import { StaffServiceManager } from "@/components/staff/staff-service-manager";
import { CommissionSettingsPanel } from "@/components/staff/commission-settings-panel";
import { TimesheetTab } from "@/components/staff/timesheet-tab";
import { getTimeEntries } from "@/app/actions/timetracking";
import { getStaffUnavailability, getStaffGoals } from "@/app/actions/settings";
import { calculateAchievements, ACHIEVEMENTS, TIER_POINTS } from "@/lib/achievements";
import { StaffAvatarUpload } from "@/components/staff/staff-avatar-upload";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16] border-0",
  COMPLETED: "bg-primary/20 text-primary border-0",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666] border-0",
  NO_SHOW: "bg-muted text-muted-foreground border-0",
};

// Deterministic avatar color from staff name
function avatarColor(name: string): string {
  const colors = [
    "bg-violet-500/20 text-violet-600 dark:text-violet-400",
    "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    "bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Date helpers
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Start/end of current month for commission calc
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];
  const endOfMonthStr = endOfMonth.toISOString().split("T")[0];

  // Current week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0];
  const endOfWeekStr = endOfWeek.toISOString().split("T")[0];

  // Tips earned this month for this staff member
  const staffTipAgg = await prisma.invoice.aggregate({
    where: {
      tip: { gt: 0 },
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      Appointment: { staffId: id },
    },
    _sum: { tip: true },
    _count: { tip: true },
  });
  const tipsEarnedThisMonth = staffTipAgg._sum.tip ?? 0;
  const tipCountThisMonth = staffTipAgg._count.tip ?? 0;

  const [staff, salon, allServices, staffUnavailability, timesheetEntries, staffGoals, achievementsData] = await Promise.all([
    prisma.staff.findUnique({
      where: { id },
      include: {
        Shift: { orderBy: { dayOfWeek: "asc" } },
        StaffService: {
          include: { Service: { include: { ServiceCategory: true } } },
        },
        TimeOff: { orderBy: { startDate: "asc" } },
        Review: {
          orderBy: { createdAt: "desc" },
          include: { Client: true },
        },
        Appointment: {
          orderBy: { date: "desc" },
          take: 200, // enough for stats; we'll slice for display
          include: {
            Client: true,
            AppointmentService: { include: { Service: true } },
          },
        },
      },
    }),
    prisma.salon.findFirst(),
    prisma.service.findMany({
      where: { active: true },
      include: { ServiceCategory: true },
      orderBy: [{ ServiceCategory: { name: "asc" } }, { name: "asc" }],
    }),
    getStaffUnavailability(id),
    getTimeEntries(
      id,
      new Date(today.getFullYear(), today.getMonth() - 2, 1),
      new Date(today.getFullYear(), today.getMonth() + 2, 0)
    ),
    getStaffGoals(),
    calculateAchievements(prisma, id),
  ]);

  if (!staff) notFound();

  const currency = salon?.currency ?? "USD";
  const monthGoal = staffGoals[id] ?? null;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate();
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const appointments = staff.Appointment;
  const completed = appointments.filter((a) => a.status === "COMPLETED");

  // ── All-time stats ──────────────────────────────────────────────────────────
  const totalAppointmentsAllTime = appointments.length;
  const totalRevenue = completed.reduce((sum, a) => sum + a.totalAmount, 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

  // Commission earned this month
  const completedThisMonth = completed.filter(
    (a) => a.date >= startOfMonthStr && a.date <= endOfMonthStr
  );
  const revenueThisMonth = completedThisMonth.reduce(
    (sum, a) => sum + a.totalAmount,
    0
  );
  const commissionThisMonth = (revenueThisMonth * staff.commissionPct) / 100;
  const goalPct = monthGoal && monthGoal > 0 ? Math.min(100, (revenueThisMonth / monthGoal) * 100) : null;

  // Last 30 days for weekly chart reference
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentAppointments = appointments.filter((a) => a.date >= thirtyDaysAgoStr);
  const recentCompleted = recentAppointments.filter((a) => a.status === "COMPLETED");
  const recentCancelled = recentAppointments.filter((a) => a.status === "CANCELLED").length;
  const recentNoShow = recentAppointments.filter((a) => a.status === "NO_SHOW").length;
  const recentRevenue = recentCompleted.reduce((sum, a) => sum + a.totalAmount, 0);

  // This week's earnings
  const weeklyEarnings = completed
    .filter((a) => a.date >= startOfWeekStr && a.date <= endOfWeekStr)
    .reduce((sum, a) => sum + a.totalAmount, 0);

  // Busiest day
  const dayCount = Array(7).fill(0);
  for (const appt of recentAppointments) {
    const [y, m, d] = appt.date.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    dayCount[dow]++;
  }
  const busiestDow = dayCount.indexOf(Math.max(...dayCount));
  const busiestDay = recentAppointments.length > 0 ? DAY_NAMES[busiestDow] : "—";

  // ── Shift summary ───────────────────────────────────────────────────────────
  const workingDays = staff.Shift.map((s) => DAYS[s.dayOfWeek]).join(", ");
  const shiftSummary =
    staff.Shift.length === 0
      ? "No shifts set"
      : `${staff.Shift.length} day${staff.Shift.length === 1 ? "" : "s"}: ${workingDays}`;

  // ── Service stats (for services tab usage counts) ──────────────────────────
  const serviceCountMap: Record<
    string,
    { name: string; count: number; category: string }
  > = {};
  for (const appt of recentAppointments) {
    for (const as of appt.AppointmentService) {
      const sid = as.serviceId;
      if (!serviceCountMap[sid]) {
        serviceCountMap[sid] = { name: as.Service.name, count: 0, category: "" };
      }
      serviceCountMap[sid].count++;
    }
  }
  for (const ss of staff.StaffService) {
    if (!serviceCountMap[ss.serviceId]) {
      serviceCountMap[ss.serviceId] = {
        name: ss.Service.name,
        count: 0,
        category: ss.Service.ServiceCategory.name,
      };
    } else {
      serviceCountMap[ss.serviceId].category = ss.Service.ServiceCategory.name;
    }
  }
  const serviceStats = Object.entries(serviceCountMap)
    .map(([, v]) => v)
    .sort((a, b) => b.count - a.count);

  // ── Weekly schedule ─────────────────────────────────────────────────────────
  const weekAppointmentsByDay: Record<number, typeof appointments> = {};
  for (let i = 0; i < 7; i++) weekAppointmentsByDay[i] = [];
  for (const appt of appointments) {
    if (appt.date >= startOfWeekStr && appt.date <= endOfWeekStr) {
      const [y, m, d] = appt.date.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      weekAppointmentsByDay[dow].push(appt);
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  const reviews = staff.Review;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // ── All-services data for manager ──────────────────────────────────────────
  const allServicesData = allServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    durationMins: s.durationMins,
    categoryName: s.ServiceCategory.name,
  }));
  const assignedIds = staff.StaffService.map((ss) => ss.serviceId);

  return (
    <div className="p-4 md:p-8">
      {/* Back nav */}
      <Link
        href="/dashboard/staff"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Staff
      </Link>

      {/* ── Profile Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Card className="bg-card border-border flex-1">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <StaffAvatarUpload
                staffId={staff.id}
                name={staff.name}
                photo={(() => { try { return JSON.parse(staff.avatar ?? "{}").photo ?? null; } catch { return null; } })()}
                colorClass={avatarColor(staff.name)}
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{staff.name}</h1>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                    Active
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  {staff.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {staff.phone}
                    </span>
                  )}
                  {!staff.phone && (
                    <span className="text-sm text-muted-foreground">No phone</span>
                  )}
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{shiftSummary}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {staff.commissionPct}% commission
                  </span>
                </div>

                <div className="flex gap-1 flex-wrap mt-2">
                  {staff.StaffService.slice(0, 4).map((ss) => (
                    <Badge
                      key={ss.serviceId}
                      variant="secondary"
                      className="text-xs border-0"
                    >
                      {ss.Service.name}
                    </Badge>
                  ))}
                  {staff.StaffService.length > 4 && (
                    <Badge variant="secondary" className="text-xs border-0">
                      +{staff.StaffService.length - 4} more
                    </Badge>
                  )}
                </div>

                {/* Edit panel (client component) */}
                <div className="mt-3">
                  <StaffEditPanel
                    staffId={staff.id}
                    initialName={staff.name}
                    initialPhone={staff.phone}
                    initialCommissionPct={staff.commissionPct}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This week earnings highlight */}
        <Card className="bg-primary/10 border-primary/20 md:w-64">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              This week&apos;s earnings
            </p>
            <p className="text-3xl font-bold text-primary">{fmt(weeklyEarnings)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {startOfWeekStr} – {endOfWeekStr}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Appointments</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalAppointmentsAllTime}</p>
            <p className="text-xs text-muted-foreground mt-1">all time</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{fmt(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">from completed</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-[#F48E16]" />
              <p className="text-xs text-muted-foreground">Avg Ticket</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{fmt(avgTicket)}</p>
            <p className="text-xs text-muted-foreground mt-1">per completed visit</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-violet-500" />
              <p className="text-xs text-muted-foreground">Commission</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{fmt(commissionThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">earned this month</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-muted-foreground">Tips</p>
            </div>
            <p className="text-3xl font-bold text-emerald-500">{fmt(tipsEarnedThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tipCountThisMonth} tip{tipCountThisMonth !== 1 ? "s" : ""} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          {reviews.length > 0 && <TabsTrigger value="reviews">Reviews</TabsTrigger>}
          <TabsTrigger value="time-off">Time Off</TabsTrigger>
          <TabsTrigger value="unavailability">Unavailability</TabsTrigger>
          <TabsTrigger value="timesheet">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Timesheet
          </TabsTrigger>
          <TabsTrigger value="achievements">🏆 Achievements</TabsTrigger>
        </TabsList>

        {/* ── Overview ───────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {recentAppointments.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {recentCompleted.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {recentAppointments.length > 0
                    ? `${Math.round((recentCompleted.length / recentAppointments.length) * 100)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-5 h-5 text-[#F41666]" />
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{recentCancelled}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {recentAppointments.length > 0
                    ? `${Math.round((recentCancelled / recentAppointments.length) * 100)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <UserX className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No-show</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{recentNoShow}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {recentAppointments.length > 0
                    ? `${Math.round((recentNoShow / recentAppointments.length) * 100)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Revenue generated</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{fmt(recentRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  from completed appointments (last 30 days)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-[#F48E16]" />
                  <p className="text-sm text-muted-foreground">Busiest day</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{busiestDay}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {recentAppointments.length > 0
                    ? `${Math.max(...dayCount)} appointments on peak days`
                    : "No data yet"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Schedule ───────────────────────────────────────────────────── */}
        <TabsContent value="schedule">
          <div className="space-y-6">
            {/* Weekly schedule grid */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Shifts and this week&apos;s appointments ({startOfWeekStr} –{" "}
                  {endOfWeekStr})
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, i) => {
                    const shift = staff.Shift.find((s) => s.dayOfWeek === i);
                    const dayAppts = weekAppointmentsByDay[i] ?? [];
                    const dayDate = new Date(startOfWeek);
                    dayDate.setDate(startOfWeek.getDate() + i);
                    const dayDateStr = dayDate.toISOString().split("T")[0];
                    const isToday = dayDateStr === todayStr;

                    return (
                      <div
                        key={day}
                        className={`rounded-xl p-3 flex flex-col gap-2 min-h-[140px] ${
                          isToday
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-secondary/30 border border-transparent"
                        }`}
                      >
                        <div className="text-center">
                          <p
                            className={`text-xs font-semibold ${
                              isToday ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {day}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {dayDateStr.slice(5)}
                          </p>
                        </div>

                        {shift ? (
                          <div className="text-center bg-primary/20 rounded-md px-1 py-1">
                            <p className="text-[10px] font-medium text-primary leading-tight">
                              {shift.startTime}–{shift.endTime}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center bg-muted rounded-md px-1 py-1">
                            <p className="text-[10px] text-muted-foreground">Off</p>
                          </div>
                        )}

                        <div className="flex flex-col gap-1 flex-1">
                          {dayAppts.slice(0, 3).map((appt) => (
                            <div
                              key={appt.id}
                              className="rounded-md bg-card border border-border px-1.5 py-1"
                            >
                              <p className="text-[10px] font-medium text-foreground leading-tight truncate">
                                {appt.Client?.name ?? "Walk-in"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {appt.startTime}
                              </p>
                            </div>
                          ))}
                          {dayAppts.length > 3 && (
                            <p className="text-[10px] text-muted-foreground text-center">
                              +{dayAppts.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* This week's appointment list */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">This Week&apos;s Appointments</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {startOfWeekStr} – {endOfWeekStr}
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const weekAppts = appointments.filter(
                    (a) => a.date >= startOfWeekStr && a.date <= endOfWeekStr
                  );
                  if (weekAppts.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">
                          No appointments this week
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {weekAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className="flex items-center gap-4 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
                        >
                          <div className="min-w-[80px]">
                            <p className="text-sm font-medium text-foreground">
                              {appt.date}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {appt.startTime}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-border flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">
                              {appt.Client?.name ?? "Walk-in"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {appt.AppointmentService.map((s) => s.Service.name).join(", ") ||
                                "—"}
                            </p>
                          </div>
                          <Badge className={statusColor[appt.status] ?? "border-0"}>
                            {appt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Edit Shifts */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Edit Shifts</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Toggle working days and set start/end times
                </p>
              </CardHeader>
              <CardContent>
                <ShiftEditor
                  staffId={staff.id}
                  initialShifts={staff.Shift.map((s) => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Services ───────────────────────────────────────────────────── */}
        <TabsContent value="services">
          <div className="space-y-6">
            {/* Usage stats */}
            {serviceStats.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-primary" />
                    Service Usage
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Last 30 days
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {serviceStats.map((svc) => (
                      <div
                        key={svc.name}
                        className="flex items-center gap-4 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{svc.name}</p>
                          {svc.category && (
                            <p className="text-xs text-muted-foreground">{svc.category}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-foreground">{svc.count}</p>
                          <p className="text-xs text-muted-foreground">times</p>
                        </div>
                        {svc.count > 0 && (
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (svc.count /
                                      Math.max(
                                        ...serviceStats.map((s) => s.count),
                                        1
                                      )) *
                                      100
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service manager (add/remove) */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Manage Services</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add or remove services this staff member can perform
                </p>
              </CardHeader>
              <CardContent>
                <StaffServiceManager
                  staffId={staff.id}
                  allServices={allServicesData}
                  assignedServiceIds={assignedIds}
                  currency={currency}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Appointments ───────────────────────────────────────────────── */}
        <TabsContent value="appointments">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Recent Appointments</CardTitle>
              <p className="text-sm text-muted-foreground">Last 20 appointments</p>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No appointments yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.slice(0, 20).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
                    >
                      <div className="min-w-[90px]">
                        <p className="text-sm font-medium text-foreground">{appt.date}</p>
                        <p className="text-xs text-muted-foreground">{appt.startTime}</p>
                      </div>
                      <div className="w-px h-10 bg-border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">
                          {appt.Client?.name ?? "Walk-in"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {appt.AppointmentService.map((s) => s.Service.name).join(", ") ||
                            "—"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 min-w-[60px]">
                        <p className="text-sm font-bold text-foreground">
                          {fmt(appt.totalAmount)}
                        </p>
                      </div>
                      <Badge className={statusColor[appt.status] ?? "border-0"}>
                        {appt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reviews ────────────────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <TabsContent value="reviews">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      Reviews
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {reviews.length} review{reviews.length === 1 ? "" : "s"} •{" "}
                      avg {avgRating.toFixed(1)} / 5
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-foreground">
                      {avgRating.toFixed(1)}
                    </p>
                    <StarRating rating={Math.round(avgRating)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 rounded-xl bg-secondary/40 border border-border"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {review.Client?.name ?? "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("en", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <StarRating rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Commission ─────────────────────────────────────────────────── */}
        <TabsContent value="commission">
          <div className="space-y-4">
            {/* Monthly Goal Progress */}
            {monthGoal !== null && goalPct !== null && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Monthly Goal Progress
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {daysRemaining > 0
                          ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining this month`
                          : "Last day of the month"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xl font-bold tabular-nums ${
                          goalPct >= 80
                            ? "text-emerald-500"
                            : goalPct >= 50
                            ? "text-amber-500"
                            : "text-[#F41666]"
                        }`}
                      >
                        {goalPct.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(revenueThisMonth)} / {fmt(monthGoal)}
                      </p>
                    </div>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goalPct >= 80
                          ? "bg-emerald-500"
                          : goalPct >= 50
                          ? "bg-amber-500"
                          : "bg-[#F41666]"
                      }`}
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>$0</span>
                    <span>Goal: {fmt(monthGoal)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Commission Settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Set the default commission rate and per-service overrides for{" "}
                  {staff.name}.
                </p>
              </CardHeader>
              <CardContent>
                <CommissionSettingsPanel
                  staffId={staff.id}
                  defaultCommissionPct={staff.commissionPct}
                  services={staff.StaffService.map((ss) => ({
                    serviceId: ss.serviceId,
                    serviceName: ss.Service.name,
                    categoryName: ss.Service.ServiceCategory.name,
                    price: ss.Service.price,
                    overridePct: ss.commissionOverridePct ?? null,
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Time Off ───────────────────────────────────────────────────── */}
        <TabsContent value="time-off">
          <TimeOffTab
            staffId={staff.id}
            initialRecords={staff.TimeOff.map((t) => ({
              id: t.id,
              staffId: t.staffId,
              startDate: t.startDate,
              endDate: t.endDate,
              reason: t.reason,
              approved: t.approved,
              createdAt: t.createdAt,
            }))}
          />
        </TabsContent>

        {/* ── Unavailability ─────────────────────────────────────────────── */}
        <TabsContent value="unavailability">
          <UnavailabilityTab
            staffId={staff.id}
            initialRecords={staffUnavailability}
          />
        </TabsContent>

        {/* ── Timesheet ──────────────────────────────────────────────────── */}
        <TabsContent value="timesheet">
          <TimesheetTab
            staffId={staff.id}
            staffName={staff.name}
            entries={timesheetEntries}
            shifts={staff.Shift.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            }))}
            initialYear={today.getFullYear()}
            initialMonth={today.getMonth()}
          />
        </TabsContent>

        {/* ── Achievements ───────────────────────────────────────────────── */}
        <TabsContent value="achievements">
          <div className="space-y-6">
            {/* Performance stats summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">All-time Appointments</p>
                  <p className="text-3xl font-bold text-foreground tabular-nums">
                    {totalAppointmentsAllTime}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">All-time Revenue</p>
                  <p className="text-3xl font-bold text-primary tabular-nums">
                    {fmt(totalRevenue)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Avg Rating</p>
                  <p className="text-3xl font-bold text-amber-400 tabular-nums">
                    {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Best Month Revenue</p>
                  <p className="text-3xl font-bold text-emerald-500 tabular-nums">
                    {fmt(revenueThisMonth)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">this month</p>
                </CardContent>
              </Card>
            </div>

            {/* Earned Badges */}
            {achievementsData.earned.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Earned Badges
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({achievementsData.earned.length})
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievementsData.earned.map((ach) => (
                    <div
                      key={ach.id}
                      className={`rounded-2xl border bg-gradient-to-br ${ach.color} p-5`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-4xl flex-shrink-0">{ach.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-foreground">{ach.name}</p>
                            <span
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                                ach.tier === "gold"
                                  ? "bg-amber-400/20 text-amber-400"
                                  : ach.tier === "silver"
                                  ? "bg-slate-400/20 text-slate-400"
                                  : ach.tier === "platinum"
                                  ? "bg-cyan-400/20 text-cyan-400"
                                  : "bg-amber-700/20 text-amber-600"
                              }`}
                            >
                              {ach.tier}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ach.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            +{TIER_POINTS[ach.tier]} pts
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress toward unearned badges */}
            {(() => {
              const unearned = ACHIEVEMENTS.filter(
                (a) => !achievementsData.earned.some((e) => e.id === a.id)
              );
              if (unearned.length === 0) return null;
              return (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    In Progress
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({unearned.length} remaining)
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {unearned.map((ach) => {
                      const current = achievementsData.progress[ach.id] ?? 0;
                      const pct = Math.min(
                        100,
                        (current / ach.criteria.threshold) * 100
                      );
                      const remaining = Math.max(
                        0,
                        ach.criteria.threshold - current
                      );
                      const unit =
                        ach.criteria.type === "revenue"
                          ? `${fmt(remaining)} more`
                          : ach.criteria.type === "rating"
                          ? `need ${ach.criteria.threshold} avg`
                          : `${remaining} more`;
                      return (
                        <Card key={ach.id} className="bg-card border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <span className="text-2xl opacity-40 grayscale flex-shrink-0">
                                {ach.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">
                                      {ach.name}
                                    </p>
                                    <span
                                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                                        ach.tier === "gold"
                                          ? "bg-amber-400/10 text-amber-500/60"
                                          : ach.tier === "silver"
                                          ? "bg-slate-400/10 text-slate-400/60"
                                          : "bg-amber-700/10 text-amber-600/60"
                                      }`}
                                    >
                                      {ach.tier}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {ach.criteria.type === "rating"
                                      ? `${current.toFixed(1)} / ${ach.criteria.threshold}`
                                      : ach.criteria.type === "revenue"
                                      ? `${fmt(current)} / ${fmt(ach.criteria.threshold)}`
                                      : `${current} / ${ach.criteria.threshold}`}
                                  </span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-muted-foreground/40 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {ach.description} — {unit} needed
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {achievementsData.earned.length === 0 &&
              ACHIEVEMENTS.every(
                (a) => (achievementsData.progress[a.id] ?? 0) === 0
              ) && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">🌱</p>
                  <p className="text-muted-foreground">
                    No achievements yet — keep going!
                  </p>
                </div>
              )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

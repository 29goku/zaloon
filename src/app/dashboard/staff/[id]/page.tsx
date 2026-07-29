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
} from "lucide-react";
import Link from "next/link";
import { ShiftEditor } from "@/components/staff/shift-editor";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16] border-0",
  COMPLETED: "bg-primary/20 text-primary border-0",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666] border-0",
  NO_SHOW: "bg-muted text-muted-foreground border-0",
};

export default async function StaffDetailPage({ params }: PageProps<"/dashboard/staff/[id]">) {
  const { id } = await params;

  // Date boundaries
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  // Start of current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

  // End of current week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const endOfWeekStr = endOfWeek.toISOString().split("T")[0];

  const [staff, salon] = await Promise.all([
    prisma.staff.findUnique({
      where: { id },
      include: {
        Shift: true,
        StaffService: { include: { Service: { include: { ServiceCategory: true } } } },
        Appointment: {
          where: { date: { gte: thirtyDaysAgoStr } },
          orderBy: { date: "desc" },
          include: {
            Client: true,
            AppointmentService: { include: { Service: true } },
          },
        },
      },
    }),
    prisma.salon.findFirst(),
  ]);

  if (!staff) notFound();

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const appointments = staff.Appointment;

  // Stats
  const totalAppointments = appointments.length;
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const noShow = appointments.filter((a) => a.status === "NO_SHOW").length;
  const revenue = completed.reduce((sum, a) => sum + a.totalAmount, 0);

  // This week's earnings
  const weeklyEarnings = completed
    .filter((a) => a.date >= startOfWeekStr && a.date <= endOfWeekStr)
    .reduce((sum, a) => sum + a.totalAmount, 0);

  // Busiest day of week
  const dayCount = Array(7).fill(0);
  for (const appt of appointments) {
    // date is a string like "YYYY-MM-DD"; parse as local date
    const [y, m, d] = appt.date.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    dayCount[dow]++;
  }
  const busiestDow = dayCount.indexOf(Math.max(...dayCount));
  const busiestDay = totalAppointments > 0 ? DAY_NAMES[busiestDow] : "—";

  // Service usage counts
  const serviceCountMap: Record<string, { name: string; count: number; category: string }> = {};
  for (const appt of appointments) {
    for (const as of appt.AppointmentService) {
      const sid = as.serviceId;
      if (!serviceCountMap[sid]) {
        serviceCountMap[sid] = { name: as.Service.name, count: 0, category: "" };
      }
      serviceCountMap[sid].count++;
    }
  }
  // Merge with staff services for full list (even those with 0 uses)
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

  // Weekly schedule: appointments this week grouped by day
  const weekAppointmentsByDay: Record<number, typeof appointments> = {};
  for (let i = 0; i < 7; i++) weekAppointmentsByDay[i] = [];
  for (const appt of appointments) {
    const [y, m, d] = appt.date.split("-").map(Number);
    const apptDate = new Date(y, m - 1, d);
    if (appt.date >= startOfWeekStr && appt.date <= endOfWeekStr) {
      const dow = apptDate.getDay();
      weekAppointmentsByDay[dow].push(appt);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back nav */}
      <Link
        href="/dashboard/staff"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Staff
      </Link>

      {/* Top: Staff info card + this week's earnings */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Card className="bg-card border-border flex-1">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0">
                {staff.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground">{staff.name}</h1>
                <p className="text-muted-foreground text-sm mt-0.5">{staff.phone ?? "No phone"}</p>
                <div className="flex gap-1 flex-wrap mt-2">
                  {staff.StaffService.slice(0, 4).map((ss) => (
                    <Badge key={ss.serviceId} variant="secondary" className="text-xs border-0">
                      {ss.Service.name}
                    </Badge>
                  ))}
                  {staff.StaffService.length > 4 && (
                    <Badge variant="secondary" className="text-xs border-0">
                      +{staff.StaffService.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This week's earnings highlight */}
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

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{totalAppointments}</p>
                <p className="text-xs text-muted-foreground mt-1">last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{completed.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalAppointments > 0
                    ? `${Math.round((completed.length / totalAppointments) * 100)}%`
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
                <p className="text-3xl font-bold text-foreground">{cancelled}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalAppointments > 0
                    ? `${Math.round((cancelled / totalAppointments) * 100)}%`
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
                <p className="text-3xl font-bold text-foreground">{noShow}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalAppointments > 0
                    ? `${Math.round((noShow / totalAppointments) * 100)}%`
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
                <p className="text-3xl font-bold text-foreground">{fmt(revenue)}</p>
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
                  {totalAppointments > 0
                    ? `${Math.max(...dayCount)} appointments on peak days`
                    : "No data yet"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Schedule ── */}
        <TabsContent value="schedule">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Schedule</CardTitle>
              <p className="text-sm text-muted-foreground">
                Shifts and this week&apos;s appointments ({startOfWeekStr} – {endOfWeekStr})
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, i) => {
                  const shift = staff.Shift.find((s) => s.dayOfWeek === i);
                  const dayAppts = weekAppointmentsByDay[i] ?? [];
                  // Compute this day's date string for "today" highlight
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
                        <p className="text-[10px] text-muted-foreground">{dayDateStr.slice(5)}</p>
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
                            <p className="text-[10px] text-muted-foreground">{appt.startTime}</p>
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
        </TabsContent>

        {/* ── Services ── */}
        <TabsContent value="services">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No services assigned</p>
              ) : (
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
                        <p className="text-xs text-muted-foreground">times done</p>
                      </div>
                      {svc.count > 0 && (
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((svc.count / Math.max(...serviceStats.map((s) => s.count), 1)) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Recent Appointments</CardTitle>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No appointments in the last 30 days</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.map((appt) => (
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
                          {appt.AppointmentService.map((s) => s.Service.name).join(", ") || "—"}
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
      </Tabs>
    </div>
  );
}

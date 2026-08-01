import type React from "react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, List, LayoutGrid, History, CheckCircle2, UserX, TrendingUp, CheckSquare, Users } from "lucide-react";
import { NewAppointmentModal } from "@/components/appointments/new-appointment-modal";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { getAppointmentsForWeek, getQueueForToday } from "@/app/actions/appointments";
import { DateNav } from "@/components/appointments/date-nav";
import { AppointmentsListWithSheet } from "@/components/appointments/appointments-list-with-sheet";
import {
  AppointmentHistoryTable,
  type HistoryAppointment,
  type HistoryStats,
} from "@/components/appointments/appointment-history-table";
import { getAppointmentsBySeries } from "@/app/actions/appointments";
import { CheckInBoardClient } from "@/app/dashboard/checkin/check-in-board-client";
import { QueueActions } from "@/app/dashboard/queue/queue-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

/** Return the Monday of the ISO week that contains the given YYYY-MM-DD string. */
function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// ── Queue helpers (copied from /dashboard/queue/page.tsx) ─────────────────────

function statusBadgeClass(status: string): string {
  switch (status) {
    case "SCHEDULED": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-transparent";
    case "IN_PROGRESS": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent";
    case "COMPLETED": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent";
    case "NO_SHOW": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-transparent";
    default: return "bg-muted text-muted-foreground border-transparent";
  }
}

function formatQueueTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

interface PageProps {
  searchParams: Promise<{ view?: string; week?: string; date?: string; series?: string }>;
}

export default async function AppointmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const today = new Date().toISOString().split("T")[0];

  // ── Series view ────────────────────────────────────────────────────────────
  if (params.series) {
    const seriesId = params.series;
    const [seriesAppts, salon, staff, services] = await Promise.all([
      getAppointmentsBySeries(seriesId),
      prisma.salon.findFirst(),
      prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.service.findMany({ select: { id: true, name: true, price: true, durationMins: true, categoryId: true }, orderBy: { name: "asc" } }),
    ]);

    const currency = salon?.currency ?? "USD";

    // Parse series metadata from first appointment's notes
    let seriesMeta: { pattern: string; total: number } | null = null;
    if (seriesAppts.length > 0 && seriesAppts[0].notes) {
      try {
        const parsed = JSON.parse(seriesAppts[0].notes);
        if (parsed?.__recurring) {
          seriesMeta = { pattern: parsed.__recurring.pattern, total: parsed.__recurring.total };
        }
      } catch { /* ignore */ }
    }

    const mappedSeriesAppts = seriesAppts.map((a) => ({
      ...a,
      client: a.Client ? { id: a.Client.id, name: a.Client.name } : null,
      staff: { id: a.Staff.id, name: a.Staff.name },
      services: a.AppointmentService.map((as) => ({
        service: { id: as.Service.id, name: as.Service.name, price: as.Service.price, durationMins: as.Service.durationMins },
        staff: as.Staff ? { id: as.Staff.id, name: as.Staff.name } : null,
      })),
    }));

    const patternLabel =
      seriesMeta?.pattern === "weekly"
        ? "Weekly"
        : seriesMeta?.pattern === "biweekly"
        ? "Every 2 weeks"
        : seriesMeta?.pattern === "monthly"
        ? "Monthly"
        : "";

    return (
      <div className="p-4 md:p-8">
        {/* Series header */}
        <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard/appointments"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Appointments
              </Link>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-xs text-foreground font-medium">Recurring Series</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-violet-400" />
              Recurring Series
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {seriesAppts.length} appointment{seriesAppts.length !== 1 ? "s" : ""}
              {patternLabel ? ` · ${patternLabel}` : ""}
              {" · Series ID: "}
              <span className="font-mono text-xs">{seriesId.slice(0, 8).toUpperCase()}</span>
            </p>
          </div>
          <Link
            href="/dashboard/appointments"
            className="text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Back to all appointments
          </Link>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-violet-400" />
              All occurrences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentsListWithSheet
              appointments={mappedSeriesAppts}
              currency={currency}
              clients={[]}
              staff={staff}
              services={services}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Check-In Board view ────────────────────────────────────────────────────
  if (params.view === "checkin") {
    const today = new Date().toISOString().split("T")[0];
    const [appointments, salon] = await Promise.all([
      prisma.appointment.findMany({
        where: { date: today, status: { not: "CANCELLED" } },
        orderBy: { startTime: "asc" },
        include: {
          Client: { select: { id: true, name: true, phone: true } },
          Staff: { select: { id: true, name: true } },
          AppointmentService: {
            include: {
              Service: { select: { id: true, name: true, durationMins: true, price: true } },
            },
          },
        },
      }),
      prisma.salon.findFirst({ select: { currency: true } }),
    ]);

    const mapped = appointments.map((a) => ({
      id: a.id,
      status: a.status,
      startTime: a.startTime,
      date: a.date,
      notes: a.notes,
      totalAmount: a.totalAmount,
      client: a.Client ? { id: a.Client.id, name: a.Client.name, phone: a.Client.phone } : null,
      staff: { id: a.Staff.id, name: a.Staff.name },
      services: a.AppointmentService.map((as) => ({
        service: { id: as.Service.id, name: as.Service.name, durationMins: as.Service.durationMins, price: as.Service.price },
      })),
    }));

    return (
      <div>
        <div className="px-4 md:px-8 pt-4 md:pt-8 pb-0">
          <CheckInHeader view="checkin" today={today} />
        </div>
        <CheckInBoardClient appointments={mapped} currency={salon?.currency ?? "USD"} today={today} />
      </div>
    );
  }

  // ── Queue view ─────────────────────────────────────────────────────────────
  if (params.view === "queue") {
    const { entries, staffCards } = await getQueueForToday();
    const today = new Date().toISOString().split("T")[0];

    const activeCount = entries.filter((e) => e.status === "SCHEDULED" || e.status === "IN_PROGRESS").length;
    const completedCount = entries.filter((e) => e.status === "COMPLETED").length;
    const inProgressCount = entries.filter((e) => e.status === "IN_PROGRESS").length;

    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CheckInHeader view="queue" today={today} />
          <Link
            href="/queue-display"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium transition-colors self-start"
          >
            <span className="w-4 h-4 text-muted-foreground">📺</span>
            TV Display
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total today", value: entries.length, color: "bg-primary/10" },
            { label: "In progress", value: inProgressCount, color: "bg-amber-100 dark:bg-amber-900/30" },
            { label: "Remaining", value: activeCount, color: "bg-blue-100 dark:bg-blue-900/30" },
            { label: "Completed", value: completedCount, color: "bg-green-100 dark:bg-green-900/30" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Staff cards */}
        {staffCards.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-3">Staff Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {staffCards.map((card) => (
                <div key={card.staffId} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground">{card.staffName}</p>
                    {card.currentAppointment ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Busy</span>
                    ) : card.idleMins !== null ? (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Idle {card.idleMins}m</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Free</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Now serving</p>
                    {card.currentAppointment ? (
                      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2.5">
                        <p className="text-sm font-medium">{card.currentAppointment.clientName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{card.currentAppointment.services}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatQueueTime(card.currentAppointment.startTime)}</p>
                      </div>
                    ) : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Up next</p>
                    {card.nextAppointment ? (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-sm font-medium">{card.nextAppointment.clientName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{card.nextAppointment.services}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatQueueTime(card.nextAppointment.startTime)}</p>
                      </div>
                    ) : <p className="text-xs text-muted-foreground">No more appointments</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Queue table */}
        <section>
          <h2 className="text-base font-semibold mb-3">Today&apos;s Queue</h2>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-xl border border-border">
              <Users className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["#", "Client", "Services", "Time", "Est. Wait", "Staff", "Status", "Actions"].map((h) => (
                      <th key={h} className={cn("px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide", h === "Actions" && "text-right")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr key={entry.id} className={cn("bg-card hover:bg-muted/30 transition-colors", entry.status === "IN_PROGRESS" && "bg-amber-50/40 dark:bg-amber-950/10", entry.status === "COMPLETED" && "opacity-60", entry.status === "NO_SHOW" && "opacity-50")}>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{entry.position}</td>
                      <td className="px-4 py-3"><p className="font-medium">{entry.clientName}</p></td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px]"><p className="truncate">{entry.services}</p></td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatQueueTime(entry.startTime)}</td>
                      <td className="px-4 py-3">
                        {entry.status === "SCHEDULED" ? (
                          entry.estimatedWaitMins === 0
                            ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">Now</span>
                            : <span className="text-xs text-muted-foreground">~{entry.estimatedWaitMins} min</span>
                        ) : <span className="text-xs text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{entry.staffName}</td>
                      <td className="px-4 py-3"><Badge className={cn("text-xs font-medium", statusBadgeClass(entry.status))}>{entry.status.replace("_", " ")}</Badge></td>
                      <td className="px-4 py-3 text-right"><QueueActions id={entry.id} status={entry.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Determine active view
  const rawView = params.view;
  const isHistory = rawView === "history";
  const isCalendar = rawView === "calendar";
  const view = isCalendar ? "calendar" : isHistory ? "history" : "list";

  // ── History view ───────────────────────────────────────────────────────────
  if (isHistory) {
    const [historyRows, salon, staffList] = await Promise.all([
      prisma.appointment.findMany({
        where: { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        include: {
          Client: true,
          Staff: true,
          AppointmentService: { include: { Service: true, Staff: true } },
        },
      }),
      prisma.salon.findFirst(),
      prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    const currency = salon?.currency ?? "USD";

    // Compute stats
    const total = historyRows.length;
    const completed = historyRows.filter((a) => a.status === "COMPLETED").length;
    const cancelled = historyRows.filter((a) => a.status === "CANCELLED").length;
    const noShow = historyRows.filter((a) => a.status === "NO_SHOW").length;

    const completedAppointments = historyRows.filter((a) => a.status === "COMPLETED");
    const avgTicket =
      completedAppointments.length > 0
        ? completedAppointments.reduce((sum, a) => sum + a.totalAmount, 0) /
          completedAppointments.length
        : 0;

    const stats: HistoryStats = {
      total,
      completed,
      cancelled,
      noShow,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      avgTicket,
    };

    const appointments: HistoryAppointment[] = historyRows.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      totalAmount: a.totalAmount,
      status: a.status,
      client: a.Client ? { id: a.Client.id, name: a.Client.name } : null,
      staff: { id: a.Staff.id, name: a.Staff.name },
      services: a.AppointmentService.map((as) => ({
        service: { id: as.Service.id, name: as.Service.name, price: as.Service.price },
        staff: as.Staff ? { id: as.Staff.id, name: as.Staff.name } : null,
      })),
    }));

    return (
      <div className="p-4 md:p-8">
        <Header view="history" today={today} staff={staffList} services={[]} categories={[]} />

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-primary" />
              Appointment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentHistoryTable
              appointments={appointments}
              staff={staffList}
              currency={currency}
              stats={stats}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Calendar view ──────────────────────────────────────────────────────────
  if (isCalendar) {
    const rawWeek = params.week ?? today;
    const weekStart = getWeekMonday(rawWeek);

    const [weekAppointments, clients, staff, services, categories, salon] = await Promise.all([
      getAppointmentsForWeek(weekStart),
      prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.service.findMany({ select: { id: true, name: true, price: true, durationMins: true, categoryId: true }, orderBy: { name: "asc" } }),
      prisma.serviceCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.salon.findFirst(),
    ]);

    return (
      <div className="p-4 md:p-8">
        <Header
          view="calendar"
          today={today}
          weekStart={weekStart}
          staff={staff}
          services={services}
          categories={categories}
          salonId={salon?.id}
        />
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Loading calendar…</div>}>
              <AppointmentCalendar appointments={weekAppointments} weekStart={weekStart} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const isUpcoming = params.date === "upcoming";
  const selectedDate = (!params.date || isUpcoming) ? today : params.date;

  // ── Stats: compute month boundaries for monthly aggregates ────────────────
  const monthStart = today.slice(0, 7) + "-01"; // YYYY-MM-01

  const [appointments, salon, clients, staff, services, categories, statsData] = await Promise.all([
    isUpcoming
      ? prisma.appointment.findMany({
          where: { status: "SCHEDULED", date: { gte: today } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          include: {
            Client: true,
            Staff: true,
            AppointmentService: { include: { Service: true, Staff: true } },
          },
        })
      : prisma.appointment.findMany({
          where: { date: selectedDate },
          orderBy: { startTime: "asc" },
          include: {
            Client: true,
            Staff: true,
            AppointmentService: { include: { Service: true, Staff: true } },
          },
        }),
    prisma.salon.findFirst(),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, name: true, price: true, durationMins: true, categoryId: true }, orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // Stats: today + this month
    Promise.all([
      // All today
      prisma.appointment.count({ where: { date: today } }),
      // Completed today
      prisma.appointment.count({ where: { date: today, status: "COMPLETED" } }),
      // No-shows this month
      prisma.appointment.count({
        where: { date: { gte: monthStart, lte: today }, status: "NO_SHOW" },
      }),
      // Completed this month (for avg value)
      prisma.appointment.findMany({
        where: { date: { gte: monthStart, lte: today }, status: "COMPLETED" },
        select: { totalAmount: true },
      }),
    ]),
  ]);

  const currency = salon?.currency ?? "USD";

  // Unpack stats
  const [totalToday, completedToday, noShowsMonth, completedMonthRows] = statsData;
  const avgValueMonth =
    completedMonthRows.length > 0
      ? completedMonthRows.reduce((s, a) => s + a.totalAmount, 0) / completedMonthRows.length
      : 0;

  const mappedAppointments = appointments.map((a) => ({
    ...a,
    client: a.Client ? { id: a.Client.id, name: a.Client.name } : null,
    staff: { id: a.Staff.id, name: a.Staff.name },
    services: a.AppointmentService.map((as) => ({
      service: { id: as.Service.id, name: as.Service.name, price: as.Service.price, durationMins: as.Service.durationMins },
      staff: as.Staff ? { id: as.Staff.id, name: as.Staff.name } : null,
    })),
  }));

  const cardTitle = isUpcoming
    ? "All upcoming appointments"
    : selectedDate === today
    ? `Today — ${new Date().toLocaleDateString("en", { dateStyle: "full" })}`
    : new Date(selectedDate + "T00:00:00").toLocaleDateString("en", { dateStyle: "full" });

  return (
    <div className="p-4 md:p-8">
      <Header
        view="list"
        today={today}
        selectedDate={selectedDate}
        staff={staff}
        services={services}
        categories={categories}
        salonId={salon?.id}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total today"
          value={totalToday}
          icon={<CalendarDays className="w-4 h-4 text-primary" />}
        />
        <StatCard
          label="Completed today"
          value={completedToday}
          icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
        />
        <StatCard
          label="No-shows this month"
          value={noShowsMonth}
          icon={<UserX className="w-4 h-4 text-muted-foreground" />}
          muted
        />
        <StatCard
          label="Avg value this month"
          value={avgValueMonth.toLocaleString("en", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
        />
      </div>

      {/* Date navigation — only in list view */}
      <div className="mb-5">
        <DateNav currentDate={params.date ?? today} />
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
              {cardTitle}
            </CardTitle>

            {/* Date picker (hidden in upcoming view) */}
            {!isUpcoming && <DatePicker selectedDate={selectedDate} />}
          </div>
        </CardHeader>
        <CardContent>
          <AppointmentsListWithSheet
            appointments={mappedAppointments}
            currency={currency}
            clients={clients}
            staff={staff}
            services={services}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components (server-renderable) ────────────────────────────────────────

/** Minimal header for checkin / queue views (no new-appt button needed) */
function CheckInHeader({ view, today }: { view: "checkin" | "queue"; today: string }) {
  return (
    <div className="flex items-start sm:items-center justify-between mb-6 flex-wrap gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          {view === "checkin" ? (
            <><CheckSquare className="w-6 h-6 text-primary" /> Check-In Board</>
          ) : (
            <><Users className="w-6 h-6 text-primary" /> Queue</>
          )}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {new Date().toLocaleDateString("en-US", { dateStyle: "full" })}
        </p>
      </div>
      <ViewToggle view={view} today={today} />
    </div>
  );
}

function ViewToggle({ view, today, weekStart, selectedDate }: {
  view: "list" | "calendar" | "history" | "checkin" | "queue";
  today: string;
  weekStart?: string;
  selectedDate?: string;
}) {
  const calHref = `?view=calendar&week=${weekStart ?? today}`;
  const listHref = `?view=list&date=${selectedDate ?? today}`;
  const historyHref = `?view=history`;
  const checkinHref = `?view=checkin`;
  const queueHref = `?view=queue`;

  const tabs = [
    { href: listHref, label: "List", icon: List, key: "list" },
    { href: calHref, label: "Calendar", icon: LayoutGrid, key: "calendar" },
    { href: historyHref, label: "History", icon: History, key: "history" },
    { href: checkinHref, label: "Check-In", icon: CheckSquare, key: "checkin" },
    { href: queueHref, label: "Queue", icon: Users, key: "queue" },
  ] as const;

  return (
    <div className="flex rounded-lg overflow-hidden border border-border">
      {tabs.map(({ href, label, icon: Icon, key }) => (
        <Link
          key={key}
          href={href}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
            view === key
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function Header({
  view,
  today,
  weekStart,
  selectedDate,
  staff,
  services,
  categories,
  salonId,
}: {
  view: "list" | "calendar" | "history";
  today: string;
  weekStart?: string;
  selectedDate?: string;
  staff: { id: string; name: string }[];
  services: { id: string; name: string; price: number; durationMins: number; categoryId: string }[];
  categories: { id: string; name: string }[];
  salonId?: string;
}) {
  return (
    <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 flex-wrap gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointments</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage bookings and schedule</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <ViewToggle view={view} today={today} weekStart={weekStart} selectedDate={selectedDate} />
        {view !== "history" && (
          <NewAppointmentModal
            staff={staff}
            services={services}
            categories={categories}
            salonId={salonId}
          />
        )}
      </div>
    </div>
  );
}

/** Stats summary card */
function StatCard({
  label,
  value,
  icon,
  muted = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/** A plain HTML date input that navigates via GET when changed. */
function DatePicker({ selectedDate }: { selectedDate: string }) {
  return (
    <form method="GET" className="flex items-center gap-2">
      <input type="hidden" name="view" value="list" />
      <label htmlFor="date-picker" className="text-xs text-muted-foreground">
        Jump to date:
      </label>
      <input
        id="date-picker"
        type="date"
        name="date"
        defaultValue={selectedDate}
        className="text-sm bg-secondary border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        onChange={undefined}
      />
      <button
        type="submit"
        className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Go
      </button>
    </form>
  );
}

import type React from "react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, List, LayoutGrid, History, CheckCircle2, UserX, TrendingUp } from "lucide-react";
import { NewAppointmentModal } from "@/components/appointments/new-appointment-modal";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { getAppointmentsForWeek } from "@/app/actions/appointments";
import { DateNav } from "@/components/appointments/date-nav";
import { AppointmentsListWithSheet } from "@/components/appointments/appointments-list-with-sheet";
import {
  AppointmentHistoryTable,
  type HistoryAppointment,
  type HistoryStats,
} from "@/components/appointments/appointment-history-table";
import { getAppointmentsBySeries } from "@/app/actions/appointments";
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
  const calHref = `?view=calendar&week=${weekStart ?? today}`;
  const listHref = `?view=list&date=${selectedDate ?? today}`;
  const historyHref = `?view=history`;

  return (
    <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 flex-wrap gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointments</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage bookings and schedule</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          <Link
            href={listHref}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <List className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">List view</span>
          </Link>
          <Link
            href={calHref}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "calendar"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Calendar</span>
          </Link>
          <Link
            href={historyHref}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "history"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <History className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">History</span>
          </Link>
        </div>

        {/* Only show New Appointment button in non-history views */}
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

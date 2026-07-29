import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, List, LayoutGrid } from "lucide-react";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { getAppointmentsForWeek } from "@/app/actions/appointments";
import { DateNav } from "@/components/appointments/date-nav";
import { AppointmentsListWithSheet } from "@/components/appointments/appointments-list-with-sheet";
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
  searchParams: Promise<{ view?: string; week?: string; date?: string }>;
}

export default async function AppointmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = params.view === "calendar" ? "calendar" : "list";

  const today = new Date().toISOString().split("T")[0];

  // ── Calendar view ─────────────────────────────────────────────────────────
  if (view === "calendar") {
    const rawWeek = params.week ?? today;
    const weekStart = getWeekMonday(rawWeek);

    const [weekAppointments, clients, staff, services, categories] = await Promise.all([
      getAppointmentsForWeek(weekStart),
      prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.service.findMany({ select: { id: true, name: true, price: true, durationMins: true, categoryId: true }, orderBy: { name: "asc" } }),
      prisma.serviceCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    return (
      <div className="p-8">
        <Header
          view="calendar"
          today={today}
          weekStart={weekStart}
          clients={clients}
          staff={staff}
          services={services}
          categories={categories}
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

  // ── List view ─────────────────────────────────────────────────────────────
  const isUpcoming = params.date === "upcoming";
  const selectedDate = (!params.date || isUpcoming) ? today : params.date;

  const [appointments, salon, clients, staff, services, categories] = await Promise.all([
    isUpcoming
      ? prisma.appointment.findMany({
          where: { status: "SCHEDULED", date: { gte: today } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          include: {
            Client: true,
            Staff: true,
            AppointmentService: { include: { Service: true } },
          },
        })
      : prisma.appointment.findMany({
          where: { date: selectedDate },
          orderBy: { startTime: "asc" },
          include: {
            Client: true,
            Staff: true,
            AppointmentService: { include: { Service: true } },
          },
        }),
    prisma.salon.findFirst(),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, name: true, price: true, durationMins: true, categoryId: true }, orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const currency = salon?.currency ?? "USD";

  const cardTitle = isUpcoming
    ? "All upcoming appointments"
    : selectedDate === today
    ? `Today — ${new Date().toLocaleDateString("en", { dateStyle: "full" })}`
    : new Date(selectedDate + "T00:00:00").toLocaleDateString("en", { dateStyle: "full" });

  return (
    <div className="p-8">
      <Header
        view="list"
        today={today}
        selectedDate={selectedDate}
        clients={clients}
        staff={staff}
        services={services}
        categories={categories}
      />

      {/* Date navigation — only in list view */}
      <div className="mb-5">
        <Suspense fallback={null}>
          <DateNav currentDate={params.date ?? today} />
        </Suspense>
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
            appointments={appointments}
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
  clients,
  staff,
  services,
  categories,
}: {
  view: "list" | "calendar";
  today: string;
  weekStart?: string;
  selectedDate?: string;
  clients: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  services: { id: string; name: string; price: number; durationMins: number; categoryId: string }[];
  categories: { id: string; name: string }[];
}) {
  const calHref = `?view=calendar&week=${weekStart ?? today}`;
  const listHref = `?view=list&date=${selectedDate ?? today}`;

  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
        <p className="text-muted-foreground mt-1">Manage bookings and schedule</p>
      </div>
      <div className="flex items-center gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          <Link
            href={listHref}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List view
          </Link>
          <Link
            href={calHref}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "calendar"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Calendar view
          </Link>
        </div>
        <NewAppointmentDialog
          clients={clients}
          staff={staff}
          services={services}
          categories={categories}
        />
      </div>
    </div>
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

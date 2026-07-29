import { prisma } from "@/lib/prisma";
import { TodayTasks } from "@/components/mobile/today-tasks";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesUntil(dateStr: string, timeStr: string, now: Date): number {
  const [h, m] = timeStr.split(":").map(Number);
  const apptDate = new Date(dateStr + "T00:00:00");
  apptDate.setHours(h, m, 0, 0);
  return Math.round((apptDate.getTime() - now.getTime()) / 60000);
}

function formatCountdown(mins: number): string {
  if (mins <= 0) return "Now";
  if (mins < 60) return `In ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `In ${h}h ${m}m` : `In ${h}h`;
}

// Deterministic staff colour from id hash
const STAFF_COLORS = [
  { bg: "bg-violet-500/20", text: "text-violet-500" },
  { bg: "bg-sky-500/20", text: "text-sky-500" },
  { bg: "bg-emerald-500/20", text: "text-emerald-500" },
  { bg: "bg-rose-500/20", text: "text-rose-500" },
  { bg: "bg-amber-500/20", text: "text-amber-500" },
  { bg: "bg-cyan-500/20", text: "text-cyan-500" },
  { bg: "bg-fuchsia-500/20", text: "text-fuchsia-500" },
  { bg: "bg-teal-500/20", text: "text-teal-500" },
];

function staffColor(staffId: string) {
  let hash = 0;
  for (let i = 0; i < staffId.length; i++) {
    hash = (hash * 31 + staffId.charCodeAt(i)) & 0xffff;
  }
  return STAFF_COLORS[hash % STAFF_COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-rose-500",
  NO_SHOW: "bg-muted-foreground",
};

const STATUS_PILL: Record<string, string> = {
  SCHEDULED: "bg-amber-500/15 text-amber-500",
  COMPLETED: "bg-emerald-500/15 text-emerald-500",
  CANCELLED: "bg-rose-500/15 text-rose-500",
  NO_SHOW: "bg-muted text-muted-foreground",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function StaffAvatar({
  name,
  staffId,
  size = "md",
}: {
  name: string;
  staffId: string;
  size?: "sm" | "md";
}) {
  const color = staffColor(staffId);
  const sz = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs";
  return (
    <div
      className={`${sz} rounded-full ${color.bg} flex items-center justify-center ${color.text} font-bold flex-shrink-0`}
    >
      {initials(name)}
    </div>
  );
}

// Inline SVG sparkline matching dashboard-home.tsx pattern
function HourlySparkline({ data }: { data: number[] }) {
  const W = 120;
  const H = 32;
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min || 1;

  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  const serverNow = new Date();
  const today = serverNow.toISOString().split("T")[0];
  const todayDayOfWeek = serverNow.getDay();

  const todayStart = new Date(serverNow);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  const yesterdayEnd = new Date(todayStart);
  yesterdayEnd.setTime(yesterdayEnd.getTime() - 1);

  const currentTimeStr = serverNow.toTimeString().slice(0, 5);

  const [
    salon,
    todayAppointments,
    upcomingAppts,
    staffOnDuty,
    revenueToday,
    revenueYesterday,
    todayInvoices,
  ] = await Promise.all([
    prisma.salon.findFirst({ select: { name: true, currency: true } }),

    prisma.appointment.findMany({
      where: { date: today },
      orderBy: { startTime: "asc" },
      include: {
        Client: true,
        Staff: true,
        AppointmentService: { include: { Service: true } },
      },
    }),

    prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        OR: [
          { date: { gt: today } },
          { date: today, startTime: { gte: currentTimeStr } },
        ],
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 3,
      include: {
        Client: true,
        Staff: true,
        AppointmentService: { include: { Service: true } },
      },
    }),

    prisma.staff.findMany({
      where: { Shift: { some: { dayOfWeek: todayDayOfWeek } } },
      select: { id: true, name: true },
    }),

    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart } },
    }),

    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
    }),

    prisma.invoice.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { createdAt: true, total: true },
    }),
  ]);

  // Group invoices by hour (0–23) for sparkline
  const hourlyRevenue = Array.from({ length: 24 }, () => 0);
  for (const inv of todayInvoices) {
    const hour = new Date(inv.createdAt).getHours();
    hourlyRevenue[hour] += inv.total;
  }
  // Only chart up to current hour + 1 so future hours don't stretch the line
  const currentHour = serverNow.getHours();
  const sparklineData = hourlyRevenue.slice(0, currentHour + 1);

  const salonName = salon?.name ?? "Your Salon";
  const currency = salon?.currency ?? "USD";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const todayRev = revenueToday._sum.total ?? 0;
  const yesterdayRev = revenueYesterday._sum.total ?? 0;
  const revDelta = todayRev - yesterdayRev;
  const revDeltaPct =
    yesterdayRev > 0
      ? Math.round((revDelta / yesterdayRev) * 100)
      : todayRev > 0
      ? 100
      : 0;

  const hour = serverNow.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dayName = serverNow.toLocaleDateString("en", { weekday: "long" });
  const monthDay = serverNow.toLocaleDateString("en", {
    month: "long",
    day: "numeric",
  });
  const fullDate = `${dayName}, ${monthDay}`;

  return (
    <div className="p-4 space-y-6 pb-24">

      {/* ── 1. Hero ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
        <p className="text-xs text-muted-foreground mb-1">{fullDate}</p>
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {greeting},
          <br />
          <span className="text-primary">{salonName}!</span>
        </h1>
      </div>

      {/* ── 2. Today's Appointments ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Today&apos;s Appointments
          </h2>
          <span className="text-xs text-muted-foreground">
            {todayAppointments.length} total
          </span>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No appointments today
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {todayAppointments.map((appt) => {
              const dot = STATUS_DOT[appt.status] ?? STATUS_DOT.NO_SHOW;
              const services = appt.AppointmentService.map(
                (as) => as.Service.name
              );
              const servicesStr =
                services.length === 0
                  ? "No services"
                  : services.length === 1
                  ? services[0]
                  : `${services[0]} +${services.length - 1}`;

              return (
                <div
                  key={appt.id}
                  className="bg-card border border-border rounded-2xl p-3 flex-shrink-0 w-44 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground tabular-nums bg-secondary px-2 py-0.5 rounded-full">
                      {appt.startTime}
                    </span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  </div>

                  <div className="flex items-center gap-2">
                    <StaffAvatar
                      name={appt.Staff.name}
                      staffId={appt.Staff.id}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {appt.Client?.name ?? "Walk-in"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.Staff.name}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground truncate">
                    {servicesStr}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3. Revenue Ticker ───────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Revenue Today
        </h2>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground tabular-nums">
              {fmt(todayRev)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-xs font-semibold ${
                  revDelta >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {revDelta >= 0 ? "+" : ""}
                {revDeltaPct}%
              </span>
              <span className="text-xs text-muted-foreground">vs yesterday</span>
              <span className="text-xs text-muted-foreground">
                ({fmt(yesterdayRev)})
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-muted-foreground">Hourly</p>
            <HourlySparkline data={sparklineData} />
          </div>
        </div>
      </section>

      {/* ── 4. Staff On Duty ─────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Staff On Duty
          </h2>
          <span className="text-sm font-semibold text-primary">
            {staffOnDuty.length} on duty
          </span>
        </div>

        {staffOnDuty.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">
            No staff scheduled today.
          </p>
        ) : (
          <div className="flex items-center mt-3">
            <div className="flex -space-x-3">
              {staffOnDuty.slice(0, 6).map((s) => {
                const color = staffColor(s.id);
                return (
                  <div
                    key={s.id}
                    title={s.name}
                    className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xs font-bold ring-2 ring-background flex-shrink-0`}
                  >
                    {initials(s.name)}
                  </div>
                );
              })}
              {staffOnDuty.length > 6 && (
                <div className="w-10 h-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background flex-shrink-0">
                  +{staffOnDuty.length - 6}
                </div>
              )}
            </div>
            <div className="ml-4 flex flex-wrap gap-1">
              {staffOnDuty.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full"
                >
                  {s.name.split(" ")[0]}
                </span>
              ))}
              {staffOnDuty.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  & {staffOnDuty.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 5. Next 3 Appointments with Countdown ────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">
          Coming Up
        </h2>

        {upcomingAppts.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No upcoming scheduled appointments.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingAppts.map((appt) => {
              const mins = minutesUntil(appt.date, appt.startTime, serverNow);
              const countdown = formatCountdown(mins);
              const services = appt.AppointmentService.map(
                (as) => as.Service.name
              );
              const pill = STATUS_PILL[appt.status] ?? STATUS_PILL.NO_SHOW;
              const isImminent = mins >= 0 && mins <= 15;

              return (
                <div
                  key={appt.id}
                  className={`bg-card border rounded-2xl p-4 flex items-center gap-3 ${
                    isImminent
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border"
                  }`}
                >
                  {/* Time + date */}
                  <div className="flex-shrink-0 text-center min-w-[52px]">
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {appt.startTime}
                    </p>
                    {appt.date !== today && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(appt.date + "T00:00:00").toLocaleDateString(
                          "en",
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    )}
                  </div>

                  {/* Staff avatar */}
                  <StaffAvatar
                    name={appt.Staff.name}
                    staffId={appt.Staff.id}
                    size="sm"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {appt.Client?.name ?? "Walk-in"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {services.length > 0
                        ? services.slice(0, 2).join(", ") +
                          (services.length > 2
                            ? ` +${services.length - 2}`
                            : "")
                        : "No services"}{" "}
                      &middot; {appt.Staff.name}
                    </p>
                  </div>

                  {/* Countdown badge */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        mins <= 0
                          ? "bg-rose-500/15 text-rose-500"
                          : isImminent
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {countdown}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${pill}`}>
                      {appt.status.charAt(0) +
                        appt.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 6. Today's Tasks ─────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-4">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Today&apos;s Tasks
        </h2>
        <TodayTasks />
      </section>
    </div>
  );
}

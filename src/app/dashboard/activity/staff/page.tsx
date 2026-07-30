import { prisma } from "@/lib/prisma";
import { Users, CalendarDays, DollarSign, XCircle, Activity } from "lucide-react";
import Link from "next/link";
import { StaffSelector } from "./staff-selector";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

type PeriodKey = "today" | "week" | "month";

interface PageProps {
  searchParams: Promise<{
    staffId?: string;
    period?: string;
  }>;
}

// ── Date range helpers ────────────────────────────────────────────────────────

function getPeriodRange(period: PeriodKey): {
  startDate: string;
  endDate: string;
  startDateTime: Date;
} {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (period === "today") {
    return {
      startDate: today,
      endDate: today,
      startDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    };
  }

  if (period === "week") {
    const weekStart = new Date(now);
    const day = now.getDay();
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    return {
      startDate: weekStart.toISOString().split("T")[0],
      endDate: today,
      startDateTime: weekStart,
    };
  }

  // month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: monthStart.toISOString().split("T")[0],
    endDate: today,
    startDateTime: monthStart,
  };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  SCHEDULED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CANCELLED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  NO_SHOW:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StaffActivityPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const rawPeriod = sp.period ?? "week";
  const period: PeriodKey = ["today", "week", "month"].includes(rawPeriod)
    ? (rawPeriod as PeriodKey)
    : "week";

  const { startDate, endDate, startDateTime } = getPeriodRange(period);

  // Load all staff for the selector
  const allStaff = await prisma.staff.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const selectedStaffId = sp.staffId ?? allStaff[0]?.id ?? null;

  // Fetch appointments for the selected staff in the period
  const [staffAppointments, salon] = await Promise.all([
    selectedStaffId
      ? prisma.appointment.findMany({
          where: {
            staffId: selectedStaffId,
            date: { gte: startDate, lte: endDate },
          },
          orderBy: [{ date: "desc" }, { startTime: "desc" }],
          include: {
            Client: { select: { id: true, name: true } },
            AppointmentService: { select: { Service: { select: { name: true } } } },
            Invoice: { select: { total: true, status: true } },
          },
        })
      : Promise.resolve([]),
    prisma.salon.findFirst({ select: { currency: true } }),
  ]);

  const currency = salon?.currency ?? "USD";
  const currSymbol = currency === "USD" ? "$" : currency;

  // Compute stats
  const completed = staffAppointments.filter((a) => a.status === "COMPLETED");
  const cancelled = staffAppointments.filter((a) => a.status === "CANCELLED");
  const noShows = staffAppointments.filter((a) => a.status === "NO_SHOW");
  const revenue = staffAppointments.reduce((sum, a) => sum + a.totalAmount, 0);

  const selectedStaff = allStaff.find((s) => s.id === selectedStaffId);

  // URL builder
  function buildUrl(params: { staffId?: string; period?: string }) {
    const merged: Record<string, string> = {};
    if (selectedStaffId) merged.staffId = selectedStaffId;
    if (period !== "week") merged.period = period;
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) merged[k] = v;
      else delete merged[k];
    });
    const qs = new URLSearchParams(merged).toString();
    return `/dashboard/activity/staff${qs ? `?${qs}` : ""}`;
  }

  const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
  ];

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 flex-wrap justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Staff Activity Report
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Appointments, revenue, and performance by staff member
          </p>
        </div>
        <Link
          href="/dashboard/activity"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/40 text-sm font-semibold text-foreground transition-colors"
        >
          <Activity className="w-4 h-4" />
          Activity Log
        </Link>
      </div>

      {/* ─── Controls ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Staff selector */}
        <StaffSelector
          allStaff={allStaff}
          selectedStaffId={selectedStaffId ?? ""}
          period={period !== "week" ? period : undefined}
        />

        {/* Period filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 w-fit">
          {PERIOD_OPTIONS.map(({ key, label }) => (
            <Link
              key={key}
              href={buildUrl({ period: key })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Stats ──────────────────────────────────────────────────── */}
      {selectedStaff && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
              {selectedStaff.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{selectedStaff.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(new Date(startDate))} —{" "}
                {formatDate(new Date(endDate))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={<CalendarDays className="w-4 h-4 text-blue-500" />}
              label="Total Appointments"
              value={staffAppointments.length}
              bg="bg-blue-500/10"
            />
            <StatCard
              icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
              label="Revenue"
              value={`${currSymbol}${revenue.toFixed(2)}`}
              bg="bg-emerald-500/10"
            />
            <StatCard
              icon={<XCircle className="w-4 h-4 text-red-500" />}
              label="Cancellations"
              value={cancelled.length}
              bg="bg-red-500/10"
            />
            <StatCard
              icon={<Users className="w-4 h-4 text-amber-500" />}
              label="No-shows"
              value={noShows.length}
              bg="bg-amber-500/10"
            />
          </div>
        </div>
      )}

      {/* ─── Appointments table ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Appointments ({staffAppointments.length})
        </h2>

        {staffAppointments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No appointments found for this period.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Date / Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                    Services
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffAppointments.map((appt) => {
                  const serviceNames = appt.AppointmentService.map(
                    (as) => as.Service.name
                  ).join(", ");
                  return (
                    <tr
                      key={appt.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{appt.date}</p>
                        <p className="text-xs text-muted-foreground">
                          {appt.startTime}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {appt.Client ? (
                          <Link
                            href={`/dashboard/clients/${appt.Client.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {appt.Client.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Walk-in
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell max-w-[180px] truncate">
                        {serviceNames || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums hidden md:table-cell">
                        {appt.totalAmount > 0
                          ? `${currSymbol}${appt.totalAmount.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`${bg} p-2 rounded-xl flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

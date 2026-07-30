import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ArrowLeft,
  Umbrella,
  Clock,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { ApprovalActions } from "./approval-actions";
import { CancelLeaveButton } from "./cancel-leave-button";
import { AllowancesWidget } from "./allowances-widget";
import { RequestTimeOffButton } from "./request-time-off-button";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  const [, m, d] = s.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function dayCount(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DOT_COLORS = [
  "bg-[#4ade80]",
  "bg-[#60a5fa]",
  "bg-[#f472b6]",
  "bg-[#fb923c]",
  "bg-[#a78bfa]",
  "bg-[#34d399]",
  "bg-[#fbbf24]",
  "bg-[#f87171]",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffTimeOffPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const next7 = new Date(today);
  next7.setDate(next7.getDate() + 7);
  const next7Str = toDateStr(next7);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthStartStr = toDateStr(monthStart);
  const monthEndStr = toDateStr(monthEnd);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const allTimeOff = await prisma.timeOff.findMany({
    include: { Staff: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const allStaff = await prisma.staff.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const pendingRequests = allTimeOff.filter((r) => !r.approved);
  const approvedRecords = allTimeOff.filter((r) => r.approved);

  // Conflict counts per pending request
  const conflictMap: Record<string, number> = {};
  await Promise.all(
    pendingRequests.map(async (req) => {
      const count = await prisma.appointment.count({
        where: {
          staffId: req.staffId,
          status: "SCHEDULED",
          date: { gte: req.startDate, lte: req.endDate },
        },
      });
      conflictMap[req.id] = count;
    })
  );

  // ── Stats ───────────────────────────────────────────────────────────────────
  const pendingCount = pendingRequests.length;
  const approvedThisMonth = approvedRecords.filter(
    (r) => r.startDate <= monthEndStr && r.endDate >= monthStartStr
  ).length;
  const staffOnLeaveToday = approvedRecords.filter(
    (r) => r.startDate <= todayStr && r.endDate >= todayStr
  );
  const upcomingLeave = approvedRecords.filter(
    (r) => r.startDate > todayStr && r.startDate <= next7Str
  );

  // ── Calendar build ──────────────────────────────────────────────────────────
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();

  const staffColorMap: Record<string, string> = {};
  allStaff.forEach((s, i) => {
    staffColorMap[s.id] = DOT_COLORS[i % DOT_COLORS.length];
  });

  const dayLeaveMap: Record<
    number,
    { staffId: string; name: string; reason?: string | null; startDate: string; endDate: string }[]
  > = {};
  for (const rec of approvedRecords) {
    if (rec.startDate > monthEndStr || rec.endDate < monthStartStr) continue;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(new Date(year, month, d));
      if (dateStr >= rec.startDate && dateStr <= rec.endDate) {
        if (!dayLeaveMap[d]) dayLeaveMap[d] = [];
        dayLeaveMap[d].push({
          staffId: rec.staffId,
          name: rec.Staff.name,
          reason: rec.reason,
          startDate: rec.startDate,
          endDate: rec.endDate,
        });
      }
    }
  }

  // ── Allowances ──────────────────────────────────────────────────────────────
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  let allowances: Record<string, { allowedDays: number; usedDays: number }> = {};
  if (salon?.businessHours) {
    try {
      const parsed = JSON.parse(salon.businessHours);
      allowances = parsed.__timeOffAllowances ?? {};
    } catch {/* ignore */}
  }

  const usedDaysMap: Record<string, number> = {};
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  for (const rec of approvedRecords) {
    if (rec.startDate >= yearStart && rec.startDate <= yearEnd) {
      usedDaysMap[rec.staffId] =
        (usedDaysMap[rec.staffId] ?? 0) + dayCount(rec.startDate, rec.endDate);
    }
  }

  const monthName = monthStart.toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });

  const upcomingApproved = approvedRecords
    .filter((r) => r.endDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="p-6 md:p-8">
      {/* Back */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Staff
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Umbrella className="w-6 h-6 text-primary" />
            Time Off
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Approve requests, track leave, and manage allowances
          </p>
        </div>
        <RequestTimeOffButton staff={allStaff} />
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">requests</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Approved this month</p>
          <p className="text-2xl font-bold text-green-500">{approvedThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-0.5">records</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">On leave today</p>
          <p className="text-2xl font-bold text-primary">{staffOnLeaveToday.length}</p>
          {staffOnLeaveToday.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {staffOnLeaveToday.map((r) => r.Staff.name.split(" ")[0]).join(", ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">None</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Upcoming (7 days)</p>
          <p className="text-2xl font-bold text-blue-400">{upcomingLeave.length}</p>
          {upcomingLeave.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {upcomingLeave.map((r) => r.Staff.name.split(" ")[0]).join(", ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">None</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* ── Pending Requests ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <h2 className="text-base font-semibold text-foreground">Pending Requests</h2>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center text-[11px] font-bold leading-none bg-amber-500 text-white rounded-full min-w-[20px] h-5 px-1.5">
                  {pendingCount}
                </span>
              )}
            </div>

            {pendingCount === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2.5 opacity-40" />
                <p className="text-sm text-muted-foreground">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const conflicts = conflictMap[req.id] ?? 0;
                  const days = dayCount(req.startDate, req.endDate);
                  const initials = req.Staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={req.id}
                      className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400 font-bold text-sm">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                              {req.Staff.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateRange(req.startDate, req.endDate)}
                              {" · "}
                              <span className="font-medium text-foreground">
                                {days} day{days !== 1 ? "s" : ""}
                              </span>
                            </p>
                            {req.reason && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">
                                &ldquo;{req.reason}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        <ApprovalActions
                          id={req.id}
                          conflicts={conflicts}
                          staffName={req.Staff.name}
                          timeOffId={req.id}
                          startDate={req.startDate}
                          endDate={req.endDate}
                          staffId={req.staffId}
                        />
                      </div>

                      {conflicts > 0 && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                              Has {conflicts} appointment
                              {conflicts !== 1 ? "s" : ""} during this period — reassignment needed
                            </p>
                            <Link
                              href={`/dashboard/appointments?staffId=${req.staffId}&from=${req.startDate}&to=${req.endDate}`}
                              className="text-xs text-red-500 hover:underline mt-0.5 inline-block"
                            >
                              View conflicting appointments →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Approved Upcoming Leave ───────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Approved Upcoming Leave
              </h2>
            </div>

            {upcomingApproved.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">No upcoming approved leave</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingApproved.map((rec) => {
                  const days = dayCount(rec.startDate, rec.endDate);
                  const initials = rec.Staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const isOngoing = rec.startDate <= todayStr && rec.endDate >= todayStr;
                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 text-green-600 dark:text-green-400 font-bold text-xs">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {rec.Staff.name}
                          </p>
                          {isOngoing && (
                            <span className="text-[10px] font-bold bg-green-500 text-white rounded-full px-1.5 py-0.5 flex-shrink-0">
                              On leave
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateRange(rec.startDate, rec.endDate)}
                          {" · "}
                          <span className="font-medium">{days}d</span>
                        </p>
                      </div>
                      <CancelLeaveButton id={rec.id} staffName={rec.Staff.name} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Calendar ─────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Calendar — {monthName}
              </h2>
              <span className="text-xs text-muted-foreground">
                {
                  approvedRecords.filter(
                    (r) => r.startDate <= monthEndStr && r.endDate >= monthStartStr
                  ).length
                }{" "}
                record
                {approvedRecords.filter(
                  (r) => r.startDate <= monthEndStr && r.endDate >= monthStartStr
                ).length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[11px] font-semibold text-muted-foreground bg-secondary/30"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`blank-${i}`}
                    className="min-h-[72px] border-r border-b border-border/50 bg-secondary/10"
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const isToday =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  const leavers = dayLeaveMap[day] ?? [];
                  const hasLeave = leavers.length > 0;
                  const col = (firstDayOfWeek + idx) % 7;
                  const isLastInRow = col === 6;

                  return (
                    <div
                      key={day}
                      className={`min-h-[72px] p-1.5 border-b border-border/50 flex flex-col gap-1 transition-colors ${
                        !isLastInRow ? "border-r border-border/50" : ""
                      } ${hasLeave ? "bg-primary/5" : ""}`}
                    >
                      <span
                        className={`text-xs font-semibold self-end w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </span>

                      {leavers.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                          {leavers.slice(0, 3).map((l) => (
                            <div
                              key={l.staffId}
                              className="flex items-center gap-1"
                              title={`${l.name}: ${formatDateRange(l.startDate, l.endDate)}${l.reason ? ` — ${l.reason}` : ""}`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  staffColorMap[l.staffId] ?? "bg-red-500"
                                }`}
                              />
                              <span className="text-[9px] text-muted-foreground truncate leading-tight">
                                {l.name.split(" ")[0]}
                              </span>
                            </div>
                          ))}
                          {leavers.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{leavers.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {(() => {
                  const totalCells = firstDayOfWeek + daysInMonth;
                  const remainder = totalCells % 7;
                  const trailing = remainder === 0 ? 0 : 7 - remainder;
                  return Array.from({ length: trailing }).map((_, i) => (
                    <div
                      key={`trail-${i}`}
                      className="min-h-[72px] border-r border-b border-border/50 bg-secondary/10 last:border-r-0"
                    />
                  ));
                })()}
              </div>
            </div>

            {allStaff.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {allStaff.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${staffColorMap[s.id] ?? "bg-muted"}`}
                    />
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Sidebar: Allowances widget ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Leave Allowances</h2>
          </div>
          <AllowancesWidget
            staff={allStaff}
            allowances={allowances}
            usedDaysMap={usedDaysMap}
          />
        </div>
      </div>
    </div>
  );
}

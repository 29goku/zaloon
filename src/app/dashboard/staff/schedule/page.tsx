import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Info, Users, Clock, UserX } from "lucide-react";
import { ShiftCellPopover } from "@/components/staff/shift-cell-popover";
import { ScheduleBulkTools } from "@/components/staff/schedule-bulk-tools";

export const dynamic = "force-dynamic";

// ─── Constants ────────────────────────────────────────────────────────────────

// Columns are Mon(0) … Sun(6) for display
const DAYS = [
  { label: "Mon", dayOfWeek: 1 },
  { label: "Tue", dayOfWeek: 2 },
  { label: "Wed", dayOfWeek: 3 },
  { label: "Thu", dayOfWeek: 4 },
  { label: "Fri", dayOfWeek: 5 },
  { label: "Sat", dayOfWeek: 6 },
  { label: "Sun", dayOfWeek: 0 },
];

// Deterministic color palette per staff row
const STAFF_COLORS = [
  { bg: "bg-[#4ade80]/15", text: "text-[#16a34a] dark:text-[#4ade80]", border: "border-[#4ade80]/40", dot: "bg-[#4ade80]" },
  { bg: "bg-[#60a5fa]/15", text: "text-[#2563eb] dark:text-[#60a5fa]", border: "border-[#60a5fa]/40", dot: "bg-[#60a5fa]" },
  { bg: "bg-[#f472b6]/15", text: "text-[#be185d] dark:text-[#f472b6]", border: "border-[#f472b6]/40", dot: "bg-[#f472b6]" },
  { bg: "bg-[#fb923c]/15", text: "text-[#c2410c] dark:text-[#fb923c]", border: "border-[#fb923c]/40", dot: "bg-[#fb923c]" },
  { bg: "bg-[#a78bfa]/15", text: "text-[#7c3aed] dark:text-[#a78bfa]", border: "border-[#a78bfa]/40", dot: "bg-[#a78bfa]" },
  { bg: "bg-[#34d399]/15", text: "text-[#059669] dark:text-[#34d399]", border: "border-[#34d399]/40", dot: "bg-[#34d399]" },
  { bg: "bg-[#fbbf24]/15", text: "text-[#b45309] dark:text-[#fbbf24]", border: "border-[#fbbf24]/40", dot: "bg-[#fbbf24]" },
  { bg: "bg-[#f87171]/15", text: "text-[#b91c1c] dark:text-[#f87171]", border: "border-[#f87171]/40", dot: "bg-[#f87171]" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffSchedulePage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayJsDay = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const todayColIndex = todayJsDay === 0 ? 6 : todayJsDay - 1;

  const allStaff = await prisma.staff.findMany({
    include: {
      Shift: true,
      Appointment: {
        where: { date: todayStr },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  // "On duty today": staff who have a shift on today's dayOfWeek
  const staffOnDutyToday = allStaff.filter((s) =>
    s.Shift.some((sh) => sh.dayOfWeek === todayJsDay)
  ).length;

  // Total staff hours this week = sum of all shift durations across all staff
  let totalWeeklyHours = 0;
  for (const staff of allStaff) {
    for (const shift of staff.Shift) {
      totalWeeklyHours += parseHours(shift.startTime, shift.endTime);
    }
  }

  // Staff with no shifts assigned
  const staffWithNoShifts = allStaff.filter((s) => s.Shift.length === 0).length;

  // ── Appointment counts per staff per day (for the current week) ────────────
  // Get the week's monday date
  const monday = new Date(today);
  const offset = todayJsDay === 0 ? -6 : 1 - todayJsDay;
  monday.setDate(today.getDate() + offset);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split("T")[0]);
  }

  // Map dayOfWeek → date string for this week
  // weekDates[0] = monday = dayOfWeek 1, ..., weekDates[6] = sunday = dayOfWeek 0
  const dayOfWeekToDate: Record<number, string> = {
    1: weekDates[0],
    2: weekDates[1],
    3: weekDates[2],
    4: weekDates[3],
    5: weekDates[4],
    6: weekDates[5],
    0: weekDates[6],
  };

  // Fetch appointment counts for each staff on each day of this week
  const apptRecords = await prisma.appointment.groupBy({
    by: ["staffId", "date"],
    where: {
      staffId: { in: allStaff.map((s) => s.id) },
      date: { in: weekDates },
    },
    _count: { id: true },
  });

  // Build map: staffId → dayOfWeek → count
  const apptMap: Record<string, Record<number, number>> = {};
  for (const rec of apptRecords) {
    if (!apptMap[rec.staffId]) apptMap[rec.staffId] = {};
    // find dayOfWeek for this date
    const dow = Object.entries(dayOfWeekToDate).find(
      ([, d]) => d === rec.date
    )?.[0];
    if (dow !== undefined) {
      apptMap[rec.staffId][Number(dow)] = rec._count.id;
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Back link */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Staff
        </Link>
      </div>

      {/* Header row */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Click any cell to edit that day&rsquo;s shift
          </p>
        </div>

        {/* Bulk tools — only render when there is staff */}
        {allStaff.length > 0 && <ScheduleBulkTools />}
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {allStaff.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{staffOnDutyToday}</p>
              <p className="text-xs text-muted-foreground">On duty today</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalWeeklyHours % 1 === 0
                  ? totalWeeklyHours
                  : totalWeeklyHours.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
              </p>
              <p className="text-xs text-muted-foreground">Total hours this week</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <UserX className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{staffWithNoShifts}</p>
              <p className="text-xs text-muted-foreground">No shifts assigned</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      {allStaff.length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/dashboard/staff/time-off"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 hover:bg-secondary/40 transition-colors"
          >
            View time-off requests
          </Link>
          <Link
            href="/dashboard/staff/availability"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 hover:bg-secondary/40 transition-colors"
          >
            Availability calendar
          </Link>
        </div>
      )}

      {/* Info tip */}
      {allStaff.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 mb-5 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary/70" />
          <span>
            Shifts shown are recurring weekly defaults. Appointment badges show this week&rsquo;s bookings.{" "}
            <Link
              href="/dashboard/staff/availability"
              className="text-primary hover:underline"
            >
              View availability calendar
            </Link>{" "}
            to see time-off overlays.
          </span>
        </div>
      )}

      {allStaff.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">No staff members yet.</p>
          <Link
            href="/dashboard/staff"
            className="text-primary text-sm mt-2 inline-block hover:underline"
          >
            Add staff members
          </Link>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-10 text-left px-5 py-3 text-xs font-semibold text-muted-foreground w-40 bg-secondary/30 whitespace-nowrap">
                    Staff
                  </th>
                  {DAYS.map(({ label, dayOfWeek }, colIdx) => (
                    <th
                      key={label}
                      className={`px-2 py-3 text-xs font-semibold text-center min-w-[88px] ${
                        colIdx === todayColIndex
                          ? "text-primary bg-primary/8"
                          : "text-muted-foreground bg-secondary/30"
                      }`}
                    >
                      {label}
                      {colIdx === todayColIndex && (
                        <span className="block text-[10px] font-normal opacity-70">
                          Today
                        </span>
                      )}
                      {/* Total appointments column summary */}
                      {(() => {
                        const dayTotal = allStaff.reduce((sum, s) => {
                          return sum + (apptMap[s.id]?.[dayOfWeek] ?? 0);
                        }, 0);
                        return dayTotal > 0 ? (
                          <span className="block text-[10px] font-normal text-muted-foreground/70">
                            {dayTotal} appt{dayTotal !== 1 ? "s" : ""}
                          </span>
                        ) : null;
                      })()}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {allStaff.map((staff, staffIdx) => {
                  const color = STAFF_COLORS[staffIdx % STAFF_COLORS.length];

                  // Map dayOfWeek → shift
                  const shiftByDay: Record<
                    number,
                    { id: string; startTime: string; endTime: string } | undefined
                  > = {};
                  for (const shift of staff.Shift) {
                    shiftByDay[shift.dayOfWeek] = {
                      id: shift.id,
                      startTime: shift.startTime,
                      endTime: shift.endTime,
                    };
                  }

                  // Today's appointment count for this staff
                  const todayApptCount = staff.Appointment.length;

                  return (
                    <tr
                      key={staff.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/10 transition-colors"
                    >
                      {/* Staff name */}
                      <td className="sticky left-0 z-10 bg-card px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/dashboard/staff/${staff.id}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`}
                          />
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">
                            {staff.name}
                          </span>
                        </Link>
                        {/* Today's appointment count badge under name */}
                        {todayApptCount > 0 && (
                          <span className="ml-5 text-[10px] text-muted-foreground">
                            {todayApptCount} today
                          </span>
                        )}
                      </td>

                      {/* Day cells */}
                      {DAYS.map(({ label, dayOfWeek }, colIdx) => {
                        const shift = shiftByDay[dayOfWeek];
                        const isToday = colIdx === todayColIndex;
                        const apptCount = apptMap[staff.id]?.[dayOfWeek] ?? 0;

                        return (
                          <td
                            key={dayOfWeek}
                            className={`px-2 py-2 text-center relative ${
                              isToday ? "bg-primary/5" : ""
                            }`}
                          >
                            <ShiftCellPopover
                              staffId={staff.id}
                              dayOfWeek={dayOfWeek}
                              dayLabel={label}
                              currentShift={
                                shift
                                  ? { startTime: shift.startTime, endTime: shift.endTime }
                                  : null
                              }
                              colorBg={color.bg}
                              colorText={color.text}
                              colorBorder={color.border}
                              isToday={isToday}
                            />
                            {/* Appointment count badge on working cells */}
                            {shift && apptCount > 0 && (
                              <span className="absolute top-1 right-1 text-[9px] font-bold leading-none bg-primary/15 text-primary rounded-full px-1 py-0.5 pointer-events-none">
                                {apptCount} appt{apptCount !== 1 ? "s" : ""}
                              </span>
                            )}
                            {/* Show shift hours summary under the cell */}
                            {shift && (
                              <span className="block text-[9px] text-muted-foreground/60 mt-0.5">
                                {fmt12(shift.startTime)}–{fmt12(shift.endTime)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Staff color legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {allStaff.map((staff, idx) => {
              const color = STAFF_COLORS[idx % STAFF_COLORS.length];
              return (
                <div key={staff.id} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                  <span className="text-xs text-muted-foreground">
                    {staff.name}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

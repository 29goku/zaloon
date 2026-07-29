import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffSchedulePage() {
  const allStaff = await prisma.staff.findMany({
    include: { Shift: true },
    orderBy: { name: "asc" },
  });

  // Today's column index in Mon-Sun display (0=Mon…6=Sun)
  const todayJsDay = new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
  const todayColIndex = todayJsDay === 0 ? 6 : todayJsDay - 1;

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

      {/* Info tip */}
      {allStaff.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 mb-5 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary/70" />
          <span>
            Shifts shown are recurring weekly defaults.{" "}
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
                  {DAYS.map(({ label }, colIdx) => (
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
                    { startTime: string; endTime: string } | undefined
                  > = {};
                  for (const shift of staff.Shift) {
                    shiftByDay[shift.dayOfWeek] = {
                      startTime: shift.startTime,
                      endTime: shift.endTime,
                    };
                  }

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
                      </td>

                      {/* Day cells */}
                      {DAYS.map(({ label, dayOfWeek }, colIdx) => {
                        const shift = shiftByDay[dayOfWeek];
                        const isToday = colIdx === todayColIndex;

                        return (
                          <td
                            key={dayOfWeek}
                            className={`px-2 py-2 text-center ${
                              isToday ? "bg-primary/5" : ""
                            }`}
                          >
                            <ShiftCellPopover
                              staffId={staff.id}
                              dayOfWeek={dayOfWeek}
                              dayLabel={label}
                              currentShift={shift ?? null}
                              colorBg={color.bg}
                              colorText={color.text}
                              colorBorder={color.border}
                              isToday={isToday}
                            />
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

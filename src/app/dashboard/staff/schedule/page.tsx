import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Map prisma dayOfWeek (0=Sun…6=Sat) to Mon-Sun column index (0=Mon…6=Sun)
function shiftDayToColIndex(dayOfWeek: number): number {
  // dayOfWeek: 0=Sun → col 6, 1=Mon → col 0, …, 6=Sat → col 5
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

// Deterministic color palette for staff rows
const STAFF_COLORS = [
  { bg: "bg-[#4ade80]/15", text: "text-[#16a34a]", border: "border-[#4ade80]/40", dot: "bg-[#4ade80]" },
  { bg: "bg-[#60a5fa]/15", text: "text-[#2563eb]", border: "border-[#60a5fa]/40", dot: "bg-[#60a5fa]" },
  { bg: "bg-[#f472b6]/15", text: "text-[#be185d]", border: "border-[#f472b6]/40", dot: "bg-[#f472b6]" },
  { bg: "bg-[#fb923c]/15", text: "text-[#c2410c]", border: "border-[#fb923c]/40", dot: "bg-[#fb923c]" },
  { bg: "bg-[#a78bfa]/15", text: "text-[#7c3aed]", border: "border-[#a78bfa]/40", dot: "bg-[#a78bfa]" },
  { bg: "bg-[#34d399]/15", text: "text-[#059669]", border: "border-[#34d399]/40", dot: "bg-[#34d399]" },
  { bg: "bg-[#fbbf24]/15", text: "text-[#b45309]", border: "border-[#fbbf24]/40", dot: "bg-[#fbbf24]" },
  { bg: "bg-[#f87171]/15", text: "text-[#b91c1c]", border: "border-[#f87171]/40", dot: "bg-[#f87171]" },
];

export default async function StaffSchedulePage() {
  const allStaff = await prisma.staff.findMany({
    include: { Shift: true },
    orderBy: { name: "asc" },
  });

  // Today's Mon-Sun column index
  const todayJsDay = new Date().getDay(); // 0=Sun
  const todayColIndex = todayJsDay === 0 ? 6 : todayJsDay - 1;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Staff
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Staff Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">Weekly shift overview for all staff</p>
      </div>

      {allStaff.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">No staff members yet.</p>
          <Link href="/dashboard/staff" className="text-primary text-sm mt-2 inline-block hover:underline">
            Add staff members
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                {/* Staff name column header */}
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground w-40 bg-secondary/30">
                  Staff
                </th>
                {DAYS.map((day, i) => (
                  <th
                    key={day}
                    className={`px-3 py-3 text-xs font-semibold text-center ${
                      i === todayColIndex
                        ? "text-primary bg-primary/8"
                        : "text-muted-foreground bg-secondary/30"
                    }`}
                  >
                    {day}
                    {i === todayColIndex && (
                      <span className="block text-[10px] font-normal opacity-70">Today</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStaff.map((staff, staffIdx) => {
                const color = STAFF_COLORS[staffIdx % STAFF_COLORS.length];
                // Build a map: colIndex (0=Mon…6=Sun) -> shift
                const shiftByCol: Record<number, { startTime: string; endTime: string } | undefined> = {};
                for (const shift of staff.Shift) {
                  shiftByCol[shiftDayToColIndex(shift.dayOfWeek)] = {
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                  };
                }

                return (
                  <tr
                    key={staff.id}
                    className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors`}
                  >
                    {/* Staff name cell */}
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/staff/${staff.id}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} />
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">
                          {staff.name}
                        </span>
                      </Link>
                    </td>

                    {/* Day cells */}
                    {DAYS.map((day, colIdx) => {
                      const shift = shiftByCol[colIdx];
                      const isToday = colIdx === todayColIndex;
                      return (
                        <td
                          key={day}
                          className={`px-2 py-3 text-center ${isToday ? "bg-primary/5" : ""}`}
                        >
                          {shift ? (
                            <span
                              className={`inline-flex flex-col items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-medium leading-tight ${color.bg} ${color.text} border ${color.border}`}
                            >
                              <span>{shift.startTime}</span>
                              <span className="opacity-60">–</span>
                              <span>{shift.endTime}</span>
                            </span>
                          ) : (
                            <span className="inline-block rounded-lg px-2 py-1 text-[11px] text-muted-foreground bg-secondary/40">
                              Day Off
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
      )}

      {/* Color legend */}
      {allStaff.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {allStaff.map((staff, idx) => {
            const color = STAFF_COLORS[idx % STAFF_COLORS.length];
            return (
              <div key={staff.id} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                <span className="text-xs text-muted-foreground">{staff.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

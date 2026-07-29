import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalActions } from "./approval-actions";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function shortDate(str: string): string {
  // "YYYY-MM-DD" → "MM/DD"
  return str.slice(5).replace("-", "/");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffAvailabilityPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 30-day range strings
  const days: string[] = Array.from({ length: 30 }, (_, i) =>
    toDateStr(addDays(today, i))
  );
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  const allStaff = await prisma.staff.findMany({
    include: {
      Shift: true,
      TimeOff: {
        where: {
          // Include time-off that overlaps with our 30-day window
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        },
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // All pending time-off requests (not limited to 30-day window, for manager review)
  const pendingRequests = await prisma.timeOff.findMany({
    where: { approved: false },
    include: { Staff: { select: { id: true, name: true } } },
    orderBy: { startDate: "asc" },
  });

  // ── Build cell status for each staff × day ─────────────────────────────────
  // status: "available" | "time-off" | "day-off"

  type CellStatus = "available" | "time-off" | "day-off";

  function getCellStatus(
    staff: (typeof allStaff)[number],
    dateStr: string
  ): CellStatus {
    // Check approved time-off first
    const onTimeOff = staff.TimeOff.some(
      (t) => t.approved && t.startDate <= dateStr && t.endDate >= dateStr
    );
    if (onTimeOff) return "time-off";

    // Check if staff has a shift on this day-of-week
    const [y, m, d] = dateStr.split("-").map(Number);
    const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun
    const hasShift = staff.Shift.some((s) => s.dayOfWeek === jsDay);
    if (!hasShift) return "day-off";

    return "available";
  }

  const cellClass: Record<CellStatus, string> = {
    available: "bg-green-500/20 text-green-700 dark:text-green-400",
    "time-off": "bg-red-500/20 text-red-700 dark:text-red-400",
    "day-off": "bg-secondary/50 text-muted-foreground",
  };

  const cellLabel: Record<CellStatus, string> = {
    available: "✓",
    "time-off": "Off",
    "day-off": "—",
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Staff
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Staff Availability</h1>
        <p className="text-muted-foreground text-sm mt-1">
          30-day overview — {shortDate(rangeStart)} to {shortDate(rangeEnd)}
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/30 inline-block" />
          <span className="text-xs text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30 inline-block" />
          <span className="text-xs text-muted-foreground">Time off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-secondary/50 border border-border inline-block" />
          <span className="text-xs text-muted-foreground">Day off (no shift)</span>
        </div>
      </div>

      {/* Calendar grid */}
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
        <Card className="bg-card border-border mb-8">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  {/* Staff name header */}
                  <th className="sticky left-0 z-10 bg-secondary/40 text-left px-4 py-3 font-semibold text-muted-foreground min-w-[120px] whitespace-nowrap">
                    Staff
                  </th>
                  {days.map((d) => {
                    const isToday = d === toDateStr(today);
                    const [, , dd] = d.split("-");
                    const jsDay = new Date(d + "T00:00:00").getDay();
                    const dayAbbr = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][jsDay];
                    return (
                      <th
                        key={d}
                        className={`px-1 py-2 text-center font-medium w-10 ${
                          isToday
                            ? "text-primary bg-primary/8"
                            : "text-muted-foreground bg-secondary/40"
                        }`}
                      >
                        <div>{dayAbbr}</div>
                        <div className={isToday ? "font-bold text-primary" : ""}>{dd}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {allStaff.map((staff, idx) => (
                  <tr
                    key={staff.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/10 transition-colors"
                  >
                    {/* Staff name */}
                    <td className="sticky left-0 z-10 bg-card px-4 py-2 font-semibold text-foreground text-sm whitespace-nowrap">
                      <Link
                        href={`/dashboard/staff/${staff.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {staff.name}
                      </Link>
                    </td>
                    {/* Day cells */}
                    {days.map((d) => {
                      const status = getCellStatus(staff, d);
                      const isToday = d === toDateStr(today);
                      return (
                        <td
                          key={d}
                          className={`p-0.5 text-center ${isToday ? "ring-1 ring-inset ring-primary/30" : ""}`}
                        >
                          <span
                            className={`inline-flex items-center justify-center w-8 h-7 rounded text-[10px] font-medium ${cellClass[status]}`}
                            title={status === "time-off" ? "Approved time off" : status === "day-off" ? "No shift" : "Available"}
                          >
                            {cellLabel[status]}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Pending approvals */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            Pending Time-Off Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5">
                {pendingRequests.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {req.Staff.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {req.startDate === req.endDate
                          ? req.startDate
                          : `${req.startDate} – ${req.endDate}`}
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {req.reason}
                      </p>
                    )}
                  </div>
                  <ApprovalActions id={req.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

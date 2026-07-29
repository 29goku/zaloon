import { prisma } from "@/lib/prisma";
import { Clock } from "lucide-react";
import { ClockInWidget } from "@/components/staff/clock-in-widget";
import { TimeclockReports } from "@/components/staff/timeclock-reports";
import { getClockStatus, getTimeSummary } from "@/app/actions/timetracking";

export const dynamic = "force-dynamic";

interface TimeclockPageProps {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}

export default async function TimeclockPage({ searchParams }: TimeclockPageProps) {
  const { tab, from, to } = await searchParams;
  const isReports = tab === "reports";

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const staff = await prisma.staff.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Fetch clock status for all staff in parallel
  const statusList = await Promise.all(
    staff.map((s) => getClockStatus(s.id))
  );

  const clockedInCount = statusList.filter((s) => s.isClockedIn).length;
  const totalMinutesToday = statusList
    .filter((s) => s.isClockedIn)
    .reduce((sum, s) => sum + (s.minutesWorked ?? 0), 0);
  const totalHoursToday = (totalMinutesToday / 60).toFixed(1);

  // Reports tab: compute summary
  let summary: Awaited<ReturnType<typeof getTimeSummary>> = [];
  let fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (isReports) {
    if (from) fromDate = new Date(from);
    if (to) toDate = new Date(to);
    summary = await getTimeSummary(fromDate, toDate);
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            Time Clock
          </h1>
          <p className="text-muted-foreground mt-1">
            {todayStr} &mdash;{" "}
            {today.toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-1">
          <a
            href="/dashboard/staff/timeclock"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              !isReports
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Clock
          </a>
          <a
            href="/dashboard/staff/timeclock?tab=reports"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isReports
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Time Reports
          </a>
        </div>
      </div>

      {!isReports && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Staff clocked in</p>
              <p className="text-3xl font-bold text-foreground">{clockedInCount}</p>
              <p className="text-xs text-muted-foreground mt-1">of {staff.length} total</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Hours worked today</p>
              <p className="text-3xl font-bold text-primary">{totalHoursToday}</p>
              <p className="text-xs text-muted-foreground mt-1">active sessions</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Total staff</p>
              <p className="text-3xl font-bold text-foreground">{staff.length}</p>
              <p className="text-xs text-muted-foreground mt-1">team members</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Not clocked in</p>
              <p className="text-3xl font-bold text-foreground">
                {staff.length - clockedInCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">currently</p>
            </div>
          </div>

          {/* Staff grid */}
          {staff.length === 0 ? (
            <div className="text-center py-20">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No staff members found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {staff.map((member, i) => (
                <ClockInWidget
                  key={member.id}
                  staffId={member.id}
                  staffName={member.name}
                  isClockedIn={statusList[i].isClockedIn}
                  clockInTime={statusList[i].clockInTime}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isReports && (
        <TimeclockReports
          summary={summary}
          fromDate={fromDate.toISOString().split("T")[0]}
          toDate={toDate.toISOString().split("T")[0]}
        />
      )}
    </div>
  );
}

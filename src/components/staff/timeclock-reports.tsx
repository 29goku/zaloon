"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { getTimeSummary } from "@/app/actions/timetracking";

type SummaryItem = Awaited<ReturnType<typeof getTimeSummary>>[number];

interface TimeclockReportsProps {
  summary: SummaryItem[];
  fromDate: string;
  toDate: string;
}

export function TimeclockReports({
  summary,
  fromDate,
  toDate,
}: TimeclockReportsProps) {
  const router = useRouter();
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);

  function applyRange() {
    router.push(
      `/dashboard/staff/timeclock?tab=reports&from=${from}&to=${to}`
    );
  }

  function exportCsv() {
    const params = new URLSearchParams({ from, to });
    window.location.href = `/api/staff/timeclock-export?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="flex flex-wrap items-end gap-4 bg-card border border-border rounded-2xl p-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground font-medium">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground font-medium">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={applyRange}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={exportCsv}
          className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-accent transition-colors ml-auto"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Staff
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Days Worked
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Avg Hrs/Day
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No time data for this period.
                  </td>
                </tr>
              ) : (
                summary.map((row) => (
                  <tr
                    key={row.staffId}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      {row.staffName}
                    </td>
                    <td className="px-5 py-3.5 text-right text-foreground tabular-nums">
                      {row.daysWorked}
                    </td>
                    <td className="px-5 py-3.5 text-right text-foreground tabular-nums font-semibold">
                      {row.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">
                      {row.avgHoursPerDay.toFixed(1)}h
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

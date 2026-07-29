"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export interface PeakHoursData {
  /** Hour 0-23 */
  hour: number;
  /** Day of week 0=Sun … 6=Sat */
  dayOfWeek: number;
  count: number;
}

interface PeakHoursHeatmapProps {
  data: PeakHoursData[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Mon=1 … Sat=6, Sun=0 — re-map so Mon is first column
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function fmtHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  // Build lookup: key = `${hour}-${dow}`
  const lookup = new Map<string, number>();
  let maxCount = 1;
  for (const d of data) {
    const key = `${d.hour}-${d.dayOfWeek}`;
    lookup.set(key, d.count);
    if (d.count > maxCount) maxCount = d.count;
  }

  const isEmpty = data.length === 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#F48E16]" />
          Peak Hours Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No appointment data for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-separate border-spacing-0.5 w-full min-w-[520px]">
              <thead>
                <tr>
                  {/* Empty corner cell */}
                  <th className="w-10 text-muted-foreground font-normal text-right pr-2 pb-1" />
                  {DAY_LABELS.map((label) => (
                    <th
                      key={label}
                      className="text-center text-muted-foreground font-medium pb-1 min-w-[40px]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="text-right pr-2 py-0.5 text-muted-foreground tabular-nums whitespace-nowrap">
                      {fmtHour(hour)}
                    </td>
                    {DAY_ORDER.map((dow) => {
                      const count = lookup.get(`${hour}-${dow}`) ?? 0;
                      const intensity = count / maxCount;
                      // Color scale: 0 → subtle secondary, high → primary
                      const alpha = count === 0 ? 0 : 0.12 + intensity * 0.88;
                      const isHot = intensity > 0.6;

                      return (
                        <td
                          key={dow}
                          title={`${fmtHour(hour)} ${DAY_LABELS[DAY_ORDER.indexOf(dow)]} — ${count} appt${count !== 1 ? "s" : ""}`}
                          className="text-center rounded py-1 px-0"
                          style={{
                            backgroundColor:
                              count === 0
                                ? "hsl(var(--secondary) / 0.4)"
                                : `hsl(var(--primary) / ${alpha.toFixed(2)})`,
                            color: isHot
                              ? "white"
                              : count === 0
                              ? "hsl(var(--muted-foreground))"
                              : "hsl(var(--foreground))",
                          }}
                        >
                          {count > 0 ? count : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Number of appointments per time slot. Darker = more appointments.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

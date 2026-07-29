"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { ExportButton } from "./export-button";

export interface StaffPerformanceRow {
  staffId: string;
  name: string;
  totalAppointments: number;
  completedAppointments: number;
  revenue: number;
}

interface StaffPerformanceTableProps {
  data: StaffPerformanceRow[];
  currency: string;
}

export function StaffPerformanceTable({ data, currency }: StaffPerformanceTableProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F41666]" />
            Staff Performance
          </CardTitle>
          <ExportButton
            label="staff-performance"
            getData={() =>
              data.map((r) => ({
                "Staff Member": r.name,
                "Total Appointments": r.totalAppointments,
                Completed: r.completedAppointments,
                "Completion %":
                  r.totalAppointments > 0
                    ? ((r.completedAppointments / r.totalAppointments) * 100).toFixed(1)
                    : "0",
                Revenue: r.revenue,
              }))
            }
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No staff data for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">
                    Staff Member
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Total Appts
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Completed
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Completion
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const completionRate =
                    row.totalAppointments > 0
                      ? Math.round(
                          (row.completedAppointments / row.totalAppointments) * 100
                        )
                      : 0;

                  return (
                    <tr
                      key={row.staffId}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                        idx === data.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Avatar placeholder with initials */}
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {row.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-foreground">
                        {row.totalAppointments}
                      </td>
                      <td className="px-5 py-3.5 text-right text-foreground">
                        {row.completedAppointments}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              completionRate >= 80
                                ? "text-primary"
                                : completionRate >= 50
                                ? "text-[#F48E16]"
                                : "text-[#F41666]"
                            }`}
                          >
                            {completionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-foreground">
                        {fmt(row.revenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

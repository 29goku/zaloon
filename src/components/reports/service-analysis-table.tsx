"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { ExportButton } from "./export-button";

export interface ServiceAnalysisRow {
  serviceId: string;
  name: string;
  expectedDurationMins: number;
  totalBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
}

interface ServiceAnalysisTableProps {
  data: ServiceAnalysisRow[];
}

export function ServiceAnalysisTable({ data }: ServiceAnalysisTableProps) {
  const sorted = [...data].sort((a, b) => b.cancellationRate - a.cancellationRate);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#F41666]" />
            Service Cancellation Analysis
          </CardTitle>
          <ExportButton
            label="service-cancellations"
            getData={() =>
              sorted.map((r) => ({
                Service: r.name,
                "Expected Duration (min)": r.expectedDurationMins,
                "Total Bookings": r.totalBookings,
                Cancellations: r.cancelledBookings,
                "Cancellation Rate %": r.cancellationRate.toFixed(1),
              }))
            }
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No service data for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">
                    Service
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Duration
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Total
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Cancelled
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Cancel Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => {
                  const isLast = idx === sorted.length - 1;
                  const isHighCancellation = row.cancellationRate >= 30;
                  const isMedCancellation =
                    row.cancellationRate >= 15 && row.cancellationRate < 30;

                  return (
                    <tr
                      key={row.serviceId}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                        isLast ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">{row.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">
                        {row.expectedDurationMins} min
                      </td>
                      <td className="px-5 py-3.5 text-right text-foreground tabular-nums">
                        {row.totalBookings}
                      </td>
                      <td className="px-5 py-3.5 text-right text-foreground tabular-nums">
                        {row.cancelledBookings}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(row.cancellationRate, 100)}%`,
                                backgroundColor: isHighCancellation
                                  ? "#F41666"
                                  : isMedCancellation
                                  ? "#F48E16"
                                  : "hsl(var(--primary))",
                              }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              isHighCancellation
                                ? "text-[#F41666]"
                                : isMedCancellation
                                ? "text-[#F48E16]"
                                : "text-muted-foreground"
                            }`}
                          >
                            {row.cancellationRate.toFixed(1)}%
                          </span>
                        </div>
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
